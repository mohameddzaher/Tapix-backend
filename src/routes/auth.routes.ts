// ============================================
// Tapix API - Auth Routes
// ============================================

import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@tapix/shared';
import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { AuditLog } from '../models/AuditLog';
import {
  generateTokens,
  storeRefreshToken,
  removeRefreshToken,
  refreshAccessToken,
  generatePasswordResetToken,
  getRefreshTokenCookieOptions,
  logAuthAction,
} from '../services/auth.service';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, BadRequestError, NotFoundError, UnauthorizedError } from '../middleware/errorHandler';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { success: false, error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register new user
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, firstName, lastName, phone, referralCode } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError('Email already registered');
    }

    // Find referrer if referral code provided
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({
        referralCode: referralCode.toUpperCase(),
        isActive: true,
        canRefer: true,
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: 'user',
      isEmailVerified: false,
      referredBy: referrer?._id,
    });

    // If referrer found, create referral record
    if (referrer) {
      await Referral.create({
        referrer: referrer._id,
        referee: user._id,
        referralCode: referralCode.toUpperCase(),
        status: 'pending',
      });

      // Update referrer's total referrals count
      await User.findByIdAndUpdate(referrer._id, { $inc: { totalReferrals: 1 } });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user, refreshToken);

    // Send welcome email (don't await)
    sendWelcomeEmail(email, firstName).catch(console.error);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          referralApplied: !!referrer,
        },
        accessToken,
      },
    });
  })
);

// Login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user, refreshToken);

    // Log action
    await logAuthAction(
      user._id.toString(),
      'login',
      req.ip,
      req.headers['user-agent']
    );

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions,
          avatar: user.avatar,
        },
        accessToken,
      },
    });
  })
);

// Refresh token
router.post(
  '/refresh',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token');
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result) {
      res.clearCookie('refreshToken');
      throw new UnauthorizedError('Invalid refresh token');
    }

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: {
          id: result.user._id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          permissions: result.user.permissions,
          avatar: result.user.avatar,
        },
      },
    });
  })
);

// Logout
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken && req.user) {
      await removeRefreshToken(req.user, refreshToken);
      await logAuthAction(
        req.user._id.toString(),
        'logout',
        req.ip,
        req.headers['user-agent']
      );
    }

    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

// Get current user
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        id: req.user!._id,
        email: req.user!.email,
        firstName: req.user!.firstName,
        lastName: req.user!.lastName,
        phone: req.user!.phone,
        avatar: req.user!.avatar,
        age: req.user!.age,
        role: req.user!.role,
        permissions: req.user!.permissions,
        addresses: req.user!.addresses,
        wishlist: req.user!.wishlist,
        isEmailVerified: req.user!.isEmailVerified,
        createdAt: req.user!.createdAt,
      },
    });
  })
);

// Forgot password
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({
        success: true,
        message: 'If the email exists, a reset link will be sent',
      });
      return;
    }

    // Generate reset token
    const { token, hash } = generatePasswordResetToken();

    user.passwordResetToken = hash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email
    await sendPasswordResetEmail(email, user.firstName, token);

    res.json({
      success: true,
      message: 'If the email exists, a reset link will be sent',
    });
  })
);

// Reset password
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token, password } = req.body;

    // Hash token to compare
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Revoke all sessions
    await user.save();

    // Log action
    await AuditLog.create({
      userId: user._id,
      action: 'update',
      resource: 'user',
      resourceId: user._id.toString(),
      newValue: { passwordReset: true },
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  })
);

// Change password (authenticated)
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user!._id).select('+password');

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log action
    await AuditLog.create({
      userId: user._id,
      action: 'update',
      resource: 'user',
      resourceId: user._id.toString(),
      newValue: { passwordChanged: true },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

// Google OAuth callback (placeholder for NextAuth integration)
router.post(
  '/google',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { credential } = req.body;

    if (!credential) {
      throw new BadRequestError('Google credential required');
    }

    // In a real implementation, verify the Google token
    // and extract user info. For now, return a placeholder.
    res.status(501).json({
      success: false,
      error: 'Google OAuth not fully implemented. Use NextAuth on frontend.',
    });
  })
);

export default router;
