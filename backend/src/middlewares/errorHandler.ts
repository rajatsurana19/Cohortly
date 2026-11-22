import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('[Error Handler]:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', details);
  }

  // Handle Prisma unique constraint errors
  if (err.code === 'P2002') {
    const fields = (err.meta?.target as string[]) || [];
    return sendError(
      res,
      `A record with this ${fields.join(', ')} already exists`,
      409,
      'CONFLICT',
      { fields }
    );
  }

  // Handle Prisma not found errors
  if (err.code === 'P2025') {
    return sendError(res, 'Requested resource not found', 404, 'NOT_FOUND');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Authentication token expired', 401, 'TOKEN_EXPIRED');
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational || process.env.NODE_ENV !== 'production'
    ? err.message || 'Internal Server Error'
    : 'Internal Server Error';

  return sendError(res, message, statusCode, err.code || 'INTERNAL_ERROR');
};
