import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate } from '../middlewares/auth';
import { recordAuditLog } from '../services/auditService';
import { createNotification } from '../services/notificationService';

const router = Router();

const createAssignmentSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  instructions: z.string().optional(),
  targetMode: z.enum(['ALL_GROUPS', 'SELECTED_GROUPS']).default('ALL_GROUPS'),
  selectedGroupIds: z.array(z.string().uuid()).optional().default([]),
  dueAt: z.string().datetime().optional().nullable(),
});

const updateAssignmentSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  targetMode: z.enum(['ALL_GROUPS', 'SELECTED_GROUPS']).optional(),
  selectedGroupIds: z.array(z.string().uuid()).optional(),
  dueAt: z.string().datetime().optional().nullable(),
});

/**
 * GET /api/classes/:classId/assignments
 * List assignments in classroom
 */
router.get('/classes/:classId/assignments', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classId = req.params.classId as string;
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
        _count: {
          select: { submissions: true },
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
    const classId = req.params.classId as string;
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
        target_mode: validated.targetMode,
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
    const assignmentId = req.params.assignmentId as string;

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
            submitter: {
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
 * PATCH /api/assignments/:assignmentId
 * Edit assignment
 */
router.patch('/assignments/:assignmentId', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignmentId = req.params.assignmentId as string;
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
    const assignmentId = req.params.assignmentId as string;
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
    const assignmentId = req.params.assignmentId as string;
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
