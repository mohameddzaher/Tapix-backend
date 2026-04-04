// ============================================
// Tapix API - Authentication Service
// ============================================

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { User, IUser } from '../models/User';
import { AuditLog } from '../models/AuditLog';

interface TokenPayload {
  userId: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Generate access token
export const generateAccessToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as jwt.SignOptions);
};

// Generate refresh token
export const generateRefreshToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
};

// Generate both tokens
export const generateTokens = (user: IUser): AuthTokens => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

// Verify refresh token
export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  } catch {
    return null;
  }
};

// Generate password reset token
export const generatePasswordResetToken = (): { token: string; hash: string } => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  return { token, hash };
};

// Generate email verification token
export const generateEmailVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Store refresh token
export const storeRefreshToken = async (user: IUser, refreshToken: string): Promise<void> => {
  // Keep only the last 5 refresh tokens
  const maxTokens = 5;

  if (user.refreshTokens.length >= maxTokens) {
    user.refreshTokens = user.refreshTokens.slice(-maxTokens + 1);
  }

  user.refreshTokens.push(refreshToken);
  await user.save();
};

// Remove refresh token
export const removeRefreshToken = async (user: IUser, refreshToken: string): Promise<void> => {
  user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
  await user.save();
};

// Revoke all refresh tokens
export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, { refreshTokens: [] });
};

// Log authentication action
export const logAuthAction = async (
  userId: string,
  action: 'login' | 'logout',
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await AuditLog.create({
    userId,
    action,
    resource: 'auth',
    ipAddress,
    userAgent,
  });
};

// Refresh access token
export const refreshAccessToken = async (
  refreshToken: string
): Promise<{ accessToken: string; user: IUser } | null> => {
  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    return null;
  }

  const user = await User.findById(decoded.userId);

  if (!user || !user.isActive) {
    return null;
  }

  // Check if refresh token exists in user's tokens
  if (!user.refreshTokens.includes(refreshToken)) {
    // Possible token reuse attack - revoke all tokens
    await revokeAllRefreshTokens(user._id.toString());
    return null;
  }

  const accessToken = generateAccessToken(user);

  return { accessToken, user };
};

// Validate password strength
export const validatePasswordStrength = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  return { valid: true };
};

// Get cookie options for refresh token
export const getRefreshTokenCookieOptions = () => {
  const isProduction = config.isProd || config.cookie.secure;

  const options: Record<string, any> = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };

  // Only set domain in production with a real domain (not localhost)
  if (config.cookie.domain && config.cookie.domain !== 'localhost') {
    options.domain = config.cookie.domain;
  }

  return options;
};
