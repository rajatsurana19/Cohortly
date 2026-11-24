import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';

import healthRoutes from './routes/health';
import authRoutes from './routes/auth.routes';
import academicRoutes from './routes/academic.routes';
import groupRoutes from './routes/group.routes';
import assignmentRoutes from './routes/assignment.routes';
import submissionRoutes from './routes/submission.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();

// Security middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
      if (!origin) return callback(null, true);
      if (
        origin === env.FRONTEND_URL ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global rate limiter for API routes
app.use('/api', apiLimiter);

// Base Routes
app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Cohortly API is operating normally' });
});
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', academicRoutes);
app.use('/api', groupRoutes);
app.use('/api', assignmentRoutes);
app.use('/api', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested API route does not exist',
    },
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log(`===============================================`);
    console.log(`Cohortly API Server running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Health Check: http://localhost:${env.PORT}/api/health`);
    console.log(`===============================================`);
  });
};

// Start HTTP listener only when run directly (local / docker), not in Vercel serverless functions
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}

export default app;
