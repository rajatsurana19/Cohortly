import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate, authorizeRoles } from '../middlewares/auth';
import { recordAuditLog } from '../services/auditService';

const router = Router();

const uuidSchema = z.string().uuid('Invalid UUID format');

// Validation schemas
const createCourseSchema = z.object({
  name: z.string().min(2, 'Course name must be at least 2 characters').max(150),
  code: z.string().min(2, 'Course code must be at least 2 characters').max(50),
  description: z.string().max(1000).optional(),
});

const createClassSchema = z.object({
  courseId: z.string().uuid('Invalid Course UUID'),
  academicYearId: z.string().uuid('Invalid Academic Year UUID'),
  name: z.string().min(2, 'Classroom name must be at least 2 characters').max(150),
  section: z.string().max(50).optional(),
});

const joinClassSchema = z.object({
  joinCode: z.string().min(4, 'Join code must be at least 4 characters').max(32),
});

const assignProfessorSchema = z.object({
  professorId: z.string().uuid('Invalid Professor UUID'),
});

/**
 * GET /api/courses
 * List all courses
 */
router.get('/courses', authenticate, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { classes: true },
        },
      },
    });
    sendSuccess(res, { courses });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/courses
 * Create course (Admin only)
 */
router.post(
  '/courses',
  authenticate,
  authorizeRoles('PLATFORM_ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = createCourseSchema.parse(req.body);
      const normalizedCode = validated.code.trim().toUpperCase();

      const existing = await prisma.course.findUnique({
        where: { code: normalizedCode },
      });

      if (existing) {
        sendError(res, 'A course with this code already exists', 409, 'COURSE_CODE_EXISTS');
        return;
      }

      const course = await prisma.course.create({
        data: {
          name: validated.name.trim(),
          code: normalizedCode,
          description: validated.description?.trim(),
        },
      });

      await recordAuditLog({
        actorId: req.user!.id,
        action: 'COURSE_CREATED',
        entityType: 'COURSE',
        entityId: course.id,
        newValues: course,
      });

      sendSuccess(res, { course }, 'Course created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/academic-years
 * List academic years
 */
router.get('/academic-years', authenticate, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { start_date: 'desc' },
    });
    sendSuccess(res, { academicYears });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes
 * List classes based on user role
 */
router.get('/classes', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;

    if (user.role === 'PLATFORM_ADMIN') {
      const classes = await prisma.class.findMany({
        include: {
          course: true,
          academic_year: true,
          professors: {
            include: {
              professor: {
                select: { id: true, full_name: true, email: true },
              },
            },
          },
          _count: {
            select: { enrollments: true, groups: true, assignments: true },
          },
        },
        orderBy: { created_at: 'desc' },
      });
      sendSuccess(res, { classes });
      return;
    }

    if (user.role === 'PROFESSOR') {
      const classes = await prisma.class.findMany({
        where: {
          professors: {
            some: { professor_id: user.id },
          },
        },
        include: {
          course: true,
          academic_year: true,
          professors: {
            include: {
              professor: {
                select: { id: true, full_name: true, email: true },
              },
            },
          },
          _count: {
            select: { enrollments: true, groups: true, assignments: true },
          },
        },
        orderBy: { created_at: 'desc' },
      });
      sendSuccess(res, { classes });
      return;
    }

    // Student role
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        student_id: user.id,
        status: 'ACTIVE',
      },
      include: {
        class: {
          include: {
            course: true,
            academic_year: true,
            professors: {
              include: {
                professor: {
                  select: { id: true, full_name: true, email: true },
                },
              },
            },
            _count: {
              select: { enrollments: true, groups: true, assignments: true },
            },
          },
        },
      },
      orderBy: { enrolled_at: 'desc' },
    });

    const classes = enrollments.map((e) => e.class);
    sendSuccess(res, { classes });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes
 * Create a class (Professors and Admins)
 */
router.post(
  '/classes',
  authenticate,
  authorizeRoles('PROFESSOR', 'PLATFORM_ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = createClassSchema.parse(req.body);
      const joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();

      const newClass = await prisma.$transaction(async (tx) => {
        const created = await tx.class.create({
          data: {
            course_id: validated.courseId,
            academic_year_id: validated.academicYearId,
            name: validated.name.trim(),
            section: validated.section?.trim() || null,
            join_code: joinCode,
            status: 'ACTIVE',
          },
        });

        if (req.user!.role === 'PROFESSOR') {
          await tx.classProfessor.create({
            data: {
              class_id: created.id,
              professor_id: req.user!.id,
              assigned_by: req.user!.id,
            },
          });
        }

        return created;
      });

      await recordAuditLog({
        actorId: req.user!.id,
        action: 'CLASS_CREATED',
        entityType: 'CLASS',
        entityId: newClass.id,
        newValues: newClass,
      });

      sendSuccess(res, { class: newClass }, 'Classroom created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/classes/:classId
 * Get detailed classroom info
 */
router.get('/classes/:classId', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classId = uuidSchema.parse(req.params.classId);
    const user = req.user!;

    if (user.role === 'STUDENT') {
      const enrolled = await prisma.classEnrollment.findFirst({
        where: { class_id: classId, student_id: user.id, status: 'ACTIVE' },
      });
      if (!enrolled) {
        sendError(res, 'You are not enrolled in this classroom', 403, 'NOT_ENROLLED');
        return;
      }
    } else if (user.role === 'PROFESSOR') {
      const assigned = await prisma.classProfessor.findFirst({
        where: { class_id: classId, professor_id: user.id },
      });
      if (!assigned) {
        sendError(res, 'You are not assigned to manage this classroom', 403, 'NOT_ASSIGNED_PROFESSOR');
        return;
      }
    }

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: true,
        academic_year: true,
        professors: {
          include: {
            professor: {
              select: { id: true, full_name: true, email: true },
            },
          },
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              select: { id: true, full_name: true, email: true },
            },
          },
        },
        _count: {
          select: { groups: true, assignments: true },
        },
      },
    });

    if (!classRecord) {
      sendError(res, 'Classroom not found', 404, 'NOT_FOUND');
      return;
    }

    sendSuccess(res, { class: classRecord });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/join
 * Student joins class using unique join_code
 */
router.post('/classes/join', authenticate, authorizeRoles('STUDENT'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = joinClassSchema.parse(req.body);
    const code = validated.joinCode.trim().toUpperCase();

    const targetClass = await prisma.class.findUnique({
      where: { join_code: code },
    });

    if (!targetClass || targetClass.status !== 'ACTIVE') {
      sendError(res, 'Invalid class join code or classroom is inactive', 404, 'INVALID_JOIN_CODE');
      return;
    }

    const existingEnrollment = await prisma.classEnrollment.findFirst({
      where: {
        class_id: targetClass.id,
        student_id: req.user!.id,
      },
    });

    if (existingEnrollment && existingEnrollment.status === 'ACTIVE') {
      sendError(res, 'You are already enrolled in this class', 400, 'ALREADY_ENROLLED');
      return;
    }

    if (existingEnrollment && existingEnrollment.status === 'REMOVED') {
      await prisma.classEnrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status: 'ACTIVE',
          removed_at: null,
          enrolled_at: new Date(),
        },
      });
    } else {
      await prisma.classEnrollment.create({
        data: {
          class_id: targetClass.id,
          student_id: req.user!.id,
          status: 'ACTIVE',
        },
      });
    }

    await recordAuditLog({
      actorId: req.user!.id,
      action: 'STUDENT_JOINED_CLASS',
      entityType: 'CLASS',
      entityId: targetClass.id,
      newValues: { student_id: req.user!.id, class_id: targetClass.id },
    });

    sendSuccess(res, { class: targetClass }, 'Successfully joined classroom', 200);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:classId/professors
 * Assign professor to classroom (Admin only)
 */
router.post(
  '/classes/:classId/professors',
  authenticate,
  authorizeRoles('PLATFORM_ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const classId = uuidSchema.parse(req.params.classId);
      const validated = assignProfessorSchema.parse(req.body);
      const professorId = validated.professorId;

      const prof = await prisma.user.findFirst({
        where: { id: professorId, role: 'PROFESSOR' },
      });

      if (!prof) {
        sendError(res, 'User is not a valid professor account', 400, 'INVALID_PROFESSOR_ACCOUNT');
        return;
      }

      const assigned = await prisma.classProfessor.upsert({
        where: {
          uq_class_professor: {
            class_id: classId,
            professor_id: professorId,
          },
        },
        create: {
          class_id: classId,
          professor_id: professorId,
          assigned_by: req.user!.id,
        },
        update: {},
      });

      await recordAuditLog({
        actorId: req.user!.id,
        action: 'PROFESSOR_ASSIGNED_TO_CLASS',
        entityType: 'CLASS',
        entityId: classId,
        newValues: { professor_id: professorId },
      });

      sendSuccess(res, { assignment: assigned }, 'Professor assigned successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/classes/:classId/enrollments/:studentId
 * Remove student from classroom (Professor or Admin)
 */
router.delete(
  '/classes/:classId/enrollments/:studentId',
  authenticate,
  authorizeRoles('PROFESSOR', 'PLATFORM_ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const classId = uuidSchema.parse(req.params.classId);
      const studentId = uuidSchema.parse(req.params.studentId);

      const enrollment = await prisma.classEnrollment.findFirst({
        where: { class_id: classId, student_id: studentId, status: 'ACTIVE' },
      });

      if (!enrollment) {
        sendError(res, 'Student is not actively enrolled in this class', 404, 'ENROLLMENT_NOT_FOUND');
        return;
      }

      await prisma.classEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'REMOVED',
          removed_at: new Date(),
        },
      });

      await recordAuditLog({
        actorId: req.user!.id,
        action: 'STUDENT_REMOVED_FROM_CLASS',
        entityType: 'CLASS',
        entityId: classId,
        oldValues: { student_id: studentId },
      });

      sendSuccess(res, null, 'Student removed from classroom');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
