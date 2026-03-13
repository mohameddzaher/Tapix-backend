// ============================================
// Tapix API - Banner Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { createBannerSchema, updateBannerSchema } from '@tapix/shared';
import { Banner } from '../models/Banner';
import { AuditLog } from '../models/AuditLog';
import { authenticate, requireAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Get active banners by position (public)
router.get(
  '/position/:position',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { position } = req.params;
    const now = new Date();

    const banners = await Banner.find({
      position,
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
      ],
    })
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: banners,
    });
  })
);

// Get all active banners (public)
router.get(
  '/active',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const now = new Date();

    const banners = await Banner.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
      ],
    })
      .sort({ position: 1, order: 1 })
      .lean();

    // Group by position
    const grouped = banners.reduce((acc: any, banner) => {
      if (!acc[banner.position]) {
        acc[banner.position] = [];
      }
      acc[banner.position].push(banner);
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped,
    });
  })
);

// ========== ADMIN ROUTES ==========

// Get all banners (admin)
router.get(
  '/',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const banners = await Banner.find().sort({ position: 1, order: 1 }).lean();

    res.json({
      success: true,
      data: banners,
    });
  })
);

// Get banner by ID
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid banner ID');
    }

    const banner = await Banner.findById(id).lean();

    if (!banner) {
      throw new NotFoundError('Banner');
    }

    res.json({
      success: true,
      data: banner,
    });
  })
);

// Create banner
router.post(
  '/',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  validate(createBannerSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;

    const banner = await Banner.create(data);

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'create',
      resource: 'banner',
      resourceId: banner._id.toString(),
      newValue: { title: banner.title, position: banner.position, isActive: banner.isActive },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: banner,
    });
  })
);

// Update banner
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  validate(updateBannerSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid banner ID');
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new NotFoundError('Banner');
    }

    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const oldVal = (banner as any)[key];
      const newVal = data[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        oldValues[key] = oldVal;
        newValues[key] = newVal;
      }
    }

    Object.assign(banner, data);
    await banner.save();

    // Log audit
    if (Object.keys(newValues).length > 0) {
      await AuditLog.create({
        userId: req.userId,
        action: 'update',
        resource: 'banner',
        resourceId: banner._id.toString(),
        oldValue: { ...oldValues, title: banner.title },
        newValue: { ...newValues, title: banner.title },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    res.json({
      success: true,
      data: banner,
    });
  })
);

// Delete banner
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid banner ID');
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new NotFoundError('Banner');
    }

    const bannerData = { title: banner.title, position: banner.position };
    await banner.deleteOne();

    // Log audit
    await AuditLog.create({
      userId: req.userId,
      action: 'delete',
      resource: 'banner',
      resourceId: id,
      oldValue: bannerData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Banner deleted',
    });
  })
);

// Reorder banners
router.post(
  '/reorder',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
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

    await Banner.bulkWrite(operations);

    res.json({
      success: true,
      message: 'Banners reordered',
    });
  })
);

export default router;
