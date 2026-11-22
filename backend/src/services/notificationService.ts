import { prisma } from '../config/db';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    return await prisma.notification.create({
      data: {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        reference_type: params.referenceType || null,
        reference_id: params.referenceId || null,
      },
    });
  } catch (error) {
    console.error('[Notification Error]: Failed to create notification', error);
    return null;
  }
};
