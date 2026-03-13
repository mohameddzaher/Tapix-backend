// ============================================
// Tapix API - Order Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { createOrderSchema, updateOrderStatusSchema, orderFiltersSchema, paginationSchema } from '@tapix/shared';
import { Order, IOrderItem } from '../models/Order';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { Settings } from '../models/Settings';
import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';
import { Referral } from '../models/Referral';
import { StockMovement } from '../models/StockMovement';
import { Transaction } from '../models/Transaction';
import { Offer } from '../models/Offer';
import { PointsTransaction } from '../models/PointsTransaction';
import { authenticate, requireAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { sendOrderConfirmationEmail } from '../services/email.service';
import { notifyAdminsNewOrder, notifyOrderStatusChange, notifyAdminsLowStock } from '../services/notification.service';
import { getOrderStatusLabel } from '@tapix/shared';

const router = Router();

// Get user's orders
router.get(
  '/my-orders',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 10 } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments({ userId: req.userId }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get single order for user
router.get(
  '/my-orders/:orderNumber',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderNumber } = req.params;

    const order = await Order.findOne({
      orderNumber,
      userId: req.userId,
    }).lean();

    if (!order) {
      throw new NotFoundError('Order');
    }

    res.json({
      success: true,
      data: order,
    });
  })
);

// Create new order
router.post(
  '/',
  authenticate,
  validate(createOrderSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { items, shippingAddress, paymentMethod, discountCode, notes, redeemPoints } = req.body;

    // Validate and get products
    const productIds = items.map((item: any) => item.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    });

    if (products.length !== items.length) {
      throw new BadRequestError('One or more products not found or unavailable');
    }

    // Get settings for dynamic shipping and delivery calculation
    const settings = await (Settings as any).getSettings();

    // Check stock and calculate totals
    const orderItems: IOrderItem[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) {
        throw new BadRequestError(`Product ${item.productId} not found`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new BadRequestError(`Insufficient stock for ${product.title}`);
      }

      const discountPct = product.discount ?? 0;
      const hasDiscount = discountPct > 0 &&
        (!product.discountEndsAt || new Date(product.discountEndsAt) > new Date());
      const itemPrice = hasDiscount
        ? product.price * (1 - discountPct / 100)
        : product.price;

      orderItems.push({
        productId: product._id,
        title: product.title,
        sku: product.sku,
        price: itemPrice,
        originalPrice: hasDiscount ? product.price : undefined,
        discount: hasDiscount ? discountPct : undefined,
        quantity: item.quantity,
        image: product.images[0]?.url,
      });

      subtotal += itemPrice * item.quantity;
    }

    // Calculate shipping based on settings
    let shippingCost = settings.shippingFee || 50;
    if (settings.enableFreeShipping && subtotal >= (settings.freeShippingThreshold || 500)) {
      shippingCost = 0;
    }

    // Apply discount code if provided
    let promoDiscount = 0;
    if (discountCode) {
      const offer = await Offer.findOne({
        code: discountCode.toUpperCase(),
        isActive: true,
        startsAt: { $lte: new Date() },
        endsAt: { $gt: new Date() },
      });

      if (offer && (!offer.usageLimit || offer.usedCount < offer.usageLimit)) {
        if (!offer.minOrderAmount || subtotal >= offer.minOrderAmount) {
          if (offer.type === 'percentage') {
            promoDiscount = (subtotal * offer.value) / 100;
            if (offer.maxDiscount) {
              promoDiscount = Math.min(promoDiscount, offer.maxDiscount);
            }
          } else if (offer.type === 'fixed') {
            promoDiscount = offer.value;
          }

          // Increment usage count
          await Offer.findByIdAndUpdate(offer._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    // Check for referral discount (first order only)
    let referralDiscount = 0;
    let referralApplied = false;
    const existingOrdersCount = await Order.countDocuments({ userId: req.userId });
    if (existingOrdersCount === 0) {
      // This is the user's first order - check for pending referral
      const pendingReferral = await Referral.findOne({
        referee: req.userId,
        status: 'pending',
      });

      if (pendingReferral) {
        referralDiscount = pendingReferral.refereeDiscount || 100;
        referralApplied = true;
      }
    }

    // Loyalty points redemption
    let loyaltyDiscount = 0;
    let pointsRedeemed = 0;
    if (redeemPoints && redeemPoints > 0 && settings.enableLoyaltyProgram) {
      const orderUser = await User.findById(req.userId);
      if (orderUser && !orderUser.pointsFrozen && orderUser.loyaltyPoints >= redeemPoints) {
        if (redeemPoints >= (settings.minPointsToRedeem || 0)) {
          let actualPoints = redeemPoints;
          if (settings.maxPointsPerOrder > 0) {
            actualPoints = Math.min(actualPoints, settings.maxPointsPerOrder);
          }
          actualPoints = Math.min(actualPoints, orderUser.loyaltyPoints);
          loyaltyDiscount = settings.pointsRedemptionRate > 0
            ? Math.floor(actualPoints / settings.pointsRedemptionRate)
            : 0;
          pointsRedeemed = actualPoints;
        }
      }
    }

    // Total discount combines promo code, referral discount, and loyalty points
    const discount = promoDiscount + referralDiscount + loyaltyDiscount;

    // Calculate tax based on settings
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxRate = settings.enableTax ? (settings.taxRate || 0) : 0;
    const taxAmount = taxRate > 0 ? Math.round((taxableAmount * taxRate) / 100 * 100) / 100 : 0;
    const taxLabel = settings.taxLabel || 'VAT';

    const total = Math.max(0, subtotal + shippingCost - discount + taxAmount);

    // Create order
    const order = await Order.create({
      userId: req.userId,
      items: orderItems,
      subtotal,
      shippingCost,
      discount,
      discountCode: promoDiscount > 0 ? discountCode : (referralApplied ? 'REFERRAL' : undefined),
      taxRate,
      taxAmount,
      taxLabel,
      total,
      status: 'new',
      statusHistory: [
        {
          status: 'new',
          timestamp: new Date(),
          updatedBy: new mongoose.Types.ObjectId(req.userId),
        },
      ],
      paymentMethod,
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'pending',
      shippingAddress,
      notes,
      estimatedDelivery: new Date(Date.now() + (settings.estimatedDeliveryDays || 3) * 24 * 60 * 60 * 1000),
    });

    // Update product stock, sold count, and create stock movements
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      const previousStock = product.stockQuantity;
      const newStock = previousStock - item.quantity;

      product.stockQuantity = newStock;
      product.soldCount = (product.soldCount || 0) + item.quantity;
      await product.save();

      // Create stock movement record for inventory tracking
      await StockMovement.create({
        productId: product._id,
        type: 'sale',
        quantity: item.quantity,
        previousStock,
        newStock,
        reason: `Order ${order.orderNumber}`,
        reference: order.orderNumber,
        orderId: order._id,
        userId: req.userId,
      });

      // Check for low stock
      if (newStock <= product.lowStockThreshold) {
        notifyAdminsLowStock(
          product.title,
          product.sku,
          newStock
        ).catch(console.error);
      }
    }

    // Create transaction record for accounting
    await Transaction.create({
      type: 'credit',
      amount: total,
      category: 'order_revenue',
      description: `Revenue from order ${order.orderNumber}`,
      reference: order.orderNumber,
      orderId: order._id,
      date: new Date(),
      createdBy: req.userId,
    });

    // Deduct loyalty points if redeemed
    if (pointsRedeemed > 0) {
      try {
        await User.findByIdAndUpdate(req.userId, {
          $inc: {
            loyaltyPoints: -pointsRedeemed,
            totalPointsRedeemed: pointsRedeemed,
          },
        });

        await PointsTransaction.create({
          userId: req.userId,
          type: 'redeemed',
          points: -pointsRedeemed,
          orderId: order._id,
          description: `Redeemed ${pointsRedeemed} points for SAR ${loyaltyDiscount} discount on order ${order.orderNumber}`,
        });
      } catch (loyaltyErr) {
        console.error('Error deducting loyalty points:', loyaltyErr);
      }
    }

    // Clear user's cart
    await Cart.findOneAndUpdate({ userId: req.userId }, { items: [], discountCode: null, discountAmount: 0 });

    // Send confirmation email
    sendOrderConfirmationEmail(shippingAddress.email, order.orderNumber, {
      items: orderItems.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price })),
      subtotal,
      shipping: shippingCost,
      discount,
      total,
    }).catch(console.error);

    // Notify admins
    notifyAdminsNewOrder(
      order.orderNumber,
      total,
      shippingAddress.fullName,
      order._id.toString()
    ).catch(console.error);

    // Handle referral completion for first-time orders
    try {
      // Check if this is the user's first order
      const existingOrdersCount = await Order.countDocuments({
        userId: req.userId,
        _id: { $ne: order._id },
      });

      if (existingOrdersCount === 0) {
        // This is the user's first order - check for pending referral
        const pendingReferral = await Referral.findOne({
          referee: req.userId,
          status: 'pending',
        });

        if (pendingReferral) {
          // Get settings for minimum order amount (default 500)
          const minOrderAmount = settings.referralMinOrderAmount || 500;

          if (total >= minOrderAmount) {
            // Complete the referral
            pendingReferral.status = 'completed';
            pendingReferral.orderAmount = total;
            pendingReferral.orderId = order._id;
            pendingReferral.completedAt = new Date();
            await pendingReferral.save();

            // Credit the referrer with rewards
            await User.findByIdAndUpdate(pendingReferral.referrer, {
              $inc: {
                referralCredits: pendingReferral.referrerReward || 100,
                successfulReferrals: 1,
              },
            });

            // Award referral bonus loyalty points
            if (settings.enableLoyaltyProgram && settings.referralBonusPoints > 0) {
              const referrer = await User.findById(pendingReferral.referrer);
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

            console.log(`Referral completed: Referrer ${pendingReferral.referrer} credited for order ${order.orderNumber}`);
          }
        }
      }
    } catch (referralError) {
      // Log but don't fail the order creation
      console.error('Error processing referral completion:', referralError);
    }

    res.status(201).json({
      success: true,
      data: order,
    });
  })
);

// Reorder - add previous order items to cart
router.post(
  '/reorder/:orderNumber',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderNumber } = req.params;

    const order = await Order.findOne({
      orderNumber,
      userId: req.userId,
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      cart = await Cart.create({ userId: req.userId, items: [] });
    }

    // Add items to cart
    for (const item of order.items) {
      // Check if product still exists and is in stock
      const product = await Product.findOne({
        _id: item.productId,
        isActive: true,
        stockQuantity: { $gt: 0 },
      });

      if (product) {
        const existingItem = cart.items.find(
          (i) => i.productId.toString() === item.productId.toString()
        );

        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          cart.items.push({
            productId: item.productId,
            quantity: Math.min(item.quantity, product.stockQuantity),
            addedAt: new Date(),
          });
        }
      }
    }

    await cart.save();

    res.json({
      success: true,
      message: 'Items added to cart',
      data: { itemsAdded: cart.items.length },
    });
  })
);

// ========== ADMIN ROUTES ==========

// Get all orders (admin)
router.get(
  '/',
  authenticate,
  requireAdmin,
  requirePermission('orders', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20 } = req.query as any;
    const filters = orderFiltersSchema.parse(req.query);
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};

    // Status filter
    if (filters.status?.length) {
      query.status = { $in: filters.status };
    }

    // Payment method filter
    if (filters.paymentMethod?.length) {
      query.paymentMethod = { $in: filters.paymentMethod };
    }

    // Payment status filter
    if (filters.paymentStatus?.length) {
      query.paymentStatus = { $in: filters.paymentStatus };
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    // Search filter
    if (filters.search) {
      query.$or = [
        { orderNumber: { $regex: filters.search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: filters.search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: filters.search, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'firstName lastName email')
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get order by ID (admin)
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('orders', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    let order;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id)
        .populate('userId', 'firstName lastName email phone')
        .populate('statusHistory.updatedBy', 'firstName lastName')
        .lean();
    } else {
      // Fallback: try finding by orderNumber (e.g., "ORD-1234")
      order = await Order.findOne({ orderNumber: id })
        .populate('userId', 'firstName lastName email phone')
        .populate('statusHistory.updatedBy', 'firstName lastName')
        .lean();
    }

    if (!order) {
      throw new NotFoundError('Order');
    }

    res.json({
      success: true,
      data: order,
    });
  })
);

// Update order status (admin)
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  requirePermission('orders', 'write'),
  validate(updateOrderStatusSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid order ID');
    }

    const order = await Order.findById(id);
    if (!order) {
      throw new NotFoundError('Order');
    }

    const oldStatus = order.status;

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      new: ['accepted', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['out_for_delivery', 'cancelled'],
      out_for_delivery: ['delivered', 'failed'],
      delivered: [],
      cancelled: [],
      failed: [],
    };

    if (!validTransitions[oldStatus]?.includes(status)) {
      throw new BadRequestError(`Cannot transition from ${oldStatus} to ${status}`);
    }

    // Update order
    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: new mongoose.Types.ObjectId(req.userId),
      note,
    });

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';

      // Award loyalty points on delivery
      try {
        const loyaltySettings = await (Settings as any).getSettings();
        if (loyaltySettings.enableLoyaltyProgram) {
          const orderUser = await User.findById(order.userId);
          if (orderUser && !orderUser.pointsFrozen) {
            const pointsEarned = Math.floor(order.total * (loyaltySettings.pointsPerCurrency || 1));
            if (pointsEarned > 0) {
              orderUser.loyaltyPoints += pointsEarned;
              orderUser.totalPointsEarned += pointsEarned;
              await orderUser.save();

              await PointsTransaction.create({
                userId: orderUser._id,
                type: 'earned_purchase',
                points: pointsEarned,
                orderId: order._id,
                description: `Earned ${pointsEarned} points from order ${order.orderNumber}`,
              });
            }
          }
        }
      } catch (loyaltyErr) {
        console.error('Error awarding loyalty points:', loyaltyErr);
      }
    }

    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancelReason = note;
      order.paymentStatus = 'refunded';

      // Restore stock and create return movements
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        const previousStock = product.stockQuantity;
        const newStock = previousStock + item.quantity;

        product.stockQuantity = newStock;
        product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
        await product.save();

        // Create return stock movement
        await StockMovement.create({
          productId: product._id,
          type: 'return',
          quantity: item.quantity,
          previousStock,
          newStock,
          reason: `Order ${order.orderNumber} cancelled`,
          reference: order.orderNumber,
          orderId: order._id,
          userId: req.userId,
        });
      }

      // Create refund transaction
      await Transaction.create({
        type: 'debit',
        amount: order.total,
        category: 'order_refund',
        description: `Refund for cancelled order ${order.orderNumber}`,
        reference: order.orderNumber,
        orderId: order._id,
        date: new Date(),
        createdBy: req.userId,
      });
    }

    await order.save();

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'status_change',
      resource: 'order',
      resourceId: order._id.toString(),
      oldValue: { status: oldStatus },
      newValue: { status, note },
    });

    // Notify customer
    notifyOrderStatusChange(
      order.userId.toString(),
      order.orderNumber,
      status,
      getOrderStatusLabel(status)
    ).catch(console.error);

    res.json({
      success: true,
      data: order,
    });
  })
);

// Get order statistics (admin)
router.get(
  '/stats/summary',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [statusCounts, todayStats, weekStats] = await Promise.all([
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: today } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        today: todayStats[0] || { count: 0, revenue: 0 },
        week: weekStats[0] || { count: 0, revenue: 0 },
      },
    });
  })
);

export default router;
