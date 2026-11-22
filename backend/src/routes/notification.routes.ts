import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

/**
 * GET /api/notifications
 * List user notifications and count unread
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      prisma.notification.count({
        where: { user_id: user.id, read_at: null },
      }),
    ]);

    sendSuccess(res, { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/:notificationId/read
 * Mark single notification as read
 */
router.post('/:notificationId/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notificationId = req.params.notificationId as string;
    const user = req.user!;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.user_id !== user.id) {
      sendError(res, 'Notification not found', 404, 'NOT_FOUND');
      return;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read_at: new Date() },
    });

    sendSuccess(res, null, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all user notifications as read
 */
router.post('/read-all', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;

    await prisma.notification.updateMany({
      where: { user_id: user.id, read_at: null },
      data: { read_at: new Date() },
    });

    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
});

export default router;
