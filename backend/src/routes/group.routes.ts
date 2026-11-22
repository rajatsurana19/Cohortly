import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate } from '../middlewares/auth';
import { recordAuditLog } from '../services/auditService';
import { createNotification } from '../services/notificationService';

const router = Router();

const createGroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  maxMembers: z.number().int().min(2).max(20).optional().default(5),
});

const inviteStudentSchema = z.object({
  studentEmail: z.string().email(),
});

const transferLeadershipSchema = z.object({
  newLeaderId: z.string().uuid(),
});

const professorInterventionSchema = z.object({
  action: z.enum(['CHANGE_LEADER', 'REMOVE_MEMBER', 'DISBAND_GROUP']),
  targetMemberId: z.string().uuid().optional(),
  reason: z.string().min(5, 'A clear reason is required for professor intervention'),
});

/**
 * GET /api/classes/:classId/groups
 * List all groups in a classroom
 */
router.get('/classes/:classId/groups', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classId = req.params.classId as string;
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
        sendError(res, 'You are not assigned to this classroom', 403, 'NOT_ASSIGNED_PROFESSOR');
        return;
      }
    }

    const groups = await prisma.studentGroup.findMany({
      where: { class_id: classId },
      include: {
        creator: {
          select: { id: true, full_name: true, email: true },
        },
        memberships: {
          where: { left_at: null },
          include: {
            student: {
              select: { id: true, full_name: true, email: true },
            },
          },
        },
        _count: {
          select: { memberships: true, invitations: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const userCreatedGroup = await prisma.studentGroup.findFirst({
      where: { class_id: classId, created_by: user.id },
      select: { id: true, name: true, status: true },
    });

    const activeMembership = await prisma.groupMembership.findFirst({
      where: { class_id: classId, student_id: user.id, left_at: null },
      include: { group: true },
    });

    sendSuccess(res, {
      groups,
      userHasCreatedGroup: !!userCreatedGroup,
      createdGroup: userCreatedGroup,
      currentActiveGroup: activeMembership ? activeMembership.group : null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:classId/groups
 * Create group in class
 */
router.post('/classes/:classId/groups', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classId = req.params.classId as string;
    const user = req.user!;

    if (user.role !== 'STUDENT') {
      sendError(res, 'Only students can create student groups', 403, 'FORBIDDEN');
      return;
    }

    const validated = createGroupSchema.parse(req.body);

    const enrollment = await prisma.classEnrollment.findFirst({
      where: { class_id: classId, student_id: user.id, status: 'ACTIVE' },
    });

    if (!enrollment) {
      sendError(res, 'You must be actively enrolled in this class to create a group', 403, 'NOT_ENROLLED');
      return;
    }

    const existingCreatedGroup = await prisma.studentGroup.findUnique({
      where: {
        uq_group_creator_per_class: {
          class_id: classId,
          created_by: user.id,
        },
      },
    });

    if (existingCreatedGroup) {
      sendError(
        res,
        'You have already created a group in this class. Group creation is limited to 1 per student per class permanently.',
        400,
        'GROUP_CREATION_LIMIT_REACHED'
      );
      return;
    }

    const existingActiveMembership = await prisma.groupMembership.findFirst({
      where: {
        class_id: classId,
        student_id: user.id,
        left_at: null,
      },
    });

    if (existingActiveMembership) {
      sendError(
        res,
        'You are already an active member of another group in this class. You must leave your current group before creating a new one.',
        400,
        'ACTIVE_MEMBERSHIP_EXISTS'
      );
      return;
    }

    const newGroup = await prisma.$transaction(async (tx) => {
      const group = await tx.studentGroup.create({
        data: {
          class_id: classId,
          name: validated.name.trim(),
          description: validated.description?.trim() || null,
          created_by: user.id,
          status: 'ACTIVE',
          max_members: validated.maxMembers,
        },
      });

      await tx.groupMembership.create({
        data: {
          group_id: group.id,
          class_id: classId,
          student_id: user.id,
          membership_role: 'LEADER',
          joined_at: new Date(),
        },
      });

      return group;
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'GROUP_CREATED',
      entityType: 'GROUP',
      entityId: newGroup.id,
      newValues: {
        class_id: classId,
        name: newGroup.name,
        creator_id: user.id,
      },
    });

    sendSuccess(res, { group: newGroup }, 'Group created successfully', 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      sendError(
        res,
        'You have already created a group in this class.',
        400,
        'GROUP_CREATION_LIMIT_REACHED'
      );
      return;
    }
    next(error);
  }
});

/**
 * GET /api/groups/:groupId
 * Get group details
 */
router.get('/groups/:groupId', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;

    const group = await prisma.studentGroup.findUnique({
      where: { id: groupId },
      include: {
        class: {
          include: {
            course: true,
            professors: {
              include: {
                professor: {
                  select: { id: true, full_name: true, email: true },
                },
              },
            },
          },
        },
        creator: {
          select: { id: true, full_name: true, email: true },
        },
        memberships: {
          include: {
            student: {
              select: { id: true, full_name: true, email: true },
            },
          },
          orderBy: { joined_at: 'asc' },
        },
        invitations: {
          include: {
            invited_student: {
              select: { id: true, full_name: true, email: true },
            },
            inviter: {
              select: { id: true, full_name: true, email: true },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!group) {
      sendError(res, 'Group not found', 404, 'NOT_FOUND');
      return;
    }

    sendSuccess(res, { group });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/groups/:groupId/invitations
 * Invite an enrolled student to group
 */
router.post('/groups/:groupId/invitations', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const user = req.user!;
    const validated = inviteStudentSchema.parse(req.body);
    const targetEmail = validated.studentEmail.trim().toLowerCase();

    const group = await prisma.studentGroup.findUnique({
      where: { id: groupId },
      include: {
        memberships: { where: { left_at: null } },
      },
    });

    if (!group || group.status !== 'ACTIVE') {
      sendError(res, 'Group is not active or does not exist', 400, 'GROUP_INACTIVE');
      return;
    }

    const senderMembership = group.memberships.find((m) => m.student_id === user.id);
    if (!senderMembership && user.role !== 'PROFESSOR' && user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Only active group members can send invitations', 403, 'FORBIDDEN');
      return;
    }

    if (group.max_members && group.memberships.length >= group.max_members) {
      sendError(res, `Group has reached its maximum capacity of ${group.max_members} members`, 400, 'GROUP_FULL');
      return;
    }

    const targetStudent = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!targetStudent || targetStudent.role !== 'STUDENT') {
      sendError(res, 'Student account not found with this email', 404, 'STUDENT_NOT_FOUND');
      return;
    }

    const isEnrolled = await prisma.classEnrollment.findFirst({
      where: { class_id: group.class_id, student_id: targetStudent.id, status: 'ACTIVE' },
    });

    if (!isEnrolled) {
      sendError(res, 'The student is not enrolled in this classroom', 400, 'STUDENT_NOT_ENROLLED');
      return;
    }

    const alreadyMember = group.memberships.some((m) => m.student_id === targetStudent.id);
    if (alreadyMember) {
      sendError(res, 'Student is already a member of this group', 400, 'ALREADY_MEMBER');
      return;
    }

    const otherMembership = await prisma.groupMembership.findFirst({
      where: { class_id: group.class_id, student_id: targetStudent.id, left_at: null },
    });

    if (otherMembership) {
      sendError(res, 'Student is already an active member of another group in this class', 400, 'STUDENT_IN_ANOTHER_GROUP');
      return;
    }

    const existingPending = await prisma.groupInvitation.findFirst({
      where: { group_id: groupId, invited_student_id: targetStudent.id, status: 'PENDING' },
    });

    if (existingPending) {
      sendError(res, 'A pending invitation already exists for this student', 400, 'INVITATION_ALREADY_PENDING');
      return;
    }

    const invitation = await prisma.groupInvitation.create({
      data: {
        group_id: groupId,
        invited_student_id: targetStudent.id,
        invited_by: user.id,
        status: 'PENDING',
      },
    });

    await createNotification({
      userId: targetStudent.id,
      type: 'GROUP_INVITATION',
      title: 'Group Invitation Received',
      message: `You were invited to join group "${group.name}".`,
      referenceType: 'INVITATION',
      referenceId: invitation.id,
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'INVITATION_SENT',
      entityType: 'INVITATION',
      entityId: invitation.id,
      newValues: {
        group_id: groupId,
        invited_student_id: targetStudent.id,
      },
    });

    sendSuccess(res, { invitation }, 'Invitation sent successfully', 201);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/invitations/my
 * List pending invitations for the logged-in student
 */
router.get('/invitations/my', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitations = await prisma.groupInvitation.findMany({
      where: {
        invited_student_id: req.user!.id,
        status: 'PENDING',
      },
      include: {
        group: {
          include: {
            class: {
              include: { course: true },
            },
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
        inviter: {
          select: { id: true, full_name: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    sendSuccess(res, { invitations });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/invitations/:invitationId/accept
 * Accept invitation atomically
 */
router.post('/invitations/:invitationId/accept', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitationId = req.params.invitationId as string;
    const user = req.user!;

    const invitation = await prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: {
        group: {
          include: {
            memberships: { where: { left_at: null } },
          },
        },
      },
    });

    if (!invitation) {
      sendError(res, 'Invitation not found', 404, 'NOT_FOUND');
      return;
    }

    if (invitation.invited_student_id !== user.id) {
      sendError(res, 'You can only accept invitations addressed to you', 403, 'FORBIDDEN');
      return;
    }

    if (invitation.status !== 'PENDING') {
      sendError(res, `Invitation cannot be accepted because it is ${invitation.status}`, 400, 'INVITATION_NOT_PENDING');
      return;
    }

    const group = invitation.group;
    if (group.status !== 'ACTIVE') {
      sendError(res, 'The group is no longer active', 400, 'GROUP_INACTIVE');
      return;
    }

    if (group.max_members && group.memberships.length >= group.max_members) {
      sendError(res, 'Group has already reached maximum capacity', 400, 'GROUP_FULL');
      return;
    }

    const existingActive = await prisma.groupMembership.findFirst({
      where: { class_id: group.class_id, student_id: user.id, left_at: null },
    });

    if (existingActive) {
      sendError(
        res,
        'You already belong to an active group in this class. You cannot accept another group invitation.',
        400,
        'ACTIVE_MEMBERSHIP_EXISTS'
      );
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.groupMembership.create({
        data: {
          group_id: group.id,
          class_id: group.class_id,
          student_id: user.id,
          membership_role: 'MEMBER',
          joined_at: new Date(),
        },
      });

      await tx.groupInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          responded_at: new Date(),
        },
      });

      await tx.groupInvitation.updateMany({
        where: {
          invited_student_id: user.id,
          status: 'PENDING',
          group: { class_id: group.class_id },
        },
        data: {
          status: 'CANCELLED',
          responded_at: new Date(),
        },
      });
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'INVITATION_ACCEPTED',
      entityType: 'INVITATION',
      entityId: invitation.id,
      newValues: { group_id: group.id, student_id: user.id },
    });

    sendSuccess(res, null, 'Successfully joined group');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/invitations/:invitationId/reject
 * Reject invitation
 */
router.post('/invitations/:invitationId/reject', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitationId = req.params.invitationId as string;
    const user = req.user!;

    const invitation = await prisma.groupInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.invited_student_id !== user.id) {
      sendError(res, 'Invitation not found', 404, 'NOT_FOUND');
      return;
    }

    if (invitation.status !== 'PENDING') {
      sendError(res, 'Invitation is not pending', 400, 'INVITATION_NOT_PENDING');
      return;
    }

    await prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'REJECTED',
        responded_at: new Date(),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'INVITATION_REJECTED',
      entityType: 'INVITATION',
      entityId: invitation.id,
    });

    sendSuccess(res, null, 'Invitation rejected');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/groups/:groupId/leadership-transfer
 * Transfer leadership
 */
router.post('/groups/:groupId/leadership-transfer', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const user = req.user!;
    const validated = transferLeadershipSchema.parse(req.body);

    const group = await prisma.studentGroup.findUnique({
      where: { id: groupId },
      include: {
        memberships: { where: { left_at: null } },
      },
    });

    if (!group || group.status !== 'ACTIVE') {
      sendError(res, 'Group not active', 400, 'GROUP_INACTIVE');
      return;
    }

    const currentLeaderMembership = group.memberships.find(
      (m) => m.student_id === user.id && m.membership_role === 'LEADER'
    );

    if (!currentLeaderMembership && user.role !== 'PROFESSOR' && user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Only the current group leader can transfer leadership', 403, 'FORBIDDEN');
      return;
    }

    const newLeaderMembership = group.memberships.find((m) => m.student_id === validated.newLeaderId);
    if (!newLeaderMembership) {
      sendError(res, 'The target user is not an active member of this group', 400, 'TARGET_NOT_MEMBER');
      return;
    }

    if (newLeaderMembership.membership_role === 'LEADER') {
      sendError(res, 'The user is already the group leader', 400, 'ALREADY_LEADER');
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (currentLeaderMembership) {
        await tx.groupMembership.update({
          where: { id: currentLeaderMembership.id },
          data: { membership_role: 'MEMBER' },
        });
      }

      await tx.groupMembership.update({
        where: { id: newLeaderMembership.id },
        data: { membership_role: 'LEADER' },
      });
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'LEADERSHIP_TRANSFERRED',
      entityType: 'GROUP',
      entityId: groupId,
      newValues: {
        previous_leader_id: currentLeaderMembership?.student_id,
        new_leader_id: validated.newLeaderId,
      },
    });

    sendSuccess(res, null, 'Leadership transferred successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/groups/:groupId/leave
 * Member leaves group
 */
router.post('/groups/:groupId/leave', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const user = req.user!;
    const { reason } = req.body;

    const group = await prisma.studentGroup.findUnique({
      where: { id: groupId },
      include: {
        memberships: { where: { left_at: null } },
      },
    });

    if (!group) {
      sendError(res, 'Group not found', 404, 'NOT_FOUND');
      return;
    }

    const membership = group.memberships.find((m) => m.student_id === user.id);
    if (!membership) {
      sendError(res, 'You are not an active member of this group', 400, 'NOT_ACTIVE_MEMBER');
      return;
    }

    if (membership.membership_role === 'LEADER' && group.memberships.length > 1) {
      sendError(
        res,
        'As the leader, you must transfer leadership to another member before leaving the group.',
        400,
        'MUST_TRANSFER_LEADERSHIP'
      );
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.groupMembership.update({
        where: { id: membership.id },
        data: {
          left_at: new Date(),
          left_reason: reason?.trim() || 'Voluntarily left group',
        },
      });

      if (group.memberships.length === 1) {
        await tx.studentGroup.update({
          where: { id: group.id },
          data: { status: 'DISBANDED' },
        });
      }
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'MEMBER_LEFT_GROUP',
      entityType: 'GROUP',
      entityId: groupId,
      newValues: { student_id: user.id, reason },
    });

    sendSuccess(res, null, 'You have left the group');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/groups/:groupId/intervene
 * Professor or Admin intervention
 */
router.post('/groups/:groupId/intervene', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const user = req.user!;

    if (user.role !== 'PROFESSOR' && user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Only professors and administrators can perform group interventions', 403, 'FORBIDDEN');
      return;
    }

    const validated = professorInterventionSchema.parse(req.body);

    const group = await prisma.studentGroup.findUnique({
      where: { id: groupId },
      include: {
        memberships: { where: { left_at: null } },
      },
    });

    if (!group) {
      sendError(res, 'Group not found', 404, 'NOT_FOUND');
      return;
    }

    if (user.role === 'PROFESSOR') {
      const assigned = await prisma.classProfessor.findFirst({
        where: { class_id: group.class_id, professor_id: user.id },
      });
      if (!assigned) {
        sendError(res, 'You are not assigned to manage this classroom', 403, 'NOT_ASSIGNED_PROFESSOR');
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      if (validated.action === 'CHANGE_LEADER') {
        if (!validated.targetMemberId) {
          throw new Error('Target member ID is required to appoint a new leader');
        }

        const targetMembership = group.memberships.find((m) => m.student_id === validated.targetMemberId);
        if (!targetMembership) {
          throw new Error('Target user is not an active member of this group');
        }

        await tx.groupMembership.updateMany({
          where: { group_id: groupId, left_at: null, membership_role: 'LEADER' },
          data: { membership_role: 'MEMBER' },
        });

        await tx.groupMembership.update({
          where: { id: targetMembership.id },
          data: { membership_role: 'LEADER' },
        });
      } else if (validated.action === 'REMOVE_MEMBER') {
        if (!validated.targetMemberId) {
          throw new Error('Target member ID is required to remove member');
        }

        const targetMembership = group.memberships.find((m) => m.student_id === validated.targetMemberId);
        if (!targetMembership) {
          throw new Error('Target user is not an active member of this group');
        }

        await tx.groupMembership.update({
          where: { id: targetMembership.id },
          data: {
            left_at: new Date(),
            left_reason: `Removed by Professor (${user.full_name}): ${validated.reason}`,
          },
        });
      } else if (validated.action === 'DISBAND_GROUP') {
        await tx.studentGroup.update({
          where: { id: groupId },
          data: { status: 'DISBANDED' },
        });

        await tx.groupMembership.updateMany({
          where: { group_id: groupId, left_at: null },
          data: {
            left_at: new Date(),
            left_reason: `Group disbanded by Professor (${user.full_name}): ${validated.reason}`,
          },
        });
      }
    });

    await recordAuditLog({
      actorId: user.id,
      action: `PROFESSOR_INTERVENTION_${validated.action}`,
      entityType: 'GROUP',
      entityId: groupId,
      reason: validated.reason,
      newValues: {
        action: validated.action,
        target_member_id: validated.targetMemberId,
      },
    });

    sendSuccess(res, null, `Intervention completed: ${validated.action}`);
  } catch (error: any) {
    if (error.message) {
      sendError(res, error.message, 400, 'INTERVENTION_ERROR');
      return;
    }
    next(error);
  }
});

export default router;
