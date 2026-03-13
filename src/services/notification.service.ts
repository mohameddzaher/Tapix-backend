// ============================================
// Tapix API - Notification Service
// ============================================

import webPush from 'web-push';
import { config } from '../config';
import { Notification, INotification } from '../models/Notification';
import { User, IUser } from '../models/User';
import { Settings } from '../models/Settings';

// Configure web-push (only if valid VAPID keys are provided)
const isValidVapidKey = (key: string): boolean => {
  // VAPID keys should be base64 encoded and not placeholder values
  return Boolean(key && key.length > 30 && !key.includes('your-') && !key.includes('placeholder'));
};

if (isValidVapidKey(config.vapid.publicKey) && isValidVapidKey(config.vapid.privateKey)) {
  try {
    webPush.setVapidDetails(
      config.vapid.subject,
      config.vapid.publicKey,
      config.vapid.privateKey
    );
  } catch (error) {
    console.warn('Web push notifications disabled: Invalid VAPID keys');
  }
}

interface NotificationData {
  type: INotification['type'];
  title: string;
  message: string;
  data?: Record<string, any>;
}

// Create in-app notification
export const createNotification = async (
  userId: string,
  notification: NotificationData
): Promise<INotification> => {
  return Notification.create({
    userId,
    ...notification,
  });
};

// Create notifications for multiple users
export const createNotificationsForUsers = async (
  userIds: string[],
  notification: NotificationData
): Promise<void> => {
  const notifications = userIds.map((userId) => ({
    userId,
    ...notification,
  }));

  await Notification.insertMany(notifications);
};

// Get user notifications
export const getUserNotifications = async (
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<{ notifications: INotification[]; unreadCount: number; total: number }> => {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  const query: any = { userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const [notifications, unreadCount, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId, isRead: false }),
    Notification.countDocuments(query),
  ]);

  return { notifications: notifications as unknown as INotification[], unreadCount, total };
};

// Mark notification as read
export const markAsRead = async (
  userId: string,
  notificationId: string
): Promise<INotification | null> => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

// Mark all notifications as read
export const markAllAsRead = async (userId: string): Promise<number> => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result.modifiedCount;
};

// Delete notification
export const deleteNotification = async (
  userId: string,
  notificationId: string
): Promise<boolean> => {
  const result = await Notification.deleteOne({ _id: notificationId, userId });
  return result.deletedCount > 0;
};

// Clear all notifications
export const clearAllNotifications = async (userId: string): Promise<number> => {
  const result = await Notification.deleteMany({ userId });
  return result.deletedCount;
};

// Send web push notification
export const sendPushNotification = async (
  user: IUser,
  notification: NotificationData
): Promise<boolean> => {
  if (!user.pushSubscription?.endpoint) {
    return false;
  }

  try {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: notification.data,
      tag: notification.type,
    });

    await webPush.sendNotification(user.pushSubscription as any, payload);
    return true;
  } catch (error: any) {
    // Remove invalid subscription
    if (error.statusCode === 410 || error.statusCode === 404) {
      await User.findByIdAndUpdate(user._id, { $unset: { pushSubscription: 1 } });
    }
    console.error('Push notification error:', error);
    return false;
  }
};

// Notify admins of new order
export const notifyAdminsNewOrder = async (
  orderNumber: string,
  total: number,
  customerName: string,
  orderId?: string
): Promise<void> => {
  // Get all admins and super admins
  const admins = await User.find({
    role: { $in: ['admin', 'super_admin'] },
    isActive: true,
  });

  // Get currency from settings
  const settings = await (Settings as any).getSettings();
  const currency = settings?.currency || 'SAR';

  const notification: NotificationData = {
    type: 'order_new',
    title: 'New Order Received',
    message: `Order ${orderNumber} from ${customerName} - ${currency} ${total.toFixed(2)}`,
    data: { orderNumber, ...(orderId && { orderId }) },
  };

  // Create in-app notifications
  await createNotificationsForUsers(
    admins.map((a) => a._id.toString()),
    notification
  );

  // Send push notifications
  for (const admin of admins) {
    if (admin.pushSubscription) {
      await sendPushNotification(admin, notification);
    }
  }
};

// Notify user of order status change
export const notifyOrderStatusChange = async (
  userId: string,
  orderNumber: string,
  newStatus: string,
  statusLabel: string
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) return;

  const notification: NotificationData = {
    type: 'order_status',
    title: 'Order Status Updated',
    message: `Your order ${orderNumber} is now: ${statusLabel}`,
    data: { orderNumber, status: newStatus },
  };

  await createNotification(userId, notification);

  if (user.pushSubscription) {
    await sendPushNotification(user, notification);
  }
};

// Notify admins of new review
export const notifyAdminsNewReview = async (
  productTitle: string,
  rating: number,
  reviewerName: string
): Promise<void> => {
  const admins = await User.find({
    role: { $in: ['admin', 'super_admin'] },
    isActive: true,
    $or: [
      { role: 'super_admin' },
      { 'permissions.reviews.moderate': true },
    ],
  });

  const notification: NotificationData = {
    type: 'review_new',
    title: 'New Review Pending',
    message: `${reviewerName} left a ${rating}-star review on "${productTitle}"`,
    data: { productTitle, rating },
  };

  await createNotificationsForUsers(
    admins.map((a) => a._id.toString()),
    notification
  );
};

// Notify admins of low stock
export const notifyAdminsLowStock = async (
  productTitle: string,
  sku: string,
  currentStock: number
): Promise<void> => {
  const admins = await User.find({
    role: { $in: ['admin', 'super_admin'] },
    isActive: true,
    $or: [
      { role: 'super_admin' },
      { 'permissions.products.read': true },
    ],
  });

  const notification: NotificationData = {
    type: 'stock_low',
    title: 'Low Stock Alert',
    message: `"${productTitle}" (${sku}) has only ${currentStock} items left`,
    data: { productTitle, sku, currentStock },
  };

  await createNotificationsForUsers(
    admins.map((a) => a._id.toString()),
    notification
  );
};

// Save push subscription
export const savePushSubscription = async (
  userId: string,
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
): Promise<boolean> => {
  const result = await User.findByIdAndUpdate(userId, {
    pushSubscription: subscription,
  });
  return !!result;
};

// Remove push subscription
export const removePushSubscription = async (userId: string): Promise<boolean> => {
  const result = await User.findByIdAndUpdate(userId, {
    $unset: { pushSubscription: 1 },
  });
  return !!result;
};
