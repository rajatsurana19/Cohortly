import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate } from '../middlewares/auth';
import { recordAuditLog } from '../services/auditService';
import { createNotification } from '../services/notificationService';

const router = Router();

const uuidSchema = z.string().uuid('Invalid UUID format');

const createSubmissionSchema = z.object({
  submissionReference: z.string().max(500, 'Submission reference cannot exceed 500 characters').optional().nullable(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
});

const waiveConfirmationSchema = z.object({
  reason: z.string().min(5, 'A clear reason of at least 5 characters is required for confirmation waiver').max(500),
});

/**
 * POST /api/assignments/:assignmentId/groups/:groupId/submissions
 * Submit assignment on behalf of a group
 */
router.post(
  '/assignments/:assignmentId/groups/:groupId/submissions',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignmentId = uuidSchema.parse(req.params.assignmentId);
      const groupId = uuidSchema.parse(req.params.groupId);
      const user = req.user!;
      const validated = createSubmissionSchema.parse(req.body);

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { assignment_groups: true },
      });

      if (!assignment || assignment.status !== 'PUBLISHED') {
        sendError(res, 'Assignment is not open for submission', 400, 'ASSIGNMENT_NOT_OPEN');
        return;
      }

      // Check due date if set
      if (assignment.due_at && new Date() > new Date(assignment.due_at)) {
        // Late submission policy check - could still allow or flag as late
      }

      const group = await prisma.studentGroup.findUnique({
        where: { id: groupId },
      });

      if (!group || group.status !== 'ACTIVE') {
        sendError(res, 'The group does not exist or is no longer active', 400, 'GROUP_NOT_ACTIVE');
        return;
      }

      if (group.class_id !== assignment.class_id) {
        sendError(res, 'This group does not belong to the assignment classroom', 403, 'INVALID_CLASSROOM');
        return;
      }

      // Verify the group was targeted by this assignment
      // If ALL_GROUPS, any active group in the classroom is targeted.
      // If SELECTED_GROUPS, must be explicitly present in assignment_groups.
      let isTargeted = false;
      if (assignment.target_mode === 'ALL_GROUPS') {
        isTargeted = (group.class_id === assignment.class_id);
      } else {
        isTargeted = assignment.assignment_groups.some((ag: any) => ag.group_id === groupId);
      }

      if (!isTargeted) {
        sendError(res, 'This group is not targeted for this assignment', 403, 'GROUP_NOT_TARGETED');
        return;
      }

      // Verify submitting user is an active member of this group
      const activeMemberships = await prisma.groupMembership.findMany({
        where: { group_id: groupId, left_at: null },
      });

      const isMember = activeMemberships.some((m) => m.student_id === user.id);
      if (!isMember) {
        sendError(res, 'Only active members of this group can record submissions', 403, 'NOT_GROUP_MEMBER');
        return;
      }

      // Check if already submitted
      const existingSubmission = await prisma.groupSubmission.findUnique({
        where: {
          uq_assignment_group_submission: {
            assignment_id: assignmentId,
            group_id: groupId,
          },
        },
      });

      if (existingSubmission) {
        sendError(res, 'A submission has already been recorded for this group', 400, 'SUBMISSION_EXISTS');
        return;
      }

      const submission = await prisma.$transaction(async (tx) => {
        // Ensure assignment_groups has this mapping recorded if ALL_GROUPS was used
        if (assignment.target_mode === 'ALL_GROUPS') {
          await tx.assignmentGroup.upsert({
            where: {
              uq_assignment_group: {
                assignment_id: assignmentId,
                group_id: groupId,
              },
            },
            create: {
              assignment_id: assignmentId,
              group_id: groupId,
            },
            update: {},
          });
        }

        const sub = await tx.groupSubmission.create({
          data: {
            assignment_id: assignmentId,
            group_id: groupId,
            submitted_by: user.id,
            submission_reference: validated.submissionReference || null,
            notes: validated.notes?.trim() || null,
            submitted_at: new Date(),
          },
        });

        for (const member of activeMemberships) {
          const isSubmitter = member.student_id === user.id;

          await tx.memberConfirmation.create({
            data: {
              group_submission_id: sub.id,
              student_id: member.student_id,
              status: isSubmitter ? 'CONFIRMED' : 'PENDING',
              confirmed_at: isSubmitter ? new Date() : null,
            },
          });

          if (!isSubmitter) {
            await createNotification({
              userId: member.student_id,
              type: 'CONFIRMATION_PENDING',
              title: 'Submission Confirmation Required',
              message: `A group submission was recorded for "${assignment.title}". Please confirm your individual participation.`,
              referenceType: 'SUBMISSION',
              referenceId: sub.id,
            });
          }
        }

        return sub;
      });

      await recordAuditLog({
        actorId: user.id,
        action: 'GROUP_SUBMISSION_RECORDED',
        entityType: 'SUBMISSION',
        entityId: submission.id,
        newValues: {
          assignment_id: assignmentId,
          group_id: groupId,
          total_members: activeMemberships.length,
        },
      });

      sendSuccess(res, { submission }, 'Submission recorded. Individual confirmations pending.', 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/confirmations/my
 * List pending confirmations for current student
 */
router.get('/confirmations/my', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const confirmations = await prisma.memberConfirmation.findMany({
      where: {
        student_id: req.user!.id,
      },
      include: {
        submission: {
          include: {
            assignment: {
              include: {
                class: {
                  include: { course: true },
                },
              },
            },
            group: true,
            submitter: {
              select: { id: true, full_name: true, email: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    sendSuccess(res, { confirmations });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/confirmations/:confirmationId/confirm
 * Student individually confirms their participation
 */
router.post('/confirmations/:confirmationId/confirm', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const confirmationId = uuidSchema.parse(req.params.confirmationId);
    const user = req.user!;

    const confirmation = await prisma.memberConfirmation.findUnique({
      where: { id: confirmationId },
    });

    if (!confirmation) {
      sendError(res, 'Confirmation record not found', 404, 'NOT_FOUND');
      return;
    }

    if (confirmation.student_id !== user.id) {
      sendError(res, 'You can only confirm your own participation', 403, 'FORBIDDEN');
      return;
    }

    if (confirmation.status === 'CONFIRMED') {
      sendError(res, 'You have already confirmed participation', 400, 'ALREADY_CONFIRMED');
      return;
    }

    if (confirmation.status === 'WAIVED') {
      sendError(res, 'This confirmation was already waived by instructor', 400, 'ALREADY_WAIVED');
      return;
    }

    const updated = await prisma.memberConfirmation.update({
      where: { id: confirmationId },
      data: {
        status: 'CONFIRMED',
        confirmed_at: new Date(),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'MEMBER_CONFIRMED_SUBMISSION',
      entityType: 'MEMBER_CONFIRMATION',
      entityId: confirmationId,
      newValues: { status: 'CONFIRMED' },
    });

    sendSuccess(res, { confirmation: updated }, 'Participation successfully confirmed');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/confirmations/:confirmationId/waive
 * Professor or Admin waives confirmation with mandatory reason
 */
router.post('/confirmations/:confirmationId/waive', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const confirmationId = uuidSchema.parse(req.params.confirmationId);
    const user = req.user!;

    if (user.role !== 'PROFESSOR' && user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Only professors or administrators can waive participation confirmation', 403, 'FORBIDDEN');
      return;
    }

    const validated = waiveConfirmationSchema.parse(req.body);

    const confirmation = await prisma.memberConfirmation.findUnique({
      where: { id: confirmationId },
    });

    if (!confirmation) {
      sendError(res, 'Confirmation record not found', 404, 'NOT_FOUND');
      return;
    }

    const updated = await prisma.memberConfirmation.update({
      where: { id: confirmationId },
      data: {
        status: 'WAIVED',
        waived_by: user.id,
        waiver_reason: validated.reason.trim(),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'CONFIRMATION_WAIVED',
      entityType: 'MEMBER_CONFIRMATION',
      entityId: confirmationId,
      reason: validated.reason,
      oldValues: { status: confirmation.status },
      newValues: { status: 'WAIVED', waived_by: user.id },
    });

    sendSuccess(res, { confirmation: updated }, 'Confirmation waived successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
