// ============================================
// Tapix API - Referral Routes
// ============================================

import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { Settings } from '../models/Settings';
import { PointsTransaction } from '../models/PointsTransaction';
import { authenticate, requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Get current user's referral data
router.get(
  '/me',
  authenticate,
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Get referral statistics
    const referrals = await Referral.find({ referrer: user._id })
      .populate('referee', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(20);

    const totalReferrals = await Referral.countDocuments({ referrer: user._id });
    const successfulReferrals = await Referral.countDocuments({
      referrer: user._id,
      status: 'completed',
    });
    const pendingRewards = await Referral.aggregate([
      { $match: { referrer: user._id, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$referrerReward' } } },
    ]);

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        canRefer: user.canRefer,
        totalReferrals,
        successfulReferrals,
        totalEarnings: user.referralCredits || 0,
        pendingRewards: pendingRewards[0]?.total || 0,
        referrals: referrals.map((r: any) => ({
          _id: r._id,
          name: r.referee?.firstName
            ? `${r.referee.firstName} ${r.referee.lastName}`
            : 'Unknown',
          email: r.referee?.email,
          status: r.status,
          reward: r.referrerReward,
          createdAt: r.createdAt,
        })),
      },
    });
  })
);

// Validate a referral code (public endpoint)
router.get(
  '/code/:code',
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;

    const referrer = await User.findOne({
      referralCode: code.toUpperCase(),
      isActive: true,
      canRefer: true,
    }).select('firstName lastName referralCode');

    if (!referrer) {
      res.json({ success: true, data: { valid: false } });
      return;
    }

    res.json({
      success: true,
      data: {
        valid: true,
        referrer: {
          name: referrer.firstName,
          code: referrer.referralCode,
        },
      },
    });
  })
);

// Apply referral code (called during registration or checkout)
router.post(
  '/apply',
  authenticate,
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { code } = req.body;
    const userId = req.userId;

    // Find the referrer
    const referrer = await User.findOne({
      referralCode: code.toUpperCase(),
      isActive: true,
      canRefer: true,
    });

    if (!referrer) {
      throw new BadRequestError('Invalid referral code');
    }

    // Cannot refer yourself
    if (referrer._id.toString() === userId) {
      throw new BadRequestError('You cannot use your own referral code');
    }

    // Check if user was already referred
    const user = await User.findById(userId);
    if (user?.referredBy) {
      throw new BadRequestError('You have already used a referral code');
    }

    // Check if referral already exists
    const existingReferral = await Referral.findOne({ referee: userId });
    if (existingReferral) {
      throw new BadRequestError('Referral already applied');
    }

    // Create referral record
    await Referral.create({
      referrer: referrer._id,
      referee: userId,
      referralCode: code.toUpperCase(),
      status: 'pending',
    });

    // Update user's referredBy field
    await User.findByIdAndUpdate(userId, { referredBy: referrer._id });

    // Update referrer's total referrals count
    await User.findByIdAndUpdate(referrer._id, { $inc: { totalReferrals: 1 } });

    res.json({
      success: true,
      data: {
        message: 'Referral code applied! You will receive SAR 100 discount on your first order.',
        discount: 100,
      },
    });
  })
);

// Complete referral (called when referee makes first purchase)
router.post(
  '/complete',
  authenticate,
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderId, orderAmount } = req.body;
    const userId = req.userId;

    // Find pending referral for this user
    const referral = await Referral.findOne({
      referee: userId,
      status: 'pending',
    });

    if (!referral) {
      res.json({
        success: true,
        data: { completed: false, message: 'No pending referral found' },
      });
      return;
    }

    // Minimum order requirement (can be configured in settings)
    const minOrderAmount = 500;
    if (orderAmount < minOrderAmount) {
      res.json({
        success: true,
        data: {
          completed: false,
          message: `Order must be at least SAR ${minOrderAmount} to complete referral`,
        },
      });
      return;
    }

    // Update referral status
    referral.status = 'completed';
    referral.orderAmount = orderAmount;
    referral.orderId = orderId;
    referral.completedAt = new Date();
    await referral.save();

    // Credit the referrer
    await User.findByIdAndUpdate(referral.referrer, {
      $inc: {
        referralCredits: referral.referrerReward,
        successfulReferrals: 1,
      },
    });

    // Award referral bonus loyalty points
    try {
      const settings = await (Settings as any).getSettings();
      if (settings.enableLoyaltyProgram && settings.referralBonusPoints > 0) {
        const referrer = await User.findById(referral.referrer);
        if (referrer && !referrer.pointsFrozen) {
          referrer.loyaltyPoints += settings.referralBonusPoints;
          referrer.totalPointsEarned += settings.referralBonusPoints;
          await referrer.save();

          await PointsTransaction.create({
            userId: referrer._id,
            type: 'earned_referral',
            points: settings.referralBonusPoints,
            description: `Earned ${settings.referralBonusPoints} bonus points for successful referral`,
          });
        }
      }
    } catch (loyaltyErr) {
      console.error('Error awarding referral bonus points:', loyaltyErr);
    }

    res.json({
      success: true,
      data: { completed: true, message: 'Referral completed successfully' },
    });
  })
);

// Generate new referral code (if user doesn't have one)
router.post(
  '/generate',
  authenticate,
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.referralCode) {
      res.json({ success: true, data: { referralCode: user.referralCode } });
      return;
    }

    // Generate new code
    const prefix = user.firstName.slice(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const referralCode = `${prefix}${random}`;

    user.referralCode = referralCode;
    await user.save();

    res.json({ success: true, data: { referralCode } });
  })
);

export default router;
