// ============================================
// Tapix API - Category Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { createCategorySchema, updateCategorySchema } from '@tapix/shared';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { AuditLog } from '../models/AuditLog';
import { authenticate, requireAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Get all categories (public)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { flat } = req.query;

    // Get product counts per category
    const productCounts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    productCounts.forEach((pc) => {
      if (pc._id) countMap[pc._id.toString()] = pc.count;
    });

    if (flat === 'true') {
      // Return flat list
      const categories = await Category.find({ isActive: true })
        .sort({ order: 1, name: 1 })
        .lean();

      res.json({
        success: true,
        data: categories.map((cat) => ({
          ...cat,
          productCount: countMap[cat._id.toString()] || 0,
        })),
      });
      return;
    }

    // Return nested structure
    const categories = await Category.find({ isActive: true, parentId: null })
      .sort({ order: 1, name: 1 })
      .lean();

    // Get subcategories
    const subcategories = await Category.find({ isActive: true, parentId: { $ne: null } })
      .sort({ order: 1, name: 1 })
      .lean();

    // Build nested structure
    const nested = categories.map((cat) => ({
      ...cat,
      productCount: countMap[cat._id.toString()] || 0,
      subcategories: subcategories
        .filter((sub) => sub.parentId?.toString() === cat._id.toString())
        .map((sub) => ({ ...sub, productCount: countMap[sub._id.toString()] || 0 })),
    }));

    res.json({
      success: true,
      data: nested,
    });
  })
);

// Get category by slug (public)
router.get(
  '/slug/:slug',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { slug } = req.params;

    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
      throw new NotFoundError('Category');
    }

    // Get subcategories if this is a parent category
    let subcategories: any[] = [];
    if (!category.parentId) {
      subcategories = await Category.find({ parentId: category._id, isActive: true })
        .sort({ order: 1 })
        .lean();
    }

    // Get products count by brand in this category
    const brandCounts = await Product.aggregate([
      {
        $match: {
          categoryId: category._id,
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        ...category,
        subcategories,
        brands: brandCounts.map((b) => ({ name: b._id, count: b.count })),
      },
    });
  })
);

// Get category by ID
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid category ID');
    }

    const category = await Category.findById(id).lean();

    if (!category) {
      throw new NotFoundError('Category');
    }

    res.json({
      success: true,
      data: category,
    });
  })
);

// Create category (admin)
router.post(
  '/',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  validate(createCategorySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;

    // Verify parent category if provided
    if (data.parentId) {
      const parent = await Category.findById(data.parentId);
      if (!parent) {
        throw new BadRequestError('Parent category not found');
      }
    }

    const category = await Category.create(data);

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'create',
      resource: 'category',
      resourceId: category._id.toString(),
      newValue: { name: category.name, slug: category.slug, parentId: data.parentId || null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  })
);

// Update category (admin)
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  validate(updateCategorySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid category ID');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Category');
    }

    // Prevent setting self as parent
    if (data.parentId === id) {
      throw new BadRequestError('Category cannot be its own parent');
    }

    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const oldVal = (category as any)[key];
      const newVal = data[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        oldValues[key] = oldVal;
        newValues[key] = newVal;
      }
    }

    Object.assign(category, data);
    await category.save();

    // Log audit
    if (Object.keys(newValues).length > 0) {
      await AuditLog.create({
        userId: req.userId,
        action: 'update',
        resource: 'category',
        resourceId: category._id.toString(),
        oldValue: { ...oldValues, name: category.name },
        newValue: { ...newValues, name: category.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    res.json({
      success: true,
      data: category,
    });
  })
);

// Delete category (admin)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid category ID');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Category');
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ categoryId: id, isActive: true });
    if (productCount > 0) {
      throw new BadRequestError('Cannot delete category with products');
    }

    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({ parentId: id });
    if (subcategoryCount > 0) {
      throw new BadRequestError('Cannot delete category with subcategories');
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'delete',
      resource: 'category',
      resourceId: category._id.toString(),
      oldValue: { name: category.name, slug: category.slug },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Category deleted',
    });
  })
);

// Reorder categories (admin)
router.post(
  '/reorder',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { order } = req.body;

    if (!Array.isArray(order)) {
      throw new BadRequestError('Order must be an array');
    }

    const operations = order.map((item: { id: string; order: number }) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { order: item.order } },
      },
    }));

    await Category.bulkWrite(operations);

    res.json({
      success: true,
      message: 'Categories reordered',
    });
  })
);

export default router;
