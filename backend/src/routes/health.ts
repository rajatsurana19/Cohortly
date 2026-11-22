import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    sendSuccess(res, {
      status: 'healthy',
      app: 'Cohortly API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected (PostgreSQL / Supabase)',
    }, 'Cohortly API is operating normally');
  } catch (error: any) {
    sendError(res, 'Database connection failed', 503, 'SERVICE_UNAVAILABLE', {
      error: error.message,
    });
  }
});

export default router;
