// ============================================
// Tapix API - Inventory Management Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { Product } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { Order } from '../models/Order';

const router = Router();

// ============================================
// GET /dashboard - Inventory overview stats
// ============================================
router.get(
  '/dashboard',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Total active products
    const totalProducts = await Product.countDocuments({ isActive: true });

    // Total stock value (price * stockQuantity for all active products)
    const stockValueResult = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalStockValue: { $sum: { $multiply: ['$price', '$stockQuantity'] } },
        },
      },
    ]);
    const totalStockValue = stockValueResult[0]?.totalStockValue || 0;

    // Low stock count (stockQuantity <= lowStockThreshold but > 0)
    const lowStockCount = await Product.countDocuments({
      isActive: true,
      $expr: { $and: [{ $gt: ['$stockQuantity', 0] }, { $lte: ['$stockQuantity', '$lowStockThreshold'] }] },
    });

    // Out of stock count
    const outOfStockCount = await Product.countDocuments({
      isActive: true,
      stockQuantity: 0,
    });

    // Recent movements (last 10)
    const recentMovements = await StockMovement.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('productId', 'title sku')
      .populate('userId', 'firstName lastName')
      .lean();

    // Stock by category
    const stockByCategory = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$categoryId',
          totalStock: { $sum: '$stockQuantity' },
          totalValue: { $sum: { $multiply: ['$price', '$stockQuantity'] } },
          productCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 1,
          categoryName: '$category.name',
          totalStock: 1,
          totalValue: 1,
          productCount: 1,
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
        recentMovements,
        stockByCategory,
      },
    });
  })
);

// ============================================
// GET /products - Products with stock info
// ============================================
router.get(
  '/products',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string;
    const category = req.query.category as string;
    const stockStatus = (req.query.stockStatus as string) || 'all';

    // Build query
    const query: any = { isActive: true };

    // Search by title or sku
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by category
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      query.categoryId = new mongoose.Types.ObjectId(category);
    }

    // Filter by stock status
    switch (stockStatus) {
      case 'low':
        query.$expr = { $and: [{ $gt: ['$stockQuantity', 0] }, { $lte: ['$stockQuantity', '$lowStockThreshold'] }] };
        break;
      case 'out':
        query.stockQuantity = 0;
        break;
      case 'in':
        query.stockQuantity = { $gt: 0 };
        break;
      // 'all' - no additional filter
    }

    const skip = (page - 1) * limit;

    const [rawProducts, total] = await Promise.all([
      Product.find(query)
        .sort({ stockQuantity: 1 })
        .skip(skip)
        .limit(limit)
        .select('title sku images stockQuantity lowStockThreshold price categoryId')
        .populate('categoryId', 'name')
        .lean(),
      Product.countDocuments(query),
    ]);

    const products = rawProducts.map((p: any) => ({
      ...p,
      stock: p.stockQuantity ?? 0,
    }));

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

// ============================================
// PATCH /products/:id/stock - Update single product stock
// ============================================
router.patch(
  '/products/:id/stock',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid product ID');
    }

    if (quantity === undefined || quantity === null || typeof quantity !== 'number') {
      throw new BadRequestError('Quantity is required and must be a number');
    }

    if (!type || !['set', 'add', 'subtract'].includes(type)) {
      throw new BadRequestError('Type must be one of: set, add, subtract');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError('Product');
    }

    const previousStock = product.stockQuantity;
    let newStock: number;

    switch (type) {
      case 'set':
        newStock = quantity;
        break;
      case 'add':
        newStock = previousStock + quantity;
        break;
      case 'subtract':
        newStock = previousStock - quantity;
        break;
      default:
        newStock = previousStock;
    }

    if (newStock < 0) {
      throw new BadRequestError('Stock quantity cannot be negative');
    }

    // Create stock movement record
    await StockMovement.create({
      productId: product._id,
      type: 'adjustment',
      quantity,
      previousStock,
      newStock,
      reason: reason || `Stock ${type}: ${quantity}`,
      userId: req.user!._id,
    });

    // Update product stock
    product.stockQuantity = newStock;
    await product.save();

    res.json({
      success: true,
      data: {
        _id: product._id,
        title: product.title,
        sku: product.sku,
        previousStock,
        newStock,
        stockQuantity: product.stockQuantity,
      },
    });
  })
);

// ============================================
// POST /bulk-update - Bulk stock update
// ============================================
router.post(
  '/bulk-update',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestError('Updates array is required and must not be empty');
    }

    let updatedCount = 0;
    const results: any[] = [];

    for (const update of updates) {
      const { productId, quantity, reason } = update;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        results.push({ productId, success: false, error: 'Invalid product ID' });
        continue;
      }

      if (quantity === undefined || quantity === null || typeof quantity !== 'number' || quantity < 0) {
        results.push({ productId, success: false, error: 'Invalid quantity' });
        continue;
      }

      const product = await Product.findById(productId);
      if (!product) {
        results.push({ productId, success: false, error: 'Product not found' });
        continue;
      }

      const previousStock = product.stockQuantity;
      const newStock = quantity;

      // Create stock movement record
      await StockMovement.create({
        productId: product._id,
        type: 'adjustment',
        quantity,
        previousStock,
        newStock,
        reason: reason || 'Bulk stock update',
        userId: req.user!._id,
      });

      // Update product stock
      product.stockQuantity = newStock;
      await product.save();

      updatedCount++;
      results.push({
        productId,
        success: true,
        previousStock,
        newStock,
      });
    }

    res.json({
      success: true,
      data: {
        totalRequested: updates.length,
        updatedCount,
        results,
      },
    });
  })
);

// ============================================
// GET /movements - List stock movements
// ============================================
router.get(
  '/movements',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const type = req.query.type as string;
    const productId = req.query.productId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build query
    const query: any = {};

    if (type && ['purchase', 'sale', 'adjustment', 'return', 'damaged'].includes(type)) {
      query.type = type;
    }

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      query.productId = new mongoose.Types.ObjectId(productId);
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      StockMovement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('productId', 'title sku')
        .populate('userId', 'firstName lastName')
        .lean(),
      StockMovement.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: movements,
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

// ============================================
// POST /movements - Record new stock movement
// ============================================
router.post(
  '/movements',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productId, type, quantity, reason, reference, notes } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new BadRequestError('Valid product ID is required');
    }

    if (!type || !['purchase', 'sale', 'adjustment', 'return', 'damaged'].includes(type)) {
      throw new BadRequestError('Type must be one of: purchase, sale, adjustment, return, damaged');
    }

    if (quantity === undefined || quantity === null || typeof quantity !== 'number' || quantity < 0) {
      throw new BadRequestError('Quantity is required and must be a non-negative number');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    const previousStock = product.stockQuantity;
    let newStock: number;

    switch (type) {
      case 'purchase':
      case 'return':
        newStock = previousStock + quantity;
        break;
      case 'sale':
      case 'damaged':
        newStock = previousStock - quantity;
        break;
      case 'adjustment':
        newStock = quantity;
        break;
      default:
        newStock = previousStock;
    }

    if (newStock < 0) {
      throw new BadRequestError(
        `Insufficient stock. Current: ${previousStock}, attempted to remove: ${quantity}`
      );
    }

    // Create stock movement
    const movement = await StockMovement.create({
      productId: product._id,
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      reference,
      notes,
      userId: req.user!._id,
    });

    // Update product stock
    product.stockQuantity = newStock;
    await product.save();

    // Populate the created movement for response
    const populatedMovement = await StockMovement.findById(movement._id)
      .populate('productId', 'title sku')
      .populate('userId', 'firstName lastName')
      .lean();

    res.json({
      success: true,
      data: populatedMovement,
    });
  })
);

// ============================================
// GET /alerts - Low stock alerts
// ============================================
router.get(
  '/alerts',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const alerts = await Product.aggregate([
      {
        $match: {
          isActive: true,
          $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          title: 1,
          sku: 1,
          images: 1,
          stockQuantity: 1,
          lowStockThreshold: 1,
          price: 1,
          categoryName: '$category.name',
          deficit: { $subtract: ['$lowStockThreshold', '$stockQuantity'] },
        },
      },
      { $sort: { stockQuantity: 1 } },
    ]);

    res.json({
      success: true,
      data: alerts,
    });
  })
);

// ============================================
// POST /backfill - Create stock movements from existing orders
// ============================================
router.post(
  '/backfill',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Find all non-cancelled orders that don't have stock movements
    const orders = await Order.find({
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: 1 }).lean();

    let movementsCreated = 0;
    let skipped = 0;

    for (const order of orders) {
      for (const item of (order as any).items) {
        // Check if stock movement already exists for this order+product
        const existing = await StockMovement.findOne({
          orderId: order._id,
          productId: item.productId,
          type: 'sale',
        });

        if (existing) {
          skipped++;
          continue;
        }

        // We don't know exact previous stock, so record what we can
        await StockMovement.create({
          productId: item.productId,
          type: 'sale',
          quantity: item.quantity,
          previousStock: 0, // Unknown for historical
          newStock: 0, // Unknown for historical
          reason: `Order ${(order as any).orderNumber} (backfill)`,
          reference: (order as any).orderNumber,
          orderId: order._id,
          userId: req.userId,
        });

        movementsCreated++;
      }
    }

    res.json({
      success: true,
      data: {
        message: 'Inventory backfill completed',
        movementsCreated,
        skipped,
        ordersProcessed: orders.length,
      },
    });
  })
);

export default router;
