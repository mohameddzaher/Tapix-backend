// ============================================
// Tapix API - Admin Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { createStaffSchema, updateStaffSchema, paginationSchema } from '@tapix/shared';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { AuditLog } from '../models/AuditLog';
import { Settings } from '../models/Settings';
import { authenticate, requireAdmin, requireSuperAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError, ForbiddenError } from '../middleware/errorHandler';
import * as analyticsService from '../services/analytics.service';

const router = Router();

// ========== DASHBOARD ==========

// Get dashboard stats
router.get(
  '/dashboard',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const fullAccess = req.user?.role === 'super_admin' || req.user?.permissions?.analytics?.full;

    // Get stats, recent orders, and top products in parallel
    const [stats, recentOrders, topProducts] = await Promise.all([
      analyticsService.getDashboardStats(fullAccess),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'firstName lastName email')
        .lean(),
      Product.find({ isActive: true })
        .sort({ soldCount: -1 })
        .limit(5)
        .select('title images price soldCount stockQuantity')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        stats,
        recentOrders,
        topProducts,
      },
    });
  })
);

// Get sales analytics
router.get(
  '/analytics/sales',
  authenticate,
  requireAdmin,
  requirePermission('analytics', 'limited'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = 'day', days = 30 } = req.query;
    const data = await analyticsService.getSalesAnalytics(
      period as 'day' | 'week' | 'month',
      Number(days)
    );

    res.json({
      success: true,
      data,
    });
  })
);

// Get top products
router.get(
  '/analytics/top-products',
  authenticate,
  requireAdmin,
  requirePermission('analytics', 'limited'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 10 } = req.query;
    const data = await analyticsService.getTopProducts(Number(limit));

    res.json({
      success: true,
      data,
    });
  })
);

// Get top categories
router.get(
  '/analytics/top-categories',
  authenticate,
  requireAdmin,
  requirePermission('analytics', 'limited'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 10 } = req.query;
    const data = await analyticsService.getTopCategories(Number(limit));

    res.json({
      success: true,
      data,
    });
  })
);

// Get order status distribution
router.get(
  '/analytics/order-status',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await analyticsService.getOrderStatusDistribution();

    res.json({
      success: true,
      data,
    });
  })
);

// Get revenue comparison
router.get(
  '/analytics/revenue-comparison',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await analyticsService.getRevenueComparison();

    res.json({
      success: true,
      data,
    });
  })
);

// Combined analytics endpoint for the dashboard
router.get(
  '/analytics',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = '30' } = req.query as any;
    const days = Number(period);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Get current period stats
    const [currentStats, prevStats, newCustomers, prevCustomers, topProducts, topCategories, recentOrders] = await Promise.all([
      // Current period orders and revenue
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ['cancelled', 'failed'] },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
          },
        },
      ]),
      // Previous period for comparison
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: prevStartDate, $lte: prevEndDate },
            status: { $nin: ['cancelled', 'failed'] },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
          },
        },
      ]),
      // New customers in current period
      User.countDocuments({
        role: 'user',
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      // New customers in previous period
      User.countDocuments({
        role: 'user',
        createdAt: { $gte: prevStartDate, $lte: prevEndDate },
      }),
      // Top selling products
      Order.aggregate([
        { $match: { status: 'delivered', createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            title: { $first: '$items.title' },
            image: { $first: '$items.image' },
            sold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { sold: -1 } },
        { $limit: 5 },
      ]),
      // Top categories
      Order.aggregate([
        { $match: { status: 'delivered', createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'categories',
            localField: 'product.categoryId',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$category._id',
            name: { $first: '$category.name' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      // Recent orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName')
        .lean(),
    ]);

    const current = currentStats[0] || { totalOrders: 0, totalRevenue: 0 };
    const prev = prevStats[0] || { totalOrders: 0, totalRevenue: 0 };

    // Calculate percentage changes
    const revenueChange = prev.totalRevenue > 0
      ? Math.round(((current.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100)
      : current.totalRevenue > 0 ? 100 : 0;

    const ordersChange = prev.totalOrders > 0
      ? Math.round(((current.totalOrders - prev.totalOrders) / prev.totalOrders) * 100)
      : current.totalOrders > 0 ? 100 : 0;

    const customersChange = prevCustomers > 0
      ? Math.round(((newCustomers - prevCustomers) / prevCustomers) * 100)
      : newCustomers > 0 ? 100 : 0;

    // Calculate total revenue for percentage
    const totalCategoryRevenue = topCategories.reduce((sum: number, c: any) => sum + (c.revenue || 0), 0);

    // Get page views from products (sum of viewCount)
    const pageViewsResult = await Product.aggregate([
      { $group: { _id: null, total: { $sum: '$viewCount' } } },
    ]);
    const pageViews = pageViewsResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalRevenue: current.totalRevenue,
        revenueChange,
        totalOrders: current.totalOrders,
        ordersChange,
        newCustomers,
        customersChange,
        pageViews,
        viewsChange: 0, // Would need historical data
        topProducts: topProducts.map((p: any) => ({
          _id: p._id,
          title: p.title,
          image: p.image,
          sold: p.sold,
          revenue: p.revenue,
        })),
        topCategories: topCategories.map((c: any) => ({
          _id: c._id,
          name: c.name || 'Uncategorized',
          percentage: totalCategoryRevenue > 0 ? Math.round((c.revenue / totalCategoryRevenue) * 100) : 0,
        })),
        recentOrders: recentOrders.map((o: any) => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          customer: {
            name: o.userId ? `${o.userId.firstName} ${o.userId.lastName}` : (o.shippingAddress?.fullName || 'Guest'),
          },
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
        })),
      },
    });
  })
);

// ========== STAFF MANAGEMENT ==========

// Get all staff
router.get(
  '/staff',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, search } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = { role: { $in: ['admin', 'super_admin', 'staff'] } };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const [staff, total] = await Promise.all([
      User.find(query)
        .select('-refreshTokens -passwordResetToken -passwordResetExpires')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: staff,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get staff member by ID
router.get(
  '/staff/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid staff ID');
    }

    const staff = await User.findOne({
      _id: id,
      role: { $in: ['admin', 'super_admin', 'staff'] },
    })
      .select('-refreshTokens -passwordResetToken -passwordResetExpires')
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!staff) {
      throw new NotFoundError('Staff member');
    }

    res.json({
      success: true,
      data: staff,
    });
  })
);

// Create new staff member
router.post(
  '/staff',
  authenticate,
  requireSuperAdmin,
  validate(createStaffSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, firstName, lastName, phone, role, permissions } = req.body;

    // Check if email exists
    const existing = await User.findOne({ email });
    if (existing) {
      throw new BadRequestError('Email already in use');
    }

    const staff = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      permissions,
      isActive: true,
      isEmailVerified: true,
      createdBy: req.userId,
    });

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'create',
      resource: 'staff',
      resourceId: staff._id.toString(),
      newValue: { email, firstName, lastName, role },
    });

    res.status(201).json({
      success: true,
      data: staff,
    });
  })
);

// Update staff member
router.patch(
  '/staff/:id',
  authenticate,
  requireSuperAdmin,
  validate(updateStaffSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid staff ID');
    }

    // Cannot modify own account this way
    if (id === req.userId) {
      throw new ForbiddenError('Cannot modify own account through this endpoint');
    }

    const staff = await User.findOne({
      _id: id,
      role: { $in: ['admin', 'super_admin', 'staff'] },
    });

    if (!staff) {
      throw new NotFoundError('Staff member');
    }

    // Cannot downgrade super_admin role
    if (staff.role === 'super_admin' && data.role === 'admin') {
      throw new ForbiddenError('Cannot downgrade super admin role');
    }

    const oldData = { permissions: staff.permissions, isActive: staff.isActive };

    Object.assign(staff, data);
    await staff.save();

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'update',
      resource: 'staff',
      resourceId: staff._id.toString(),
      oldValue: oldData,
      newValue: data,
    });

    res.json({
      success: true,
      data: staff,
    });
  })
);

// Toggle staff active status
router.patch(
  '/staff/:id/toggle-active',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid staff ID');
    }

    if (id === req.userId) {
      throw new ForbiddenError('Cannot deactivate own account');
    }

    const staff = await User.findOne({
      _id: id,
      role: { $in: ['admin', 'super_admin'] },
    });

    if (!staff) {
      throw new NotFoundError('Staff member');
    }

    staff.isActive = !staff.isActive;
    staff.refreshTokens = []; // Revoke sessions
    await staff.save();

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'update',
      resource: 'staff',
      resourceId: staff._id.toString(),
      oldValue: { isActive: !staff.isActive },
      newValue: { isActive: staff.isActive },
    });

    res.json({
      success: true,
      data: { isActive: staff.isActive },
    });
  })
);

// Delete staff member
router.delete(
  '/staff/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid staff ID');
    }

    if (id === req.userId) {
      throw new ForbiddenError('Cannot delete own account');
    }

    const staff = await User.findOne({
      _id: id,
      role: 'admin', // Cannot delete super_admin
    });

    if (!staff) {
      throw new NotFoundError('Staff member');
    }

    await staff.deleteOne();

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'delete',
      resource: 'staff',
      resourceId: id,
    });

    res.json({
      success: true,
      message: 'Staff member deleted',
    });
  })
);

// ========== CUSTOMERS ==========

// Get all customers
router.get(
  '/customers',
  authenticate,
  requireAdmin,
  requirePermission('orders', 'read'),
  validate(paginationSchema, 'query'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20 } = req.query as any;
    const { search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = { role: 'user' };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      User.find(query)
        .select('email firstName lastName phone isActive createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get customer details
router.get(
  '/customers/:id',
  authenticate,
  requireAdmin,
  requirePermission('orders', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid customer ID');
    }

    const customer = await User.findOne({ _id: id, role: 'user' })
      .select('-refreshTokens -passwordResetToken -passwordResetExpires')
      .lean();

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Get order stats
    const orderStats = await Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        ...customer,
        orderStats: orderStats[0] || { totalOrders: 0, totalSpent: 0 },
      },
    });
  })
);

// Update customer (super admin only)
router.patch(
  '/customers/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { firstName, lastName, email, phone, password, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid customer ID');
    }

    const customer = await User.findOne({ _id: id, role: 'user' });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Check email uniqueness if changing
    if (email && email !== customer.email) {
      const existing = await User.findOne({ email, _id: { $ne: id } });
      if (existing) {
        throw new BadRequestError('Email already in use');
      }
    }

    const oldData = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      isActive: customer.isActive,
    };

    if (firstName !== undefined) customer.firstName = firstName;
    if (lastName !== undefined) customer.lastName = lastName;
    if (email !== undefined) customer.email = email;
    if (phone !== undefined) customer.phone = phone;
    if (password) customer.password = password;
    if (isActive !== undefined) customer.isActive = isActive;

    await customer.save();

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'update',
      resource: 'customer',
      resourceId: customer._id.toString(),
      oldValue: oldData,
      newValue: { firstName, lastName, email, phone, isActive },
    });

    res.json({
      success: true,
      data: customer,
    });
  })
);

// Toggle customer referral capability
router.patch(
  '/customers/:id/referral-status',
  authenticate,
  requireAdmin,
  requirePermission('orders', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { canRefer } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid customer ID');
    }

    const customer = await User.findOneAndUpdate(
      { _id: id, role: 'user' },
      { canRefer: Boolean(canRefer) },
      { new: true }
    ).select('email firstName lastName canRefer');

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    res.json({
      success: true,
      message: `Referral ${canRefer ? 'enabled' : 'disabled'} for ${customer.firstName} ${customer.lastName}`,
      data: customer,
    });
  })
);

// ========== AUDIT LOGS ==========

// Get audit logs
router.get(
  '/audit-logs',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 50, resource, action, userId, startDate, endDate, search } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (resource) query.resource = resource;
    if (action) query.action = action;
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId as string)) {
        throw new BadRequestError('Invalid user ID');
      }
      query.userId = new mongoose.Types.ObjectId(userId as string);
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'firstName lastName email role avatar')
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// ========== SETTINGS ==========

// Get settings
router.get(
  '/settings',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    let settings: any = await Settings.findOne().lean();

    if (!settings) {
      // Create default settings if none exist
      const newSettings = new Settings({});
      await newSettings.save();
      settings = newSettings.toObject();
    }

    // Hide sensitive fields for non-super admins
    if (req.user?.role !== 'super_admin') {
      const sensitiveFields = [
        'stripeSecretKey',
        'paypalSecret',
        'smtpPassword',
      ];
      sensitiveFields.forEach((field) => {
        if (settings && (settings as any)[field]) {
          (settings as any)[field] = '••••••••';
        }
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  })
);

// Update settings
router.patch(
  '/settings',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    // Don't update sensitive fields if they're masked
    const sensitiveFields = ['stripeSecretKey', 'paypalSecret', 'smtpPassword'];
    sensitiveFields.forEach((field) => {
      if (updates[field] === '••••••••') {
        delete updates[field];
      }
    });

    // Add updatedBy
    updates.updatedBy = req.userId;

    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings(updates);
    } else {
      Object.assign(settings, updates);
    }

    await settings.save();

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'update',
      resource: 'settings',
      resourceId: settings._id.toString(),
      newValue: Object.keys(updates).reduce((acc, key) => {
        if (!sensitiveFields.includes(key)) {
          acc[key] = updates[key];
        }
        return acc;
      }, {} as any),
    });

    res.json({
      success: true,
      data: settings,
    });
  })
);

// Test email configuration
router.post(
  '/settings/test-email',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError('Email address is required');
    }

    const settings = await Settings.findOne();

    if (!settings?.smtpHost || !settings?.smtpUser) {
      throw new BadRequestError('SMTP settings are not configured');
    }

    // Here you would typically send a test email
    // For now, we'll just return success
    // In a real implementation, you'd use nodemailer or similar

    res.json({
      success: true,
      message: `Test email would be sent to ${email}`,
    });
  })
);

// Upload logo
router.post(
  '/settings/upload-logo',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { logo, type } = req.body; // base64 or URL

    if (!logo) {
      throw new BadRequestError('Logo is required');
    }

    const updateField = type === 'favicon' ? 'favicon' : 'logo';

    const settings = await Settings.findOneAndUpdate(
      {},
      { [updateField]: logo, updatedBy: req.userId },
      { new: true, upsert: true }
    );

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'update',
      resource: 'settings',
      resourceId: settings._id.toString(),
      newValue: { [updateField]: 'uploaded' },
    });

    res.json({
      success: true,
      data: { [updateField]: settings[updateField] },
    });
  })
);

export default router;
