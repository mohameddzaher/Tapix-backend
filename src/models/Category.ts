// ============================================
// Tapix API - Category Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';
import { slugify } from '@tapix/shared';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  image?: string;
  icon?: string;
  parentId?: mongoose.Types.ObjectId;
  order: number;
  isActive: boolean;
  productCount: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: String,
    descriptionAr: {
      type: String,
    },
    image: String,
    icon: String,
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    productCount: {
      type: Number,
      default: 0,
    },
    metaTitle: String,
    metaDescription: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
});

// Pre-save middleware to generate slug
categorySchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.slug) {
    let baseSlug = slugify(this.name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await mongoose.model('Category').findOne({ slug, _id: { $ne: this._id } });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});

// Indexes
categorySchema.index({ order: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
