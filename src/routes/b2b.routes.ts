// ============================================
// Tapix API - B2B Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { B2BProduct } from '../models/B2BProduct';
import { B2BSupplier } from '../models/B2BSupplier';
import { B2BClient } from '../models/B2BClient';
import { B2BSale } from '../models/B2BSale';
import { B2BExpense } from '../models/B2BExpense';
import { AuditLog } from '../models/AuditLog';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// All B2B routes require admin auth
router.use(authenticate, requireAdmin);

// ========================================
// DASHBOARD
// ========================================

router.get(
  '/dashboard',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = 30 } = req.query;
    const days = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const [
      totalProducts,
      totalClients,
      totalSuppliers,
      currentSales,
      prevSales,
      currentExpenses,
      prevExpenses,
      topProducts,
      topClients,
      recentSales,
      expensesByCategory,
      salesByMonth,
      lowStockProducts,
      inventoryValue,
    ] = await Promise.all([
      B2BProduct.countDocuments({ isActive: true }),
      B2BClient.countDocuments({ isActive: true }),
      B2BSupplier.countDocuments({ isActive: true }),
      // Current period sales
      B2BSale.aggregate([
        { $match: { saleDate: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalCost: { $sum: '$totalCost' },
            totalProfit: { $sum: '$profit' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Previous period sales
      B2BSale.aggregate([
        { $match: { saleDate: { $gte: prevStartDate, $lt: startDate } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalProfit: { $sum: '$profit' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Current period expenses
      B2BExpense.aggregate([
        { $match: { date: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Previous period expenses
      B2BExpense.aggregate([
        { $match: { date: { $gte: prevStartDate, $lt: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Top selling products
      B2BSale.aggregate([
        { $match: { saleDate: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.productName' },
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.totalPrice' },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]),
      // Top clients
      B2BSale.aggregate([
        { $match: { saleDate: { $gte: startDate } } },
        {
          $group: {
            _id: '$clientId',
            totalSpent: { $sum: '$total' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'b2bclients',
            localField: '_id',
            foreignField: '_id',
            as: 'client',
          },
        },
        { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: '$client.name',
            companyName: '$client.companyName',
            totalSpent: 1,
            orderCount: 1,
          },
        },
      ]),
      // Recent sales
      B2BSale.find()
        .sort({ saleDate: -1 })
        .limit(10)
        .populate('clientId', 'name companyName')
        .lean(),
      // Expenses by category
      B2BExpense.aggregate([
        { $match: { date: { $gte: startDate } } },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
          },
        },
        { $sort: { total: -1 } },
      ]),
      // Sales by month (last 6 months)
      B2BSale.aggregate([
        {
          $match: {
            saleDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$saleDate' },
              month: { $month: '$saleDate' },
            },
            revenue: { $sum: '$total' },
            cost: { $sum: '$totalCost' },
            profit: { $sum: '$profit' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      // Low stock products (less than 5)
      B2BProduct.find({ isActive: true, quantity: { $lte: 5 } })
        .select('name quantity costPerUnit')
        .sort({ quantity: 1 })
        .limit(10)
        .lean(),
      // Total inventory value
      B2BProduct.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ['$costPerUnit', '$quantity'] } },
            totalItems: { $sum: '$quantity' },
          },
        },
      ]),
    ]);

    const curr = currentSales[0] || { totalRevenue: 0, totalCost: 0, totalProfit: 0, count: 0 };
    const prev = prevSales[0] || { totalRevenue: 0, totalProfit: 0, count: 0 };
    const currExp = currentExpenses[0]?.total || 0;
    const prevExp = prevExpenses[0]?.total || 0;
    const inv = inventoryValue[0] || { totalValue: 0, totalItems: 0 };

    const revenueChange = prev.totalRevenue > 0
      ? Math.round(((curr.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100)
      : curr.totalRevenue > 0 ? 100 : 0;

    const profitChange = prev.totalProfit > 0
      ? Math.round(((curr.totalProfit - prev.totalProfit) / prev.totalProfit) * 100)
      : curr.totalProfit > 0 ? 100 : 0;

    const expenseChange = prevExp > 0
      ? Math.round(((currExp - prevExp) / prevExp) * 100)
      : currExp > 0 ? 100 : 0;

    // Net profit = sales profit - expenses
    const netProfit = curr.totalProfit - currExp;

    res.json({
      success: true,
      data: {
        stats: {
          totalRevenue: curr.totalRevenue,
          revenueChange,
          totalProfit: curr.totalProfit,
          profitChange,
          netProfit,
          totalCost: curr.totalCost,
          totalExpenses: currExp,
          expenseChange,
          totalSales: curr.count,
          totalProducts,
          totalClients,
          totalSuppliers,
          inventoryValue: inv.totalValue,
          inventoryItems: inv.totalItems,
        },
        topProducts,
        topClients,
        recentSales: recentSales.map((s: any) => ({
          _id: s._id,
          invoiceNumber: s.invoiceNumber,
          client: s.clientId ? { name: s.clientId.name, companyName: s.clientId.companyName } : null,
          total: s.total,
          profit: s.profit,
          paymentStatus: s.paymentStatus,
          saleDate: s.saleDate,
        })),
        expensesByCategory,
        salesByMonth: salesByMonth.map((s: any) => ({
          month: `${s._id.year}-${String(s._id.month).padStart(2, '0')}`,
          revenue: s.revenue,
          cost: s.cost,
          profit: s.profit,
          count: s.count,
        })),
        lowStockProducts,
      },
    });
  })
);

// ========================================
// PRODUCTS
// ========================================

// Get all products
router.get(
  '/products',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, search, supplier, sort = '-createdAt' } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }
    if (supplier) query.supplierId = supplier;

    const sortObj: any = {};
    if (sort.startsWith('-')) {
      sortObj[sort.slice(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const [products, total] = await Promise.all([
      B2BProduct.find(query)
        .populate('supplierId', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      B2BProduct.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get single product
router.get(
  '/products/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await B2BProduct.findById(req.params.id)
      .populate('supplierId', 'name phone email')
      .lean();
    if (!product) throw new NotFoundError('Product');
    res.json({ success: true, data: product });
  })
);

// Create product
router.post(
  '/products',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await B2BProduct.create({
      ...req.body,
      createdBy: req.userId,
    });

    // Update supplier total purchases
    if (product.supplierId) {
      await B2BSupplier.findByIdAndUpdate(product.supplierId, {
        $inc: {
          totalPurchases: 1,
          totalAmountPaid: product.totalCost || (product.costPerUnit * product.quantity),
        },
      });
    }

    await AuditLog.create({
      userId: req.userId,
      action: 'create',
      resource: 'b2b_product',
      resourceId: product._id.toString(),
      newValue: { name: product.name },
    });

    res.status(201).json({ success: true, data: product });
  })
);

// Update product
router.patch(
  '/products/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await B2BProduct.findById(req.params.id);
    if (!product) throw new NotFoundError('Product');

    const oldData = { name: product.name, quantity: product.quantity, costPerUnit: product.costPerUnit };
    Object.assign(product, req.body);
    await product.save();

    await AuditLog.create({
      userId: req.userId,
      action: 'update',
      resource: 'b2b_product',
      resourceId: product._id.toString(),
      oldValue: oldData,
      newValue: req.body,
    });

    res.json({ success: true, data: product });
  })
);

// Delete product
router.delete(
  '/products/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await B2BProduct.findByIdAndDelete(req.params.id);
    if (!product) throw new NotFoundError('Product');

    await AuditLog.create({
      userId: req.userId,
      action: 'delete',
      resource: 'b2b_product',
      resourceId: req.params.id,
    });

    res.json({ success: true, message: 'Product deleted' });
  })
);

// ========================================
// SUPPLIERS
// ========================================

router.get(
  '/suppliers',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, search } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      B2BSupplier.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      B2BSupplier.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: suppliers,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  })
);

// Get all suppliers (no pagination, for dropdowns)
router.get(
  '/suppliers/all',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const suppliers = await B2BSupplier.find({ isActive: true }).select('name').sort({ name: 1 }).lean();
    res.json({ success: true, data: suppliers });
  })
);

router.get(
  '/suppliers/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const supplier = await B2BSupplier.findById(req.params.id).lean();
    if (!supplier) throw new NotFoundError('Supplier');

    // Get products from this supplier
    const products = await B2BProduct.find({ supplierId: req.params.id })
      .select('name quantity costPerUnit totalCost createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: { ...supplier, products } });
  })
);

router.post(
  '/suppliers',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const supplier = await B2BSupplier.create({ ...req.body, createdBy: req.userId });
    res.status(201).json({ success: true, data: supplier });
  })
);

router.patch(
  '/suppliers/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const supplier = await B2BSupplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) throw new NotFoundError('Supplier');
    res.json({ success: true, data: supplier });
  })
);

router.delete(
  '/suppliers/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const supplier = await B2BSupplier.findByIdAndDelete(req.params.id);
    if (!supplier) throw new NotFoundError('Supplier');
    res.json({ success: true, message: 'Supplier deleted' });
  })
);

// ========================================
// CLIENTS
// ========================================

router.get(
  '/clients',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, search } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [clients, total] = await Promise.all([
      B2BClient.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      B2BClient.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: clients,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  })
);

// Get all clients (no pagination, for dropdowns)
router.get(
  '/clients/all',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const clients = await B2BClient.find({ isActive: true }).select('name companyName phone').sort({ name: 1 }).lean();
    res.json({ success: true, data: clients });
  })
);

router.get(
  '/clients/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const client = await B2BClient.findById(req.params.id).lean();
    if (!client) throw new NotFoundError('Client');

    // Get sales for this client
    const sales = await B2BSale.find({ clientId: req.params.id })
      .select('invoiceNumber total profit paymentStatus saleDate items')
      .sort({ saleDate: -1 })
      .lean();

    res.json({ success: true, data: { ...client, sales } });
  })
);

router.post(
  '/clients',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const client = await B2BClient.create({ ...req.body, createdBy: req.userId });
    res.status(201).json({ success: true, data: client });
  })
);

router.patch(
  '/clients/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const client = await B2BClient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) throw new NotFoundError('Client');
    res.json({ success: true, data: client });
  })
);

router.delete(
  '/clients/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const client = await B2BClient.findByIdAndDelete(req.params.id);
    if (!client) throw new NotFoundError('Client');
    res.json({ success: true, message: 'Client deleted' });
  })
);

// ========================================
// SALES
// ========================================

router.get(
  '/sales',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, search, client, paymentStatus, startDate, endDate } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (client) query.clientId = client;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.saleDate.$lte = end;
      }
    }

    const [sales, total] = await Promise.all([
      B2BSale.find(query)
        .populate('clientId', 'name companyName phone')
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      B2BSale.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  })
);

router.get(
  '/sales/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sale = await B2BSale.findById(req.params.id)
      .populate('clientId')
      .populate('createdBy', 'firstName lastName')
      .lean();
    if (!sale) throw new NotFoundError('Sale');
    res.json({ success: true, data: sale });
  })
);

// Create sale
router.post(
  '/sales',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { clientId, items, discount, taxRate, paymentStatus, paymentMethod, amountPaid, notes, saleDate } = req.body;

    if (!items || items.length === 0) {
      throw new BadRequestError('At least one item is required');
    }

    // Get product details and validate stock
    const productIds = items.map((item: any) => item.productId);
    const products = await B2BProduct.find({ _id: { $in: productIds } });

    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const saleItems = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestError(`Product ${item.productId} not found`);
      if (product.quantity < item.quantity) {
        throw new BadRequestError(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
      }

      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit || product.offlinePrice || product.onlinePrice || product.costPerUnit,
        totalPrice: item.quantity * (item.pricePerUnit || product.offlinePrice || product.onlinePrice || product.costPerUnit),
        costPerUnit: product.costPerUnit,
      };
    });

    const sale = new B2BSale({
      clientId,
      items: saleItems,
      discount: discount || 0,
      taxRate: taxRate !== undefined ? taxRate : 15,
      paymentStatus: paymentStatus || 'unpaid',
      paymentMethod,
      amountPaid: amountPaid || 0,
      notes,
      saleDate: saleDate || new Date(),
      createdBy: req.userId,
    });

    await sale.save();

    // Update product quantities (decrease stock)
    for (const item of saleItems) {
      await B2BProduct.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantity },
      });
    }

    // Update client totals
    await B2BClient.findByIdAndUpdate(clientId, {
      $inc: {
        totalOrders: 1,
        totalSpent: sale.total,
      },
    });

    // Populate for response
    const populated = await B2BSale.findById(sale._id)
      .populate('clientId', 'name companyName phone email address city')
      .lean();

    res.status(201).json({ success: true, data: populated });
  })
);

// Update sale payment status
router.patch(
  '/sales/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sale = await B2BSale.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('clientId', 'name companyName phone');
    if (!sale) throw new NotFoundError('Sale');
    res.json({ success: true, data: sale });
  })
);

// Delete sale (and restore stock)
router.delete(
  '/sales/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sale = await B2BSale.findById(req.params.id);
    if (!sale) throw new NotFoundError('Sale');

    // Restore stock
    for (const item of sale.items) {
      await B2BProduct.findByIdAndUpdate(item.productId, {
        $inc: { quantity: item.quantity },
      });
    }

    // Update client totals
    await B2BClient.findByIdAndUpdate(sale.clientId, {
      $inc: {
        totalOrders: -1,
        totalSpent: -sale.total,
      },
    });

    await sale.deleteOne();
    res.json({ success: true, message: 'Sale deleted and stock restored' });
  })
);

// Get invoice data for a sale
router.get(
  '/sales/:id/invoice',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sale = await B2BSale.findById(req.params.id)
      .populate('clientId')
      .populate('createdBy', 'firstName lastName')
      .lean();
    if (!sale) throw new NotFoundError('Sale');

    res.json({
      success: true,
      data: {
        sale,
        company: {
          name: 'Tapix',
          nameAr: 'تابكس',
          address: 'Jeddah, Saudi Arabia',
          phone: '+966 XXX XXX XXXX',
          email: 'contact@tapix.com',
          crNumber: '4030580025',
          vatNumber: '',
        },
      },
    });
  })
);

// ========================================
// EXPENSES
// ========================================

router.get(
  '/expenses',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, category, startDate, endDate } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const [expenses, total, totalAmount] = await Promise.all([
      B2BExpense.find(query).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
      B2BExpense.countDocuments(query),
      B2BExpense.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: expenses,
      totalAmount: totalAmount[0]?.total || 0,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  })
);

router.get(
  '/expenses/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await B2BExpense.findById(req.params.id).lean();
    if (!expense) throw new NotFoundError('Expense');
    res.json({ success: true, data: expense });
  })
);

router.post(
  '/expenses',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await B2BExpense.create({ ...req.body, createdBy: req.userId });
    res.status(201).json({ success: true, data: expense });
  })
);

router.patch(
  '/expenses/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await B2BExpense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) throw new NotFoundError('Expense');
    res.json({ success: true, data: expense });
  })
);

router.delete(
  '/expenses/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await B2BExpense.findByIdAndDelete(req.params.id);
    if (!expense) throw new NotFoundError('Expense');
    res.json({ success: true, message: 'Expense deleted' });
  })
);

export default router;
