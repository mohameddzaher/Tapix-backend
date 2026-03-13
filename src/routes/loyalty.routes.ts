// ============================================
// Tapix API - Loyalty Points Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Settings } from '../models/Settings';
import { PointsTransaction } from '../models/PointsTransaction';
import { authenticate, requireAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Get current user's points balance and recent transactions
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      throw new NotFoundError('User');
    }

    const settings = await (Settings as any).getSettings();

    // Get recent transactions
    const transactions = await PointsTransaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get breakdown by type
    const breakdown = await PointsTransaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
      { $group: { _id: '$type', total: { $sum: '$points' } } },
    ]);

    const breakdownMap: Record<string, number> = {};
    for (const b of breakdown) {
      breakdownMap[b._id] = b.total;
    }

    res.json({
      success: true,
      data: {
        balance: user.loyaltyPoints,
        totalEarned: user.totalPointsEarned,
        totalRedeemed: user.totalPointsRedeemed,
        isFrozen: user.pointsFrozen,
        programEnabled: settings.enableLoyaltyProgram,
        pointsRedemptionRate: settings.pointsRedemptionRate,
        minPointsToRedeem: settings.minPointsToRedeem,
        discountValue: settings.pointsRedemptionRate > 0
          ? Math.floor(user.loyaltyPoints / settings.pointsRedemptionRate)
          : 0,
        breakdown: {
          fromPurchases: breakdownMap['earned_purchase'] || 0,
          fromReferrals: breakdownMap['earned_referral'] || 0,
          redeemed: Math.abs(breakdownMap['redeemed'] || 0),
          adjusted: breakdownMap['adjusted'] || 0,
        },
        transactions,
      },
    });
  })
);

// Calculate discount for a given number of points
router.get(
  '/calculate',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const points = parseInt(req.query.points as string) || 0;

    const user = await User.findById(req.userId).lean();
    if (!user) {
      throw new NotFoundError('User');
    }

    const settings = await (Settings as any).getSettings();

    if (!settings.enableLoyaltyProgram) {
      throw new BadRequestError('Loyalty program is not enabled');
    }

    const availablePoints = Math.min(points, user.loyaltyPoints);
    const discountValue = settings.pointsRedemptionRate > 0
      ? Math.floor(availablePoints / settings.pointsRedemptionRate)
      : 0;

    res.json({
      success: true,
      data: {
        requestedPoints: points,
        availablePoints,
        discountValue,
        pointsRedemptionRate: settings.pointsRedemptionRate,
      },
    });
  })
);

// Redeem points (called during checkout)
router.post(
  '/redeem',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { points, orderId } = req.body;

    if (!points || points <= 0) {
      throw new BadRequestError('Invalid points amount');
    }

    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const settings = await (Settings as any).getSettings();

    if (!settings.enableLoyaltyProgram) {
      throw new BadRequestError('Loyalty program is not enabled');
    }

    if (user.pointsFrozen) {
      throw new BadRequestError('Your loyalty points are frozen. Contact support.');
    }

    if (user.loyaltyPoints < points) {
      throw new BadRequestError('Insufficient points');
    }

    if (points < settings.minPointsToRedeem) {
      throw new BadRequestError(`Minimum ${settings.minPointsToRedeem} points required to redeem`);
    }

    if (settings.maxPointsPerOrder > 0 && points > settings.maxPointsPerOrder) {
      throw new BadRequestError(`Maximum ${settings.maxPointsPerOrder} points per order`);
    }

    const discountValue = settings.pointsRedemptionRate > 0
      ? Math.floor(points / settings.pointsRedemptionRate)
      : 0;

    // Deduct points
    user.loyaltyPoints -= points;
    user.totalPointsRedeemed += points;
    await user.save();

    // Create transaction record
    await PointsTransaction.create({
      userId: user._id,
      type: 'redeemed',
      points: -points,
      orderId: orderId || undefined,
      description: `Redeemed ${points} points for SAR ${discountValue} discount`,
    });

    res.json({
      success: true,
      data: {
        pointsRedeemed: points,
        discountValue,
        remainingBalance: user.loyaltyPoints,
      },
    });
  })
);

// ========== ADMIN ROUTES ==========

// Get all users with points balances
router.get(
  '/admin/users',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, search } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = { role: 'user' };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('firstName lastName email loyaltyPoints totalPointsEarned totalPointsRedeemed pointsFrozen')
        .sort({ loyaltyPoints: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Admin: freeze/unfreeze or adjust points for a user
router.patch(
  '/admin/:userId',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { freeze, adjustPoints, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestError('Invalid user ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Freeze/unfreeze
    if (typeof freeze === 'boolean') {
      user.pointsFrozen = freeze;
    }

    // Adjust points
    if (typeof adjustPoints === 'number' && adjustPoints !== 0) {
      user.loyaltyPoints += adjustPoints;
      if (user.loyaltyPoints < 0) user.loyaltyPoints = 0;

      if (adjustPoints > 0) {
        user.totalPointsEarned += adjustPoints;
      }

      await PointsTransaction.create({
        userId: user._id,
        type: 'adjusted',
        points: adjustPoints,
        description: reason || `Admin adjustment: ${adjustPoints > 0 ? '+' : ''}${adjustPoints} points`,
      });
    }

    await user.save();

    res.json({
      success: true,
      data: {
        loyaltyPoints: user.loyaltyPoints,
        totalPointsEarned: user.totalPointsEarned,
        totalPointsRedeemed: user.totalPointsRedeemed,
        pointsFrozen: user.pointsFrozen,
      },
    });
  })
);

// Admin: get a user's points transaction history
router.get(
  '/admin/:userId/transactions',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestError('Invalid user ID');
    }

    const [transactions, total] = await Promise.all([
      PointsTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      PointsTransaction.countDocuments({ userId }),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

export default router;
