// ============================================
// Tapix API - Blog Routes
// ============================================

import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { createBlogPostSchema, updateBlogPostSchema, createBlogCategorySchema, paginationSchema } from '@tapix/shared';
import { BlogPost, BlogCategory } from '../models/Blog';
import { authenticate, requireAdmin, requirePermission, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/errorHandler';

const router = Router();

// ========== PUBLIC ROUTES ==========

// Get published posts
router.get(
  '/posts',
  validate(paginationSchema, 'query'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 10 } = req.query as any;
    const { category, tag, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = { isPublished: true };

    if (category) {
      const cat = await BlogCategory.findOne({ slug: category });
      if (cat) {
        query.categoryId = cat._id;
      }
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$text = { $search: search as string };
    }

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('categoryId', 'name slug')
        .populate('authorId', 'firstName lastName')
        .select('-content')
        .lean(),
      BlogPost.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get post by slug
router.get(
  '/posts/slug/:slug',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { slug } = req.params;

    const post = await BlogPost.findOneAndUpdate(
      { slug, isPublished: true },
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .populate('categoryId', 'name slug')
      .populate('authorId', 'firstName lastName avatar')
      .lean();

    if (!post) {
      throw new NotFoundError('Post');
    }

    // Get related posts
    const relatedPosts = await BlogPost.find({
      _id: { $ne: post._id },
      isPublished: true,
      $or: [{ categoryId: post.categoryId }, { tags: { $in: post.tags } }],
    })
      .sort({ publishedAt: -1 })
      .limit(3)
      .select('title slug excerpt featuredImage publishedAt')
      .lean();

    res.json({
      success: true,
      data: {
        ...post,
        relatedPosts,
      },
    });
  })
);

// Get categories
router.get(
  '/categories',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const categories = await BlogCategory.find().sort({ name: 1 }).lean();

    res.json({
      success: true,
      data: categories,
    });
  })
);

// Get tags
router.get(
  '/tags',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const tags = await BlogPost.distinct('tags', { isPublished: true });

    res.json({
      success: true,
      data: tags.sort(),
    });
  })
);

// ========== ADMIN ROUTES ==========

// Get all posts (admin)
router.get(
  '/admin/posts',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, status } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (status === 'published') query.isPublished = true;
    if (status === 'draft') query.isPublished = false;

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('categoryId', 'name')
        .populate('authorId', 'firstName lastName')
        .select('-content')
        .lean(),
      BlogPost.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get post by ID (admin)
router.get(
  '/admin/posts/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'read'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid post ID');
    }

    const post = await BlogPost.findById(id)
      .populate('categoryId', 'name slug')
      .populate('authorId', 'firstName lastName')
      .lean();

    if (!post) {
      throw new NotFoundError('Post');
    }

    res.json({
      success: true,
      data: post,
    });
  })
);

// Create post (admin)
router.post(
  '/admin/posts',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  validate(createBlogPostSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;

    const post = await BlogPost.create({
      ...data,
      authorId: req.userId,
    });

    // Update category post count
    if (data.categoryId) {
      await BlogCategory.findByIdAndUpdate(data.categoryId, { $inc: { postCount: 1 } });
    }

    res.status(201).json({
      success: true,
      data: post,
    });
  })
);

// Update post (admin)
router.patch(
  '/admin/posts/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  validate(updateBlogPostSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid post ID');
    }

    const post = await BlogPost.findById(id);
    if (!post) {
      throw new NotFoundError('Post');
    }

    // Update category counts if changed
    if (data.categoryId && data.categoryId !== post.categoryId?.toString()) {
      if (post.categoryId) {
        await BlogCategory.findByIdAndUpdate(post.categoryId, { $inc: { postCount: -1 } });
      }
      await BlogCategory.findByIdAndUpdate(data.categoryId, { $inc: { postCount: 1 } });
    }

    Object.assign(post, data);
    await post.save();

    res.json({
      success: true,
      data: post,
    });
  })
);

// Delete post (admin)
router.delete(
  '/admin/posts/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid post ID');
    }

    const post = await BlogPost.findById(id);
    if (!post) {
      throw new NotFoundError('Post');
    }

    // Update category count
    if (post.categoryId) {
      await BlogCategory.findByIdAndUpdate(post.categoryId, { $inc: { postCount: -1 } });
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post deleted',
    });
  })
);

// Create category (admin)
router.post(
  '/admin/categories',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  validate(createBlogCategorySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const category = await BlogCategory.create(req.body);

    res.status(201).json({
      success: true,
      data: category,
    });
  })
);

// Update category (admin)
router.patch(
  '/admin/categories/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid category ID');
    }

    const category = await BlogCategory.findByIdAndUpdate(id, req.body, { new: true });

    if (!category) {
      throw new NotFoundError('Category');
    }

    res.json({
      success: true,
      data: category,
    });
  })
);

// Delete category (admin)
router.delete(
  '/admin/categories/:id',
  authenticate,
  requireAdmin,
  requirePermission('cms', 'write'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid category ID');
    }

    const category = await BlogCategory.findById(id);
    if (!category) {
      throw new NotFoundError('Category');
    }

    if (category.postCount > 0) {
      throw new BadRequestError('Cannot delete category with posts');
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted',
    });
  })
);

export default router;
