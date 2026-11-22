import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { hashPassword } from '../utils/password';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate, authorizeRoles } from '../middlewares/auth';
import { recordAuditLog } from '../services/auditService';

const router = Router();

const provisionProfessorSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8),
});

const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  reason: z.string().min(3).optional(),
});

router.use(authenticate, authorizeRoles('PLATFORM_ADMIN'));

/**
 * GET /api/admin/users
 * List all users with filtering and pagination
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const role = req.query.role as any;
    const status = req.query.status as any;
    const search = req.query.search as string;

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true,
          status: true,
          created_at: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    sendSuccess(
      res,
      { users },
      undefined,
      200,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/professors
 * Provision a new professor account
 */
router.post('/professors', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = provisionProfessorSchema.parse(req.body);
    const normalizedEmail = validated.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      sendError(res, 'User with this email already exists', 409, 'USER_EXISTS');
      return;
    }

    const passwordHash = await hashPassword(validated.password);

    const professor = await prisma.user.create({
      data: {
        full_name: validated.fullName.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        role: 'PROFESSOR',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    await recordAuditLog({
      actorId: req.user!.id,
      action: 'PROFESSOR_PROVISIONED',
      entityType: 'USER',
      entityId: professor.id,
      newValues: { email: professor.email, name: professor.full_name },
    });

    sendSuccess(res, { professor }, 'Professor account provisioned successfully', 201);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/users/:userId/status
 * Change user status
 */
router.patch('/users/:userId/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const validated = updateUserStatusSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendError(res, 'User not found', 404, 'NOT_FOUND');
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: validated.status },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (validated.status !== 'ACTIVE') {
      await prisma.userSession.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    await recordAuditLog({
      actorId: req.user!.id,
      action: `USER_STATUS_CHANGED_${validated.status}`,
      entityType: 'USER',
      entityId: userId,
      reason: validated.reason,
      oldValues: { status: user.status },
      newValues: { status: validated.status },
    });

    sendSuccess(res, { user: updated }, `User status updated to ${validated.status}`);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/audit-logs
 * View platform audit logs
 */
router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;
    const action = req.query.action as string;
    const entityType = req.query.entityType as string;

    const where: any = {};
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entityType) where.entity_type = entityType;

    const [total, auditLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, full_name: true, email: true, role: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    sendSuccess(
      res,
      { auditLogs },
      undefined,
      200,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats
 * Platform overview statistics
 */
router.get('/stats', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalUsers, activeStudents, activeProfessors, totalCourses, totalClasses, totalGroups] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
        prisma.user.count({ where: { role: 'PROFESSOR', status: 'ACTIVE' } }),
        prisma.course.count(),
        prisma.class.count({ where: { status: 'ACTIVE' } }),
        prisma.studentGroup.count({ where: { status: 'ACTIVE' } }),
      ]);

    sendSuccess(res, {
      stats: {
        totalUsers,
        activeStudents,
        activeProfessors,
        totalCourses,
        totalClasses,
        totalGroups,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
