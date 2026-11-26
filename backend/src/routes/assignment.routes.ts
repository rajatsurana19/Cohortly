import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate } from '../middlewares/auth';
import { recordAuditLog } from '../services/auditService';
import { createNotification } from '../services/notificationService';

const router = Router();

const uuidSchema = z.string().uuid('Invalid UUID format');

const createAssignmentSchema = z.object({
  title: z.string().min(3, 'Assignment title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(5000).optional(),
  submissionType: z.enum(['INDIVIDUAL', 'GROUP']).default('GROUP'),
  maxScore: z.number().int().min(1).max(1000).optional().default(100),
  targetMode: z.enum(['ALL_GROUPS', 'SELECTED_GROUPS']).default('ALL_GROUPS'),
  selectedGroupIds: z.array(z.string().uuid('Invalid group UUID format')).optional().default([]),
  dueAt: z.string().datetime().optional().nullable(),
});

const updateAssignmentSchema = z.object({
  title: z.string().min(3, 'Assignment title must be at least 3 characters').max(200).optional(),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(5000).optional(),
  submissionType: z.enum(['INDIVIDUAL', 'GROUP']).optional(),
  maxScore: z.number().int().min(1).max(1000).optional(),
  targetMode: z.enum(['ALL_GROUPS', 'SELECTED_GROUPS']).optional(),
  selectedGroupIds: z.array(z.string().uuid('Invalid group UUID format')).optional(),
  dueAt: z.string().datetime().optional().nullable(),
});

/**
 * GET /api/classes/:classId/assignments
 * List assignments in classroom
 */
router.get('/classes/:classId/assignments', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classId = uuidSchema.parse(req.params.classId);
    const user = req.user!;

    const isProfOrAdmin = user.role === 'PROFESSOR' || user.role === 'PLATFORM_ADMIN';

    const statusFilter = isProfOrAdmin
      ? {}
      : { status: { in: ['PUBLISHED', 'CLOSED', 'ARCHIVED'] as any } };

    const assignments = await prisma.assignment.findMany({
      where: {
        class_id: classId,
        ...statusFilter,
      },
      include: {
        creator: {
          select: { id: true, full_name: true, email: true },
        },
        assignment_groups: {
          include: {
            group: {
              select: { id: true, name: true, status: true },
            },
          },
        },
        submissions: isProfOrAdmin
          ? {
              include: {
                group: { select: { id: true, name: true } },
                submitter: { select: { id: true, full_name: true, email: true } },
                acknowledger: { select: { id: true, full_name: true, email: true } },
                confirmations: true,
              },
            }
          : {
              where: {
                group: {
                  memberships: {
                    some: { student_id: user.id, left_at: null },
                  },
                },
              },
              include: {
                group: { select: { id: true, name: true } },
                submitter: { select: { id: true, full_name: true, email: true } },
                acknowledger: { select: { id: true, full_name: true, email: true } },
                confirmations: true,
              },
            },
        individual_submissions: isProfOrAdmin
          ? {
              include: {
                student: { select: { id: true, full_name: true, email: true } },
              },
            }
          : {
              where: { student_id: user.id },
              include: {
                student: { select: { id: true, full_name: true, email: true } },
              },
            },
        _count: {
          select: { submissions: true, individual_submissions: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    sendSuccess(res, { assignments });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:classId/assignments
 * Create an assignment in DRAFT status
 */
router.post('/classes/:classId/assignments', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classId = uuidSchema.parse(req.params.classId);
    const user = req.user!;

    if (user.role !== 'PROFESSOR' && user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Only professors can create assignments', 403, 'FORBIDDEN');
      return;
    }

    const validated = createAssignmentSchema.parse(req.body);

    const assignment = await prisma.assignment.create({
      data: {
        class_id: classId,
        created_by: user.id,
        title: validated.title.trim(),
        description: validated.description?.trim() || null,
        instructions: validated.instructions?.trim() || null,
        submission_type: validated.submissionType,
        max_score: validated.maxScore,
        target_mode: validated.submissionType === 'INDIVIDUAL' ? 'ALL_GROUPS' : validated.targetMode,
        status: 'DRAFT',
        due_at: validated.dueAt ? new Date(validated.dueAt) : null,
      },
    });

    if (validated.targetMode === 'SELECTED_GROUPS' && validated.selectedGroupIds.length > 0) {
      await prisma.assignmentGroup.createMany({
        data: validated.selectedGroupIds.map((gid) => ({
          assignment_id: assignment.id,
          group_id: gid,
        })),
        skipDuplicates: true,
      });
    }

    await recordAuditLog({
      actorId: user.id,
      action: 'ASSIGNMENT_CREATED_DRAFT',
      entityType: 'ASSIGNMENT',
      entityId: assignment.id,
      newValues: assignment,
    });

    sendSuccess(res, { assignment }, 'Draft assignment created successfully', 201);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assignments/:assignmentId
 * Get assignment details
 */
router.get('/assignments/:assignmentId', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignmentId = uuidSchema.parse(req.params.assignmentId);

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          include: { course: true },
        },
        creator: {
          select: { id: true, full_name: true, email: true },
        },
        assignment_groups: {
          include: {
            group: {
              include: {
                memberships: {
                  where: { left_at: null },
                  include: {
                    student: {
                      select: { id: true, full_name: true, email: true },
                    },
                  },
                },
              },
            },
          },
        },
        submissions: {
          include: {
            group: { select: { id: true, name: true } },
            submitter: {
              select: { id: true, full_name: true, email: true },
            },
            acknowledger: {
              select: { id: true, full_name: true, email: true },
            },
            confirmations: {
              include: {
                student: {
                  select: { id: true, full_name: true, email: true },
                },
                waiver: {
                  select: { id: true, full_name: true },
                },
              },
            },
          },
        },
        individual_submissions: {
          include: {
            student: {
              select: { id: true, full_name: true, email: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      sendError(res, 'Assignment not found', 404, 'NOT_FOUND');
      return;
    }

    sendSuccess(res, { assignment });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assignments/:assignmentId/submissions
 * Monitor & filter submissions for an assignment (Professor / Admin)
 */
router.get('/assignments/:assignmentId/submissions', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignmentId = uuidSchema.parse(req.params.assignmentId);
    const user = req.user!;
    const statusFilter = (req.query.status as string | undefined)?.toUpperCase();

    if (user.role !== 'PROFESSOR' && user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Only professors can view all submissions', 403, 'FORBIDDEN');
      return;
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: {
                student: { select: { id: true, full_name: true, email: true } },
              },
            },
            groups: {
              where: { status: 'ACTIVE' },
              include: {
                memberships: {
                  where: { left_at: null },
                  include: {
                    student: { select: { id: true, full_name: true, email: true } },
                  },
                },
              },
            },
          },
        },
        assignment_groups: true,
        submissions: {
          include: {
            group: { select: { id: true, name: true } },
            submitter: { select: { id: true, full_name: true, email: true } },
            acknowledger: { select: { id: true, full_name: true, email: true } },
            confirmations: {
              include: {
                student: { select: { id: true, full_name: true, email: true } },
              },
            },
          },
        },
        individual_submissions: {
          include: {
            student: { select: { id: true, full_name: true, email: true } },
          },
        },
      },
    });

    if (!assignment) {
      sendError(res, 'Assignment not found', 404, 'NOT_FOUND');
      return;
    }

    const isPastDue = assignment.due_at ? new Date() > new Date(assignment.due_at) : false;

    if (assignment.submission_type === 'INDIVIDUAL') {
      const subMap = new Map(assignment.individual_submissions.map((s) => [s.student_id, s]));
      let items = assignment.class.enrollments.map((enr) => {
        const sub = subMap.get(enr.student_id);
        const computedStatus = sub
          ? sub.is_acknowledged
            ? 'ACKNOWLEDGED'
            : 'SUBMITTED'
          : isPastDue
          ? 'OVERDUE'
          : 'PENDING';
        return {
          type: 'INDIVIDUAL' as const,
          student: enr.student,
          status: computedStatus,
          submission: sub || null,
        };
      });

      if (statusFilter && ['PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'OVERDUE'].includes(statusFilter)) {
        items = items.filter((item) => item.status === statusFilter);
      }

      sendSuccess(res, {
        assignmentId: assignment.id,
        submissionType: assignment.submission_type,
        items,
      });
      return;
    }

    // GROUP submission monitoring
    const targetGroupIds =
      assignment.target_mode === 'ALL_GROUPS'
        ? assignment.class.groups.map((g) => g.id)
        : assignment.assignment_groups.map((ag) => ag.group_id);

    const subMap = new Map(assignment.submissions.map((s) => [s.group_id, s]));
    let items = assignment.class.groups
      .filter((g) => targetGroupIds.includes(g.id))
      .map((g) => {
        const sub = subMap.get(g.id);
        const computedStatus = sub
          ? sub.is_acknowledged
            ? 'ACKNOWLEDGED'
            : 'SUBMITTED'
          : isPastDue
          ? 'OVERDUE'
          : 'PENDING';
        return {
          type: 'GROUP' as const,
          group: {
            id: g.id,
            name: g.name,
            memberships: g.memberships,
          },
          status: computedStatus,
          submission: sub || null,
        };
      });

    if (statusFilter && ['PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'OVERDUE'].includes(statusFilter)) {
      items = items.filter((item) => item.status === statusFilter);
    }

    sendSuccess(res, {
      assignmentId: assignment.id,
      submissionType: assignment.submission_type,
      items,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/assignments/:assignmentId
 * Edit assignment
 */
router.patch('/assignments/:assignmentId', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignmentId = uuidSchema.parse(req.params.assignmentId);
    const user = req.user!;
    const validated = updateAssignmentSchema.parse(req.body);

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      sendError(res, 'Assignment not found', 404, 'NOT_FOUND');
      return;
    }

    if (user.role !== 'PROFESSOR' && user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Unauthorized', 403, 'FORBIDDEN');
      return;
    }

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: validated.title?.trim(),
        description: validated.description?.trim(),
        instructions: validated.instructions?.trim(),
        submission_type: validated.submissionType,
        max_score: validated.maxScore,
        target_mode: validated.targetMode,
        due_at: validated.dueAt !== undefined ? (validated.dueAt ? new Date(validated.dueAt) : null) : undefined,
      },
    });

    if (validated.selectedGroupIds && validated.targetMode === 'SELECTED_GROUPS') {
      await prisma.assignmentGroup.deleteMany({
        where: { assignment_id: assignmentId },
      });
      await prisma.assignmentGroup.createMany({
        data: validated.selectedGroupIds.map((gid) => ({
          assignment_id: assignmentId,
          group_id: gid,
        })),
        skipDuplicates: true,
      });
    }

    sendSuccess(res, { assignment: updated }, 'Assignment updated');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/assignments/:assignmentId/publish
 * Publish assignment
 */
router.post('/assignments/:assignmentId/publish', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignmentId = uuidSchema.parse(req.params.assignmentId);
    const user = req.user!;

    if (user.role !== 'PROFESSOR' && user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Only professors can publish assignments', 403, 'FORBIDDEN');
      return;
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        assignment_groups: true,
      },
    });

    if (!assignment) {
      sendError(res, 'Assignment not found', 404, 'NOT_FOUND');
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (assignment.target_mode === 'ALL_GROUPS') {
        const activeGroups = await tx.studentGroup.findMany({
          where: { class_id: assignment.class_id, status: 'ACTIVE' },
          select: { id: true },
        });

        for (const g of activeGroups) {
          await tx.assignmentGroup.upsert({
            where: {
              uq_assignment_group: {
                assignment_id: assignment.id,
                group_id: g.id,
              },
            },
            create: {
              assignment_id: assignment.id,
              group_id: g.id,
            },
            update: {},
          });
        }
      }

      await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          status: 'PUBLISHED',
          published_at: new Date(),
        },
      });
    });

    const enrolledStudents = await prisma.classEnrollment.findMany({
      where: { class_id: assignment.class_id, status: 'ACTIVE' },
      select: { student_id: true },
    });

    for (const s of enrolledStudents) {
      await createNotification({
        userId: s.student_id,
        type: 'ASSIGNMENT_PUBLISHED',
        title: 'New Assignment Published',
        message: `Assignment "${assignment.title}" has been published.`,
        referenceType: 'ASSIGNMENT',
        referenceId: assignment.id,
      });
    }

    await recordAuditLog({
      actorId: user.id,
      action: 'ASSIGNMENT_PUBLISHED',
      entityType: 'ASSIGNMENT',
      entityId: assignment.id,
    });

    sendSuccess(res, null, 'Assignment published successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/assignments/:assignmentId/close
 * Close assignment
 */
router.post('/assignments/:assignmentId/close', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignmentId = uuidSchema.parse(req.params.assignmentId);
    const user = req.user!;

    if (user.role !== 'PROFESSOR' && user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Only professors can close assignments', 403, 'FORBIDDEN');
      return;
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: 'CLOSED' },
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'ASSIGNMENT_CLOSED',
      entityType: 'ASSIGNMENT',
      entityId: assignmentId,
    });

    sendSuccess(res, null, 'Assignment closed');
  } catch (error) {
    next(error);
  }
});

export default router;
