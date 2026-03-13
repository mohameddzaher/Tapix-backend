// ============================================
// Tapix API - Brand Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { createBrandSchema, updateBrandSchema } from '@tapix/shared';
import { Brand } from '../models/Brand';
import { Product } from '../models/Product';
import { authenticate, requireAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Get all brands (public)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { all } = req.query;

    // If all=true, return all brands (for admin)
    const query = all === 'true' ? {} : { isActive: true };

    const brands = await Brand.find(query)
      .sort({ name: 1 })
      .lean();

    // Aggregate product counts per brand name
    const brandCounts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const bc of brandCounts) {
      if (bc._id) countMap[bc._id] = bc.count;
    }

    const brandsWithCount = brands.map((b: any) => ({
      ...b,
      productCount: countMap[b.name] || 0,
    }));

    res.json({
      success: true,
      data: brandsWithCount,
    });
  })
);

// Get brand by slug (public)
router.get(
  '/slug/:slug',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { slug } = req.params;

    const brand = await Brand.findOne({ slug, isActive: true }).lean();

    if (!brand) {
      throw new NotFoundError('Brand');
    }

    // Get products count in this brand
    const productCount = await Product.countDocuments({
      brand: brand.name,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        ...brand,
        productCount,
      },
    });
  })
);

// Get brand by ID
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid brand ID');
    }

    const brand = await Brand.findById(id).lean();

    if (!brand) {
      throw new NotFoundError('Brand');
    }

    res.json({
      success: true,
      data: brand,
    });
  })
);

// Create brand (admin)
router.post(
  '/',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  validate(createBrandSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;

    // Check if brand name already exists
    const existingBrand = await Brand.findOne({ name: data.name });
    if (existingBrand) {
      throw new BadRequestError('Brand with this name already exists');
    }

    const brand = await Brand.create(data);

    res.status(201).json({
      success: true,
      data: brand,
    });
  })
);

// Update brand (admin)
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  validate(updateBrandSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid brand ID');
    }

    const brand = await Brand.findById(id);
    if (!brand) {
      throw new NotFoundError('Brand');
    }

    // If name is being changed, update products with old brand name
    if (data.name && data.name !== brand.name) {
      // Check if new name already exists
      const existingBrand = await Brand.findOne({ name: data.name, _id: { $ne: id } });
      if (existingBrand) {
        throw new BadRequestError('Brand with this name already exists');
      }

      // Update all products with old brand name to new brand name
      await Product.updateMany(
        { brand: brand.name },
        { brand: data.name }
      );
    }

    Object.assign(brand, data);
    await brand.save();

    res.json({
      success: true,
      data: brand,
    });
  })
);

// Delete brand (admin)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid brand ID');
    }

    const brand = await Brand.findById(id);
    if (!brand) {
      throw new NotFoundError('Brand');
    }

    // Check if brand has products
    const productCount = await Product.countDocuments({ brand: brand.name, isActive: true });
    if (productCount > 0) {
      throw new BadRequestError('Cannot delete brand with products. Please remove or reassign products first.');
    }

    // Soft delete - just mark as inactive
    brand.isActive = false;
    await brand.save();

    res.json({
      success: true,
      message: 'Brand deleted',
    });
  })
);

// Update product count for a brand (internal use)
router.post(
  '/:id/update-count',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid brand ID');
    }

    const brand = await Brand.findById(id);
    if (!brand) {
      throw new NotFoundError('Brand');
    }

    // Count products with this brand name
    const productCount = await Product.countDocuments({ brand: brand.name, isActive: true });
    brand.productCount = productCount;
    await brand.save();

    res.json({
      success: true,
      data: brand,
    });
  })
);

export default router;
