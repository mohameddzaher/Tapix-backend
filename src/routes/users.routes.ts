// ============================================
// Tapix API - User Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { updateProfileSchema, addressSchema } from '@tapix/shared';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Get user profile
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const [user, ordersCount, reviewsCount] = await Promise.all([
      User.findById(req.userId)
        .select('-refreshTokens -passwordResetToken -passwordResetExpires')
        .lean(),
      Order.countDocuments({ userId: req.userId }),
      Review.countDocuments({ userId: req.userId }),
    ]);

    if (!user) {
      throw new NotFoundError('User');
    }

    // Get wishlist count from user
    const wishlistCount = user.wishlist?.length || 0;

    res.json({
      success: true,
      data: {
        ...user,
        ordersCount,
        wishlistCount,
        reviewsCount,
      },
    });
  })
);

// Update user profile
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: data },
      { new: true, runValidators: true }
    ).select('-refreshTokens -passwordResetToken -passwordResetExpires');

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

// ========== ADDRESSES ==========

// Get user addresses
router.get(
  '/addresses',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId).select('addresses').lean();

    res.json({
      success: true,
      data: user?.addresses || [],
    });
  })
);

// Add new address
router.post(
  '/addresses',
  authenticate,
  validate(addressSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;
    const addressId = uuidv4();

    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // If this is the first address, make it default
    if (user.addresses.length === 0) {
      data.isDefault = true;
    }

    user.addresses.push({ ...data, id: addressId });
    await user.save();

    res.status(201).json({
      success: true,
      data: user.addresses,
    });
  })
);

// Update address
router.patch(
  '/addresses/:addressId',
  authenticate,
  validate(addressSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { addressId } = req.params;
    const data = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const addressIndex = user.addresses.findIndex((a) => a.id === addressId);
    if (addressIndex === -1) {
      throw new NotFoundError('Address');
    }

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    user.addresses[addressIndex] = { ...data, id: addressId };
    await user.save();

    res.json({
      success: true,
      data: user.addresses,
    });
  })
);

// Delete address
router.delete(
  '/addresses/:addressId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { addressId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const addressIndex = user.addresses.findIndex((a) => a.id === addressId);
    if (addressIndex === -1) {
      throw new NotFoundError('Address');
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // Set first remaining address as default if deleted was default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      data: user.addresses,
    });
  })
);

// Set default address
router.patch(
  '/addresses/:addressId/default',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { addressId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const address = user.addresses.find((a) => a.id === addressId);
    if (!address) {
      throw new NotFoundError('Address');
    }

    user.addresses.forEach((addr) => {
      addr.isDefault = addr.id === addressId;
    });

    await user.save();

    res.json({
      success: true,
      data: user.addresses,
    });
  })
);

// ========== WISHLIST ==========

// Get wishlist
router.get(
  '/wishlist',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId)
      .populate({
        path: 'wishlist',
        select: 'title slug price compareAtPrice discount images averageRating reviewCount stockQuantity',
        match: { isActive: true },
      })
      .lean();

    res.json({
      success: true,
      data: user?.wishlist || [],
    });
  })
);

// Add to wishlist
router.post(
  '/wishlist/:productId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new BadRequestError('Invalid product ID');
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    await User.findByIdAndUpdate(
      req.userId,
      { $addToSet: { wishlist: productId } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Added to wishlist',
    });
  })
);

// Remove from wishlist
router.delete(
  '/wishlist/:productId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;

    await User.findByIdAndUpdate(req.userId, {
      $pull: { wishlist: productId },
    });

    res.json({
      success: true,
      message: 'Removed from wishlist',
    });
  })
);

// Check if product is in wishlist
router.get(
  '/wishlist/check/:productId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;

    const user = await User.findById(req.userId).select('wishlist').lean();
    const isInWishlist = user?.wishlist.some(
      (id) => id.toString() === productId
    );

    res.json({
      success: true,
      data: { isInWishlist },
    });
  })
);

// ========== RECENTLY VIEWED ==========

// Get recently viewed products
router.get(
  '/recently-viewed',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.userId)
      .populate({
        path: 'recentlyViewed',
        select: 'title slug price compareAtPrice discount images averageRating reviewCount',
        match: { isActive: true },
      })
      .lean();

    res.json({
      success: true,
      data: user?.recentlyViewed || [],
    });
  })
);

// Clear recently viewed
router.delete(
  '/recently-viewed',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await User.findByIdAndUpdate(req.userId, { recentlyViewed: [] });

    res.json({
      success: true,
      message: 'Recently viewed cleared',
    });
  })
);

export default router;
