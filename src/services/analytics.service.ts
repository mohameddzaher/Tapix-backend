// ============================================
// Tapix API - Analytics Service
// ============================================

import { Order } from '../models/Order';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Review } from '../models/Review';

interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  totalAdmins: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  pendingOrders: number;
  newOrders: number;
  inProgressOrders: number;
  outForDelivery: number;
  todayOrders: number;
  todayRevenue: number;
  conversionRate: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingReviews: number;
  ordersChange: number;
  revenueChange: number;
}

interface SalesData {
  period: string;
  orders: number;
  revenue: number;
}

interface TopProduct {
  productId: string;
  title: string;
  image?: string;
  soldCount: number;
  revenue: number;
}

interface TopCategory {
  categoryId: string;
  name: string;
  soldCount: number;
  revenue: number;
}

interface OrderStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

// Get dashboard statistics
export const getDashboardStats = async (fullAccess = false): Promise<DashboardStats> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate date ranges for change percentages
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [
    totalUsers,
    totalAdmins,
    orderStats,
    todayStats,
    totalProducts,
    lowStockProducts,
    pendingReviews,
    currentPeriodStats,
    previousPeriodStats,
  ] = await Promise.all([
    User.countDocuments({ role: 'user', isActive: true }),
    User.countDocuments({ role: { $in: ['admin', 'super_admin'] }, isActive: true }),
    Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          pendingOrders: {
            $sum: { $cond: [{ $in: ['$status', ['new', 'pending']] }, 1, 0] },
          },
          newOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] },
          },
          inProgressOrders: {
            $sum: { $cond: [{ $in: ['$status', ['accepted', 'in_progress', 'processing']] }, 1, 0] },
          },
          outForDelivery: {
            $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] },
          },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          status: { $ne: 'cancelled' },
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
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    }),
    Review.countDocuments({ status: 'pending' }),
    // Current 30-day period
    Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]),
    // Previous 30-day period
    Order.aggregate([
      { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]),
  ]);

  const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, newOrders: 0, inProgressOrders: 0, outForDelivery: 0 };
  const today_stats = todayStats[0] || { count: 0, revenue: 0 };
  const current = currentPeriodStats[0] || { orders: 0, revenue: 0 };
  const previous = previousPeriodStats[0] || { orders: 0, revenue: 0 };

  const ordersChange = previous.orders > 0
    ? Math.round(((current.orders - previous.orders) / previous.orders) * 100)
    : current.orders > 0 ? 100 : 0;
  const revenueChange = previous.revenue > 0
    ? Math.round(((current.revenue - previous.revenue) / previous.revenue) * 100)
    : current.revenue > 0 ? 100 : 0;

  const result: DashboardStats = {
    totalUsers,
    totalCustomers: totalUsers,
    totalAdmins,
    totalOrders: stats.totalOrders,
    totalRevenue: fullAccess ? stats.totalRevenue : 0,
    averageOrderValue: stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0,
    pendingOrders: stats.pendingOrders,
    newOrders: stats.newOrders,
    inProgressOrders: stats.inProgressOrders,
    outForDelivery: stats.outForDelivery,
    todayOrders: today_stats.count,
    todayRevenue: fullAccess ? today_stats.revenue : 0,
    conversionRate: 0,
    totalProducts,
    lowStockProducts,
    pendingReviews,
    ordersChange,
    revenueChange,
  };

  return result;
};

// Get sales analytics over time
export const getSalesAnalytics = async (
  period: 'day' | 'week' | 'month' = 'day',
  days = 30
): Promise<SalesData[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  let dateFormat: string;
  let groupId: any;

  switch (period) {
    case 'week':
      dateFormat = '%Y-W%V';
      groupId = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' },
      };
      break;
    case 'month':
      dateFormat = '%Y-%m';
      groupId = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
      break;
    default:
      dateFormat = '%Y-%m-%d';
      groupId = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
  }

  const results = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $nin: ['cancelled', 'failed'] },
      },
    },
    {
      $group: {
        _id: groupId,
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
        date: { $first: '$createdAt' },
      },
    },
    {
      $sort: { date: 1 },
    },
    {
      $project: {
        _id: 0,
        period: { $dateToString: { format: dateFormat, date: '$date' } },
        orders: 1,
        revenue: 1,
      },
    },
  ]);

  return results;
};

// Get top selling products
export const getTopProducts = async (limit = 10): Promise<TopProduct[]> => {
  const results = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        title: { $first: '$items.title' },
        image: { $first: '$items.image' },
        soldCount: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { soldCount: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        productId: '$_id',
        title: 1,
        image: 1,
        soldCount: 1,
        revenue: 1,
      },
    },
  ]);

  return results;
};

// Get top categories
export const getTopCategories = async (limit = 10): Promise<TopCategory[]> => {
  const results = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
      },
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$category._id',
        name: { $first: '$category.name' },
        soldCount: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        categoryId: '$_id',
        name: 1,
        soldCount: 1,
        revenue: 1,
      },
    },
  ]);

  return results;
};

// Get order status distribution
export const getOrderStatusDistribution = async (): Promise<OrderStatusDistribution[]> => {
  const results = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const total = results.reduce((sum, r) => sum + r.count, 0);

  return results.map((r) => ({
    status: r._id,
    count: r.count,
    percentage: total > 0 ? (r.count / total) * 100 : 0,
  }));
};

// Get recent orders count by day for chart
export const getRecentOrdersCount = async (days = 7): Promise<{ date: string; count: number }[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const results = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        count: { $sum: 1 },
        date: { $first: '$createdAt' },
      },
    },
    {
      $sort: { date: 1 },
    },
    {
      $project: {
        _id: 0,
        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        count: 1,
      },
    },
  ]);

  return results;
};

// Get products sold today
export const getProductsSoldToday = async (): Promise<number> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: today },
        status: { $nin: ['cancelled', 'failed'] },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: null,
        total: { $sum: '$items.quantity' },
      },
    },
  ]);

  return result[0]?.total || 0;
};

// Get revenue comparison (this month vs last month)
export const getRevenueComparison = async (): Promise<{
  thisMonth: number;
  lastMonth: number;
  percentageChange: number;
}> => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [thisMonth, lastMonth] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thisMonthStart },
          status: { $nin: ['cancelled', 'failed'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
          status: { $nin: ['cancelled', 'failed'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]),
  ]);

  const thisMonthRevenue = thisMonth[0]?.total || 0;
  const lastMonthRevenue = lastMonth[0]?.total || 0;

  const percentageChange =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0
      ? 100
      : 0;

  return {
    thisMonth: thisMonthRevenue,
    lastMonth: lastMonthRevenue,
    percentageChange,
  };
};
