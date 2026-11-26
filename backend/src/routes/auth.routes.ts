import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimiter';
import { recordAuditLog } from '../services/auditService';

const router = Router();

function getRedirectPath(role: string): string {
  switch (role) {
    case 'PROFESSOR':
      return '/professor';
    case 'PLATFORM_ADMIN':
      return '/admin';
    default:
      return '/student';
  }
}

// Validation Schemas
const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(150),
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * POST /api/auth/register
 * Student self-registration (FR-01: Students can self-register; FR-02: Professors are provisioned by admin)
 */
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = registerSchema.parse(req.body);
    const normalizedEmail = validated.email.trim().toLowerCase();

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      sendError(res, 'An account with this email already exists', 409, 'EMAIL_EXISTS');
      return;
    }

    const hashedPassword = await hashPassword(validated.password);

    // Self-registration is strictly for STUDENT role only
    const user = await prisma.user.create({
      data: {
        full_name: validated.fullName.trim(),
        email: normalizedEmail,
        password_hash: hashedPassword,
        role: 'STUDENT',
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

    // Create session & tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    const refreshToken = signRefreshToken({ userId: user.id });
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.userSession.create({
      data: {
        user_id: user.id,
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt,
      },
    });

    // Audit log
    await recordAuditLog({
      actorId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: user.id,
      newValues: { email: user.email, role: user.role },
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(
      res,
      {
        user,
        accessToken,
        refreshToken,
        redirectTo: getRedirectPath(user.role),
      },
      'Registration successful',
      201
    );
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * User login for all roles
 */
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);
    const normalizedEmail = validated.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
      return;
    }

    const isMatch = await comparePassword(validated.password, user.password_hash);
    if (!isMatch) {
      sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
      return;
    }

    if (user.status === 'SUSPENDED') {
      sendError(
        res,
        'Your account has been suspended. Please contact administrator.',
        403,
        'ACCOUNT_SUSPENDED'
      );
      return;
    }

    if (user.status === 'INACTIVE') {
      sendError(
        res,
        'Your account is currently inactive. Please contact administrator.',
        403,
        'ACCOUNT_INACTIVE'
      );
      return;
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    const refreshToken = signRefreshToken({ userId: user.id });
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.userSession.create({
      data: {
        user_id: user.id,
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt,
      },
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(
      res,
      {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        accessToken,
        refreshToken,
        redirectTo: getRedirectPath(user.role),
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      sendError(res, 'Refresh token required', 401, 'REFRESH_TOKEN_REQUIRED');
      return;
    }

    verifyRefreshToken(refreshToken);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await prisma.userSession.findUnique({
      where: { refresh_token_hash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revoked_at || session.expires_at < new Date()) {
      sendError(res, 'Invalid or expired session', 401, 'INVALID_SESSION');
      return;
    }

    if (session.user.status !== 'ACTIVE') {
      sendError(res, 'Account is not active', 403, 'ACCOUNT_NOT_ACTIVE');
      return;
    }

    const newAccessToken = signAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
    });

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, { accessToken: newAccessToken }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Revoke current user session
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.userSession.updateMany({
        where: { refresh_token_hash: tokenHash, user_id: req.user!.id },
        data: { revoked_at: new Date() },
      });
    } else {
      // Revoke all active sessions for this user on explicit logout
      await prisma.userSession.updateMany({
        where: { user_id: req.user!.id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    res.clearCookie('accessToken');
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Current authenticated user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, { user: req.user });
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      sendError(res, 'User not found', 404, 'NOT_FOUND');
      return;
    }

    const isMatch = await comparePassword(validated.currentPassword, user.password_hash);
    if (!isMatch) {
      sendError(res, 'Current password is incorrect', 400, 'INVALID_PASSWORD');
      return;
    }

    const newHashed = await hashPassword(validated.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: newHashed },
    });

    // Revoke all previous sessions on password change
    await prisma.userSession.updateMany({
      where: { user_id: user.id, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: user.id,
    });

    sendSuccess(res, null, 'Password changed successfully. Please log in again.');
  } catch (error) {
    next(error);
  }
});

export default router;
