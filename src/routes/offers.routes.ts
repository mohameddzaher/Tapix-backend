// ============================================
// Tapix API - Offer Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { createOfferSchema, updateOfferSchema } from '@tapix/shared';
import { Offer } from '../models/Offer';
import { Product } from '../models/Product';
import { authenticate, requireAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Clean optional number fields (null/NaN/0 → remove) before validation
const cleanOfferBody = (req: AuthRequest, _res: Response, next: () => void) => {
  const numFields = ['minOrderAmount', 'maxDiscount', 'usageLimit'];
  for (const field of numFields) {
    const val = req.body[field];
    if (val === null || val === 0 || (typeof val === 'number' && isNaN(val))) {
      delete req.body[field];
    }
  }
  next();
};

// Get flash deal for homepage (public)
// Returns the first active offer that has productIds (specific products selected)
router.get(
  '/flash-deal',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const now = new Date();

    const offer = await Offer.findOne({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gt: now },
      productIds: { $exists: true, $ne: [] },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!offer) {
      res.json({ success: true, data: { offer: null, products: [] } });
      return;
    }

    // Fetch the associated products
    const products = await Product.find({
      _id: { $in: offer.productIds },
      isActive: true,
    })
      .select('-description -specs -faqs -relatedProductIds')
      .lean();

    // Normalize stock field
    const normalizedProducts = products.map((p: any) => ({
      ...p,
      stock: p.stockQuantity ?? 0,
    }));

    res.json({
      success: true,
      data: {
        offer: {
          _id: offer._id,
          title: offer.title,
          description: offer.description,
          type: offer.type,
          value: offer.value,
          startsAt: offer.startsAt,
          endsAt: offer.endsAt,
        },
        products: normalizedProducts,
      },
    });
  })
);

// Get active offers (public)
router.get(
  '/active',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const now = new Date();

    const offers = await Offer.find({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gt: now },
      $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: offers,
    });
  })
);

// Validate discount code (public)
router.post(
  '/validate-code',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { code, subtotal } = req.body;

    if (!code) {
      throw new BadRequestError('Code required');
    }

    const offer = await Offer.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startsAt: { $lte: new Date() },
      endsAt: { $gt: new Date() },
    }).lean();

    if (!offer) {
      res.json({
        success: false,
        error: 'Invalid or expired code',
      });
      return;
    }

    if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
      res.json({
        success: false,
        error: 'Code usage limit reached',
      });
      return;
    }

    if (offer.minOrderAmount && subtotal < offer.minOrderAmount) {
      res.json({
        success: false,
        error: `Minimum order amount is $${offer.minOrderAmount}`,
      });
      return;
    }

    // Calculate discount
    let discount = 0;
    if (offer.type === 'percentage') {
      discount = (subtotal * offer.value) / 100;
      if (offer.maxDiscount) {
        discount = Math.min(discount, offer.maxDiscount);
      }
    } else if (offer.type === 'fixed') {
      discount = Math.min(offer.value, subtotal);
    }

    res.json({
      success: true,
      data: {
        title: offer.title,
        type: offer.type,
        value: offer.value,
        discount,
      },
    });
  })
);

// ========== ADMIN ROUTES ==========

// Get all offers (admin)
router.get(
  '/',
  authenticate,
  requireAdmin,
  requirePermission('offers', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { active } = req.query;

    const query: any = {};
    if (active === 'true') {
      const now = new Date();
      query.isActive = true;
      query.startsAt = { $lte: now };
      query.endsAt = { $gt: now };
    }

    const offers = await Offer.find(query).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: offers,
    });
  })
);

// Get offer by ID
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('offers', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid offer ID');
    }

    const offer = await Offer.findById(id).lean();

    if (!offer) {
      throw new NotFoundError('Offer');
    }

    res.json({
      success: true,
      data: offer,
    });
  })
);

// Create offer
router.post(
  '/',
  authenticate,
  requireAdmin,
  requirePermission('offers', 'write'),
  cleanOfferBody,
  validate(createOfferSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;

    // Check if code already exists
    if (data.code) {
      const existing = await Offer.findOne({ code: data.code.toUpperCase() }).lean();
      if (existing) {
        throw new BadRequestError('Code already exists');
      }
      data.code = data.code.toUpperCase();
    }

    const offer = await Offer.create(data);

    res.status(201).json({
      success: true,
      data: offer,
    });
  })
);

// Update offer
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('offers', 'write'),
  cleanOfferBody,
  validate(updateOfferSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid offer ID');
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      throw new NotFoundError('Offer');
    }

    // Check if new code already exists
    if (data.code && data.code !== offer.code) {
      const existing = await Offer.findOne({ code: data.code.toUpperCase(), _id: { $ne: id } }).lean();
      if (existing) {
        throw new BadRequestError('Code already exists');
      }
      data.code = data.code.toUpperCase();
    }

    Object.assign(offer, data);
    await offer.save();

    res.json({
      success: true,
      data: offer,
    });
  })
);

// Delete offer
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('offers', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid offer ID');
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      throw new NotFoundError('Offer');
    }

    await offer.deleteOne();

    res.json({
      success: true,
      message: 'Offer deleted',
    });
  })
);

export default router;
