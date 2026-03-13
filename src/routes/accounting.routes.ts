// ============================================
// Tapix API - Accounting Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Expense } from '../models/Expense';
import { Transaction } from '../models/Transaction';
import { Order } from '../models/Order';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// ========== DASHBOARD ==========

// GET /dashboard - Financial overview
router.get(
  '/dashboard',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = '30' } = req.query as any;
    const days = Number(period);

    if (![30, 60, 90, 365].includes(days)) {
      throw new BadRequestError('Period must be 30, 60, 90, or 365 days');
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);

    // Revenue in period (credit transactions from order_revenue)
    const revenueResult = await Transaction.aggregate([
      {
        $match: {
          type: 'credit',
          category: 'order_revenue',
          date: { $gte: periodStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    // Expenses in period (debit transactions)
    const expensesResult = await Transaction.aggregate([
      {
        $match: {
          type: 'debit',
          date: { $gte: periodStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const totalExpenses = expensesResult[0]?.total || 0;
    const netProfit = totalRevenue - totalExpenses;

    // Monthly breakdown for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Transaction.aggregate([
      {
        $match: {
          type: 'credit',
          category: 'order_revenue',
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthlyExpenses = await Transaction.aggregate([
      {
        $match: {
          type: 'debit',
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build monthly breakdown map
    const monthlyMap: Record<string, { revenue: number; expenses: number; profit: number }> = {};

    for (const entry of monthlyRevenue) {
      const key = `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { revenue: 0, expenses: 0, profit: 0 };
      }
      monthlyMap[key].revenue = entry.total;
    }

    for (const entry of monthlyExpenses) {
      const key = `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { revenue: 0, expenses: 0, profit: 0 };
      }
      monthlyMap[key].expenses = entry.total;
    }

    const monthlyBreakdown = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
      }));

    // Expense by category in period
    const expenseByCategory = await Transaction.aggregate([
      {
        $match: {
          type: 'debit',
          date: { $gte: periodStart },
        },
      },
      {
        $lookup: {
          from: 'expenses',
          localField: 'expenseId',
          foreignField: '_id',
          as: 'expense',
        },
      },
      { $unwind: { path: '$expense', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$expense.category', 'other'] },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Order counts
    const [pendingOrders, completedOrders] = await Promise.all([
      Order.countDocuments({
        status: { $in: ['new', 'accepted', 'in_progress', 'out_for_delivery'] },
      }),
      Order.countDocuments({ status: 'delivered' }),
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        netProfit,
        monthlyBreakdown,
        expenseByCategory: expenseByCategory.map((item) => ({
          category: item._id,
          total: item.total,
          count: item.count,
        })),
        pendingOrders,
        completedOrders,
      },
    });
  })
);

// ========== EXPENSES ==========

// GET /expenses - List expenses, paginated
router.get(
  '/expenses',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, category, startDate, endDate, search } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'firstName lastName')
        .lean(),
      Expense.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: expenses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// POST /expenses - Create expense
router.post(
  '/expenses',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { title, amount, category, date, description, receipt, isRecurring, recurringFrequency } = req.body;

    if (!title || amount == null || !category || !date) {
      throw new BadRequestError('Title, amount, category, and date are required');
    }

    if (amount < 0) {
      throw new BadRequestError('Amount must be a positive number');
    }

    const expense = await Expense.create({
      title,
      amount,
      category,
      date: new Date(date),
      description,
      receipt,
      isRecurring: isRecurring || false,
      recurringFrequency,
      createdBy: req.userId,
    });

    // Auto-create a debit transaction for this expense
    await Transaction.create({
      type: 'debit',
      amount,
      category: 'expense',
      description: `Expense: ${title}`,
      expenseId: expense._id,
      date: new Date(date),
      createdBy: req.userId,
    });

    res.status(201).json({
      success: true,
      data: expense,
    });
  })
);

// GET /expenses/:id - Get single expense
router.get(
  '/expenses/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid expense ID');
    }

    const expense = await Expense.findById(id)
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!expense) {
      throw new NotFoundError('Expense');
    }

    res.json({
      success: true,
      data: expense,
    });
  })
);

// PATCH /expenses/:id - Update expense
router.patch(
  '/expenses/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid expense ID');
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      throw new NotFoundError('Expense');
    }

    const { title, amount, category, date, description, receipt, isRecurring, recurringFrequency } = req.body;

    const oldAmount = expense.amount;

    // Update expense fields
    if (title !== undefined) expense.title = title;
    if (amount !== undefined) expense.amount = amount;
    if (category !== undefined) expense.category = category;
    if (date !== undefined) expense.date = new Date(date);
    if (description !== undefined) expense.description = description;
    if (receipt !== undefined) expense.receipt = receipt;
    if (isRecurring !== undefined) expense.isRecurring = isRecurring;
    if (recurringFrequency !== undefined) expense.recurringFrequency = recurringFrequency;

    await expense.save();

    // If amount changed, update the associated transaction
    if (amount !== undefined && amount !== oldAmount) {
      await Transaction.findOneAndUpdate(
        { expenseId: expense._id },
        {
          amount,
          ...(title !== undefined && { description: `Expense: ${title}` }),
          ...(date !== undefined && { date: new Date(date) }),
        }
      );
    } else if (title !== undefined || date !== undefined) {
      // Update transaction description/date even if amount didn't change
      await Transaction.findOneAndUpdate(
        { expenseId: expense._id },
        {
          ...(title !== undefined && { description: `Expense: ${title}` }),
          ...(date !== undefined && { date: new Date(date) }),
        }
      );
    }

    res.json({
      success: true,
      data: expense,
    });
  })
);

// DELETE /expenses/:id - Delete expense
router.delete(
  '/expenses/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid expense ID');
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      throw new NotFoundError('Expense');
    }

    // Delete associated transaction
    await Transaction.deleteOne({ expenseId: expense._id });

    // Delete the expense
    await Expense.findByIdAndDelete(id);

    res.json({
      success: true,
      data: { message: 'Expense deleted successfully' },
    });
  })
);

// ========== TRANSACTIONS ==========

// GET /transactions - Account ledger, paginated
router.get(
  '/transactions',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, type, category, startDate, endDate } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('orderId', 'orderNumber')
        .populate('expenseId', 'title')
        .populate('createdBy', 'firstName lastName')
        .lean(),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// POST /transactions - Manual transaction entry
router.post(
  '/transactions',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, amount, category, description, reference, date } = req.body;

    if (!type || amount == null || !category || !description) {
      throw new BadRequestError('Type, amount, category, and description are required');
    }

    if (!['credit', 'debit'].includes(type)) {
      throw new BadRequestError('Type must be credit or debit');
    }

    if (!['order_revenue', 'order_refund', 'expense', 'adjustment'].includes(category)) {
      throw new BadRequestError('Invalid transaction category');
    }

    if (amount < 0) {
      throw new BadRequestError('Amount must be a positive number');
    }

    const transaction = await Transaction.create({
      type,
      amount,
      category,
      description,
      reference,
      date: date ? new Date(date) : new Date(),
      createdBy: req.userId,
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  })
);

// ========== REPORTS ==========

// GET /reports - Financial reports
router.get(
  '/reports',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = 'monthly', year } = req.query as any;
    const reportYear = year ? Number(year) : new Date().getFullYear();

    if (!['monthly', 'quarterly', 'yearly'].includes(period)) {
      throw new BadRequestError('Period must be monthly, quarterly, or yearly');
    }

    const yearStart = new Date(reportYear, 0, 1);
    const yearEnd = new Date(reportYear + 1, 0, 1);

    if (period === 'monthly') {
      // Monthly P&L breakdown
      const [revenueByMonth, expensesByMonth] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              type: 'credit',
              category: 'order_revenue',
              date: { $gte: yearStart, $lt: yearEnd },
            },
          },
          {
            $group: {
              _id: { month: { $month: '$date' } },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.month': 1 } },
        ]),
        Transaction.aggregate([
          {
            $match: {
              type: 'debit',
              date: { $gte: yearStart, $lt: yearEnd },
            },
          },
          {
            $group: {
              _id: { month: { $month: '$date' } },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.month': 1 } },
        ]),
      ]);

      // Build 12-month report
      const months = [];
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      for (let m = 1; m <= 12; m++) {
        const rev = revenueByMonth.find((r) => r._id.month === m);
        const exp = expensesByMonth.find((e) => e._id.month === m);
        const revenue = rev?.total || 0;
        const expenses = exp?.total || 0;

        months.push({
          month: m,
          name: monthNames[m - 1],
          revenue,
          expenses,
          netProfit: revenue - expenses,
          revenueTransactions: rev?.count || 0,
          expenseTransactions: exp?.count || 0,
        });
      }

      const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0);
      const totalExpenses = months.reduce((sum, m) => sum + m.expenses, 0);

      res.json({
        success: true,
        data: {
          period: 'monthly',
          year: reportYear,
          months,
          summary: {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
          },
        },
      });
    } else if (period === 'quarterly') {
      // Quarterly P&L breakdown
      const [revenueByQuarter, expensesByQuarter] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              type: 'credit',
              category: 'order_revenue',
              date: { $gte: yearStart, $lt: yearEnd },
            },
          },
          {
            $group: {
              _id: {
                quarter: {
                  $ceil: { $divide: [{ $month: '$date' }, 3] },
                },
              },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.quarter': 1 } },
        ]),
        Transaction.aggregate([
          {
            $match: {
              type: 'debit',
              date: { $gte: yearStart, $lt: yearEnd },
            },
          },
          {
            $group: {
              _id: {
                quarter: {
                  $ceil: { $divide: [{ $month: '$date' }, 3] },
                },
              },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.quarter': 1 } },
        ]),
      ]);

      const quarters = [];

      for (let q = 1; q <= 4; q++) {
        const rev = revenueByQuarter.find((r) => r._id.quarter === q);
        const exp = expensesByQuarter.find((e) => e._id.quarter === q);
        const revenue = rev?.total || 0;
        const expenses = exp?.total || 0;

        quarters.push({
          quarter: q,
          name: `Q${q}`,
          revenue,
          expenses,
          netProfit: revenue - expenses,
          revenueTransactions: rev?.count || 0,
          expenseTransactions: exp?.count || 0,
        });
      }

      const totalRevenue = quarters.reduce((sum, q) => sum + q.revenue, 0);
      const totalExpenses = quarters.reduce((sum, q) => sum + q.expenses, 0);

      res.json({
        success: true,
        data: {
          period: 'quarterly',
          year: reportYear,
          quarters,
          summary: {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
          },
        },
      });
    } else {
      // Yearly summary
      const [revenueResult, expensesResult] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              type: 'credit',
              category: 'order_revenue',
              date: { $gte: yearStart, $lt: yearEnd },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ]),
        Transaction.aggregate([
          {
            $match: {
              type: 'debit',
              date: { $gte: yearStart, $lt: yearEnd },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      // Expense breakdown by category for the year
      const expenseBreakdown = await Expense.aggregate([
        {
          $match: {
            date: { $gte: yearStart, $lt: yearEnd },
          },
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]);

      const totalRevenue = revenueResult[0]?.total || 0;
      const totalExpenses = expensesResult[0]?.total || 0;

      res.json({
        success: true,
        data: {
          period: 'yearly',
          year: reportYear,
          summary: {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            revenueTransactions: revenueResult[0]?.count || 0,
            expenseTransactions: expensesResult[0]?.count || 0,
          },
          expenseBreakdown: expenseBreakdown.map((item) => ({
            category: item._id,
            total: item.total,
            count: item.count,
          })),
        },
      });
    }
  })
);

// ========== BACKFILL ==========

// POST /backfill - Create transactions from existing orders that don't have them
router.post(
  '/backfill',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Find all non-cancelled orders
    const orders = await Order.find({
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: 1 }).lean();

    let created = 0;
    let skipped = 0;

    for (const order of orders) {
      // Check if transaction already exists for this order
      const existing = await Transaction.findOne({
        orderId: order._id,
        category: 'order_revenue',
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create revenue transaction
      await Transaction.create({
        type: 'credit',
        amount: order.total,
        category: 'order_revenue',
        description: `Revenue from order ${order.orderNumber}`,
        reference: order.orderNumber,
        orderId: order._id,
        date: order.createdAt,
        createdBy: req.userId,
      });

      created++;
    }

    // Also handle cancelled orders that might need refund transactions
    const cancelledOrders = await Order.find({ status: 'cancelled' }).lean();
    let refundsCreated = 0;

    for (const order of cancelledOrders) {
      const existingRefund = await Transaction.findOne({
        orderId: order._id,
        category: 'order_refund',
      });

      if (existingRefund) continue;

      // Check if there was a revenue transaction (meaning order was created then cancelled)
      const existingRevenue = await Transaction.findOne({
        orderId: order._id,
        category: 'order_revenue',
      });

      if (!existingRevenue) {
        // No revenue was ever recorded, skip
        continue;
      }

      await Transaction.create({
        type: 'debit',
        amount: order.total,
        category: 'order_refund',
        description: `Refund for cancelled order ${order.orderNumber}`,
        reference: order.orderNumber,
        orderId: order._id,
        date: (order as any).cancelledAt || order.updatedAt,
        createdBy: req.userId,
      });

      refundsCreated++;
    }

    res.json({
      success: true,
      data: {
        message: 'Backfill completed',
        transactionsCreated: created,
        refundsCreated,
        skipped,
        totalOrdersProcessed: orders.length + cancelledOrders.length,
      },
    });
  })
);

export default router;
