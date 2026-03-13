// ============================================
// Tapix API - Testimonial Routes
// Site-wide customer testimonials
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Testimonial } from '../models/Testimonial';
import { authenticate, requireAdmin, requireSuperAdmin, AuthRequest, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const createTestimonialSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().min(10).max(2000),
});

const updateTestimonialSchema = z.object({
  customerName: z.string().min(2).max(100).optional(),
  customerEmail: z.string().email().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  content: z.string().min(10).max(2000).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  isFeatured: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const moderateTestimonialSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

// ========== PUBLIC ROUTES ==========

// Get approved testimonials for homepage
router.get(
  '/approved',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const testimonials = await Testimonial.find({
      status: 'approved',
    })
      .sort({ isFeatured: -1, order: 1, createdAt: -1 })
      .limit(20)
      .select('-customerEmail -moderatedBy')
      .lean();

    res.json({
      success: true,
      data: testimonials,
    });
  })
);

// Get featured testimonials
router.get(
  '/featured',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const testimonials = await Testimonial.find({
      status: 'approved',
      isFeatured: true,
    })
      .sort({ order: 1, createdAt: -1 })
      .limit(10)
      .select('-customerEmail -moderatedBy')
      .lean();

    res.json({
      success: true,
      data: testimonials,
    });
  })
);

// Submit a testimonial (can be authenticated or not)
router.post(
  '/',
  optionalAuth,
  validate(createTestimonialSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;
    const user = req.user;

    const testimonial = await Testimonial.create({
      ...data,
      userId: user?._id,
      customerName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : data.customerName,
      customerEmail: user?.email || data.customerEmail,
      customerAvatar: user?.avatar,
      status: 'pending', // Always pending, needs admin approval
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your testimonial! It will be reviewed shortly.',
      data: {
        _id: testimonial._id,
        customerName: testimonial.customerName,
        rating: testimonial.rating,
        status: testimonial.status,
      },
    });
  })
);

// ========== ADMIN ROUTES ==========

// Get all testimonials (admin)
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const query: any = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const [testimonials, total] = await Promise.all([
      Testimonial.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('moderatedBy', 'firstName lastName')
        .lean(),
      Testimonial.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        testimonials,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// Get testimonial by ID (admin)
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid testimonial ID');
    }

    const testimonial = await Testimonial.findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('moderatedBy', 'firstName lastName')
      .lean();

    if (!testimonial) {
      throw new NotFoundError('Testimonial');
    }

    res.json({
      success: true,
      data: testimonial,
    });
  })
);

// Update testimonial (admin)
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  validate(updateTestimonialSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid testimonial ID');
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      throw new NotFoundError('Testimonial');
    }

    // Track moderation
    if (data.status && data.status !== testimonial.status) {
      data.moderatedBy = req.user!._id;
      data.moderatedAt = new Date();
    }

    Object.assign(testimonial, data);
    await testimonial.save();

    res.json({
      success: true,
      data: testimonial,
    });
  })
);

// Moderate testimonial (approve/reject)
router.post(
  '/:id/moderate',
  authenticate,
  requireAdmin,
  validate(moderateTestimonialSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid testimonial ID');
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      throw new NotFoundError('Testimonial');
    }

    testimonial.status = status;
    testimonial.moderatedBy = req.user!._id as mongoose.Types.ObjectId;
    testimonial.moderatedAt = new Date();
    await testimonial.save();

    res.json({
      success: true,
      message: `Testimonial ${status}`,
      data: testimonial,
    });
  })
);

// Toggle featured status
router.post(
  '/:id/toggle-featured',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid testimonial ID');
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      throw new NotFoundError('Testimonial');
    }

    testimonial.isFeatured = !testimonial.isFeatured;
    await testimonial.save();

    res.json({
      success: true,
      message: testimonial.isFeatured ? 'Testimonial featured' : 'Testimonial unfeatured',
      data: testimonial,
    });
  })
);

// Delete testimonial (super admin only)
router.delete(
  '/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid testimonial ID');
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      throw new NotFoundError('Testimonial');
    }

    await testimonial.deleteOne();

    res.json({
      success: true,
      message: 'Testimonial deleted',
    });
  })
);

// Reorder testimonials
router.post(
  '/reorder',
  authenticate,
  requireAdmin,
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

    await Testimonial.bulkWrite(operations);

    res.json({
      success: true,
      message: 'Testimonials reordered',
    });
  })
);

export default router;
