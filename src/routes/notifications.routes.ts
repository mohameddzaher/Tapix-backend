// ============================================
// Tapix API - Notification Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler, BadRequestError } from '../middleware/errorHandler';
import * as notificationService from '../services/notification.service';

const router = Router();

// Get user notifications
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;

    const result = await notificationService.getUserNotifications(req.userId!, {
      limit: Number(limit),
      offset: Number(offset),
      unreadOnly: unreadOnly === 'true',
    });

    res.json({
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        total: result.total,
      },
    });
  })
);

// Get unread count
router.get(
  '/unread-count',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await notificationService.getUserNotifications(req.userId!, {
      limit: 0,
      offset: 0,
    });

    res.json({
      success: true,
      data: { unreadCount: result.unreadCount },
    });
  })
);

// Mark notification as read
router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid notification ID');
    }

    const notification = await notificationService.markAsRead(req.userId!, id);

    if (!notification) {
      throw new BadRequestError('Notification not found');
    }

    res.json({
      success: true,
      data: notification,
    });
  })
);

// Mark all as read
router.patch(
  '/read-all',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await notificationService.markAllAsRead(req.userId!);

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
    });
  })
);

// Delete notification
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid notification ID');
    }

    const deleted = await notificationService.deleteNotification(req.userId!, id);

    if (!deleted) {
      throw new BadRequestError('Notification not found');
    }

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  })
);

// Clear all notifications
router.delete(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await notificationService.clearAllNotifications(req.userId!);

    res.json({
      success: true,
      message: `${count} notifications cleared`,
    });
  })
);

// Save push subscription
router.post(
  '/push-subscription',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { subscription } = req.body;

    if (!subscription?.endpoint || !subscription?.keys) {
      throw new BadRequestError('Invalid push subscription');
    }

    await notificationService.savePushSubscription(req.userId!, subscription);

    res.json({
      success: true,
      message: 'Push subscription saved',
    });
  })
);

// Remove push subscription
router.delete(
  '/push-subscription',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await notificationService.removePushSubscription(req.userId!);

    res.json({
      success: true,
      message: 'Push subscription removed',
    });
  })
);

export default router;
