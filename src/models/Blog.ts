// ============================================
// Tapix API - Blog Models
// ============================================

import mongoose, { Document, Schema } from 'mongoose';
import { slugify } from '@tapix/shared';

// Blog Category
export interface IBlogCategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const blogCategorySchema = new Schema<IBlogCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: String,
    postCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

blogCategorySchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.slug) {
    let baseSlug = slugify(this.name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await mongoose.model('BlogCategory').findOne({ slug, _id: { $ne: this._id } });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});

// Blog Post
export interface IBlogPost extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  categoryId?: mongoose.Types.ObjectId;
  tags: string[];
  authorId: mongoose.Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  metaTitle?: string;
  metaDescription?: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const blogPostSchema = new Schema<IBlogPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    excerpt: String,
    content: {
      type: String,
      required: true,
    },
    featuredImage: String,
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'BlogCategory',
      index: true,
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: Date,
    metaTitle: String,
    metaDescription: String,
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

blogPostSchema.pre('save', async function (next) {
  if (this.isModified('title') || !this.slug) {
    let baseSlug = slugify(this.title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await mongoose.model('BlogPost').findOne({ slug, _id: { $ne: this._id } });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }

  // Set publishedAt when publishing
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Indexes
blogPostSchema.index({ isPublished: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ title: 'text', content: 'text', tags: 'text' });

export const BlogCategory = mongoose.model<IBlogCategory>('BlogCategory', blogCategorySchema);
export const BlogPost = mongoose.model<IBlogPost>('BlogPost', blogPostSchema);
