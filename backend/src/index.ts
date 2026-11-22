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

const app = express();

// Security middlewares
app.use(helmet());
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

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
    console.log(`🚀 Cohortly API Server running on port ${env.PORT}`);
    console.log(`📍 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
    console.log(`===============================================`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
