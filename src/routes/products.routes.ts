// ============================================
// Tapix API - Product Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import {
  createProductSchema,
  updateProductSchema,
  productFiltersSchema,
  paginationSchema,
} from '@tapix/shared';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Review } from '../models/Review';
import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { StockMovement } from '../models/StockMovement';
import { authenticate, optionalAuth, requireAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Get all products (public)
router.get(
  '/',
  validate(paginationSchema, 'query'),
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20 } = req.query as any;
    const filters = productFiltersSchema.parse(req.query);

    // Build query
    const query: any = { isActive: true };

    // Search
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Category by slug (resolves slug to ID, includes subcategories)
    if (filters.categorySlug) {
      const cat = await Category.findOne({ slug: filters.categorySlug, isActive: true }).lean();
      if (cat) {
        const subcats = await Category.find({ parentId: cat._id, isActive: true }).select('_id').lean();
        const catIds = [cat._id, ...subcats.map((s: any) => s._id)];
        query.categoryId = { $in: catIds };
      } else {
        // No matching category — return empty results
        query.categoryId = null;
      }
    }

    // Categories by ID
    if (!filters.categorySlug && filters.categoryIds?.length) {
      query.categoryId = { $in: filters.categoryIds.map((id: string) => new mongoose.Types.ObjectId(id)) };
    }

    // Brands
    if (filters.brands?.length) {
      query.brand = { $in: filters.brands };
    }

    // Price range
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
    }

    // Rating
    if (filters.minRating !== undefined) {
      query.averageRating = { $gte: filters.minRating };
    }

    // In stock
    if (filters.inStock) {
      query.stockQuantity = { $gt: 0 };
    }

    // On Sale
    if (filters.onSale) {
      query.discount = { $gt: 0 };
      query.$or = [
        { discountEndsAt: null },
        { discountEndsAt: { $exists: false } },
        { discountEndsAt: { $gt: new Date() } },
      ];
    }

    // New Arrivals (last 30 days)
    if (filters.newArrivals) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.createdAt = { ...(query.createdAt || {}), $gte: thirtyDaysAgo };
    }

    // Featured
    if (filters.isFeatured) {
      query.isFeatured = true;
    }

    // Tags
    if (filters.tags?.length) {
      query.tags = { $in: filters.tags };
    }

    // Exclude categories by slug (with their subcategories)
    if (filters.excludeCategorySlugs?.length) {
      const excludeCats = await Category.find({ slug: { $in: filters.excludeCategorySlugs }, isActive: true }).select('_id').lean();
      if (excludeCats.length > 0) {
        const excludeIds = excludeCats.map((c: any) => c._id);
        const excludeSubcats = await Category.find({ parentId: { $in: excludeIds }, isActive: true }).select('_id').lean();
        const allExcludeIds = [...excludeIds, ...excludeSubcats.map((s: any) => s._id)];
        query.categoryId = { ...(query.categoryId || {}), $nin: allExcludeIds };
      }
    }

    // Sort
    let sort: any = { createdAt: -1 };
    switch (filters.sort) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'rating':
        sort = { averageRating: -1, reviewCount: -1 };
        break;
      case 'popularity':
        sort = { soldCount: -1 };
        break;
      case 'discount':
        sort = { discount: -1, createdAt: -1 };
        break;
    }

    const skip = (page - 1) * limit;

    const [rawProducts, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-description -specs -faqs -relatedProductIds')
        .lean(),
      Product.countDocuments(query),
    ]);

    // Normalize: include `stock` alias for `stockQuantity` for frontend compatibility
    const products = rawProducts.map((p: any) => ({
      ...p,
      stock: p.stockQuantity ?? 0,
    }));

    // Track view for logged in user
    if (req.userId) {
      // Could update recently viewed here
    }

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  })
);

// Get featured products
router.get(
  '/featured',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const rawProducts = await Product.find({ isActive: true, isFeatured: true })
      .sort({ soldCount: -1 })
      .limit(12)
      .select('-description -specs -faqs -relatedProductIds')
      .lean();

    const products = rawProducts.map((p: any) => ({
      ...p,
      stock: p.stockQuantity ?? 0,
    }));

    res.json({
      success: true,
      data: products,
    });
  })
);

// Search autocomplete (public)
router.get(
  '/search/autocomplete',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q } = req.query as { q?: string };

    if (!q || q.trim().length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const rawProducts = await Product.find(
      { isActive: true, $text: { $search: q.trim() } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(6)
      .select('title slug brand price compareAtPrice discount discountEndsAt images averageRating stockQuantity')
      .lean();

    const products = rawProducts.map((p: any) => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      brand: p.brand,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      discount: p.discount,
      image: p.images?.[0] || null,
      averageRating: p.averageRating,
      stock: p.stockQuantity ?? 0,
    }));

    res.json({ success: true, data: products });
  })
);

// Get product brands
router.get(
  '/brands',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const brands = await Product.distinct('brand', { isActive: true });

    res.json({
      success: true,
      data: brands.sort(),
    });
  })
);

// Get single product by slug (public)
router.get(
  '/slug/:slug',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { slug } = req.params;

    const product = await Product.findOne({ slug, isActive: true })
      .populate('categoryId', 'name slug')
      .populate('subcategoryId', 'name slug')
      .lean();

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Increment view count
    await Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } });

    // Get related products (manually assigned or auto-generated)
    let relatedProducts: any[] = [];
    const relatedSelect = 'title slug brand price compareAtPrice discount discountEndsAt images averageRating reviewCount stockQuantity';

    if (product.relatedProductIds && product.relatedProductIds.length > 0) {
      relatedProducts = await Product.find({
        _id: { $in: product.relatedProductIds },
        isActive: true,
      })
        .select(relatedSelect)
        .limit(8)
        .lean();
    }

    // Auto-fill related products if fewer than 8 manually set
    if (relatedProducts.length < 8) {
      const excludeIds: any[] = [product._id, ...relatedProducts.map((p: any) => p._id)];
      const catId = (product.categoryId as any)?._id || product.categoryId;

      // 1. Same category + same brand (best match)
      if (relatedProducts.length < 8 && catId && product.brand) {
        const sameCatBrand = await Product.find({
          _id: { $nin: excludeIds },
          isActive: true,
          categoryId: catId,
          brand: product.brand,
        })
          .select(relatedSelect)
          .sort({ soldCount: -1, averageRating: -1 })
          .limit(8 - relatedProducts.length)
          .lean();
        relatedProducts.push(...sameCatBrand);
        excludeIds.push(...sameCatBrand.map((p: any) => p._id));
      }

      // 2. Same category (different brand)
      if (relatedProducts.length < 8 && catId) {
        const sameCat = await Product.find({
          _id: { $nin: excludeIds },
          isActive: true,
          categoryId: catId,
        })
          .select(relatedSelect)
          .sort({ soldCount: -1, averageRating: -1 })
          .limit(8 - relatedProducts.length)
          .lean();
        relatedProducts.push(...sameCat);
        excludeIds.push(...sameCat.map((p: any) => p._id));
      }

      // 3. Same brand (different category)
      if (relatedProducts.length < 8 && product.brand) {
        const sameBrand = await Product.find({
          _id: { $nin: excludeIds },
          isActive: true,
          brand: product.brand,
        })
          .select(relatedSelect)
          .sort({ soldCount: -1, averageRating: -1 })
          .limit(8 - relatedProducts.length)
          .lean();
        relatedProducts.push(...sameBrand);
        excludeIds.push(...sameBrand.map((p: any) => p._id));
      }

      // 4. Best sellers fallback
      if (relatedProducts.length < 8) {
        const bestSellers = await Product.find({
          _id: { $nin: excludeIds },
          isActive: true,
        })
          .select(relatedSelect)
          .sort({ soldCount: -1, averageRating: -1 })
          .limit(8 - relatedProducts.length)
          .lean();
        relatedProducts.push(...bestSellers);
      }
    }

    // Get approved reviews
    const reviews = await Review.find({
      productId: product._id,
      status: 'approved',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Track recently viewed for logged in user
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $pull: { recentlyViewed: product._id },
      });
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          recentlyViewed: {
            $each: [product._id],
            $position: 0,
            $slice: 20,
          },
        },
      });
    }

    // Frequently Bought Together: find products commonly ordered with this one
    let frequentlyBoughtTogether: any[] = [];
    try {
      const coProducts = await Order.aggregate([
        // Find orders containing this product
        { $match: { 'items.productId': product._id, status: { $nin: ['cancelled', 'failed'] } } },
        { $unwind: '$items' },
        // Exclude the current product itself
        { $match: { 'items.productId': { $ne: product._id } } },
        // Group by product and count co-occurrences
        { $group: { _id: '$items.productId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 4 },
      ]);

      if (coProducts.length > 0) {
        const coProductIds = coProducts.map((cp: any) => cp._id);
        frequentlyBoughtTogether = await Product.find({
          _id: { $in: coProductIds },
          isActive: true,
        })
          .select(relatedSelect)
          .lean();

        // Maintain order by frequency
        frequentlyBoughtTogether = coProductIds
          .map((id: any) => frequentlyBoughtTogether.find((p: any) => p._id.toString() === id.toString()))
          .filter(Boolean)
          .map((p: any) => ({ ...p, stock: p.stockQuantity ?? 0 }));
      }
    } catch (err) {
      // Non-critical - log and continue
      console.error('Error computing frequently bought together:', err);
    }

    // Normalize related products to include stock alias
    const normalizedRelated = relatedProducts.map((p: any) => ({
      ...p,
      stock: p.stockQuantity ?? 0,
    }));

    res.json({
      success: true,
      data: {
        ...product,
        stock: (product as any).stockQuantity ?? 0,
        relatedProducts: normalizedRelated,
        frequentlyBoughtTogether,
        reviews,
      },
    });
  })
);

// Get single product by ID
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid product ID');
    }

    const product = await Product.findById(id)
      .populate('categoryId', 'name slug')
      .lean();

    if (!product) {
      throw new NotFoundError('Product');
    }

    res.json({
      success: true,
      data: {
        ...product,
        stock: (product as any).stockQuantity ?? 0,
      },
    });
  })
);

// Create product (admin)
router.post(
  '/',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  validate(createProductSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;

    // Verify category exists
    const category = await Category.findById(data.categoryId);
    if (!category) {
      throw new BadRequestError('Invalid category');
    }

    // Check SKU uniqueness
    const existingSku = await Product.findOne({ sku: data.sku.toUpperCase() });
    if (existingSku) {
      throw new BadRequestError('SKU already exists');
    }

    const product = await Product.create(data);

    // Update category product count
    await Category.findByIdAndUpdate(data.categoryId, { $inc: { productCount: 1 } });

    // Create initial stock movement if product has stock
    if (product.stockQuantity > 0) {
      await StockMovement.create({
        productId: product._id,
        type: 'purchase',
        quantity: product.stockQuantity,
        previousStock: 0,
        newStock: product.stockQuantity,
        reason: 'Initial stock on product creation',
        userId: req.user!._id,
      });
    }

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'create',
      resource: 'product',
      resourceId: product._id.toString(),
      newValue: { title: product.title, sku: product.sku, price: product.price, categoryId: data.categoryId, stockQuantity: product.stockQuantity },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  })
);

// Update product (admin)
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  validate(updateProductSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid product ID');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError('Product');
    }

    // If category changed, update product counts
    if (data.categoryId && data.categoryId !== product.categoryId.toString()) {
      await Category.findByIdAndUpdate(product.categoryId, { $inc: { productCount: -1 } });
      await Category.findByIdAndUpdate(data.categoryId, { $inc: { productCount: 1 } });
    }

    // Track stock changes with StockMovement
    const previousStock = product.stockQuantity;
    const newStock = data.stockQuantity !== undefined ? data.stockQuantity : previousStock;

    // Capture old values for audit
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const oldVal = (product as any)[key];
      const newVal = data[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        oldValues[key] = oldVal;
        newValues[key] = newVal;
      }
    }

    // Update product
    Object.assign(product, data);
    await product.save();

    // Create stock movement if stock changed
    if (newStock !== previousStock) {
      await StockMovement.create({
        productId: product._id,
        type: 'adjustment',
        quantity: Math.abs(newStock - previousStock),
        previousStock,
        newStock,
        reason: 'Stock updated via product management',
        userId: req.user!._id,
      });
    }

    // Log audit
    if (Object.keys(newValues).length > 0) {
      await AuditLog.create({
        userId: req.userId,
        action: 'update',
        resource: 'product',
        resourceId: product._id.toString(),
        oldValue: { ...oldValues, title: product.title },
        newValue: { ...newValues, title: product.title },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    res.json({
      success: true,
      data: product,
    });
  })
);

// Delete product (admin)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('products', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid product ID');
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!product) {
      throw new NotFoundError('Product');
    }

    // Update category product count
    await Category.findByIdAndUpdate(product.categoryId, { $inc: { productCount: -1 } });

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'delete',
      resource: 'product',
      resourceId: product._id.toString(),
      oldValue: { title: product.title, sku: product.sku, price: product.price },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Product deleted',
    });
  })
);

// Compare products
router.post(
  '/compare',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 4) {
      throw new BadRequestError('Provide 2-4 product IDs to compare');
    }

    const rawProducts = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    })
      .select('title slug brand price compareAtPrice discount discountEndsAt images specs warranty averageRating reviewCount stockQuantity sku description shortDescription categoryId tags deliveryNotes installationNotes')
      .populate('categoryId', 'name slug')
      .lean();

    if (rawProducts.length !== productIds.length) {
      throw new BadRequestError('One or more products not found');
    }

    const products = rawProducts.map((p: any) => ({
      ...p,
      stock: p.stockQuantity ?? 0,
    }));

    res.json({
      success: true,
      data: products,
    });
  })
);

export default router;
