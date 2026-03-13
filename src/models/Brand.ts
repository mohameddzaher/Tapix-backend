// ============================================
// Tapix API - Brand Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';
import { slugify } from '@tapix/shared';

export interface IBrand extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string;
  slug: string;
  logo?: string;
  description?: string;
  descriptionAr?: string;
  website?: string;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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
    logo: String,
    description: String,
    descriptionAr: {
      type: String,
    },
    website: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    productCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate slug
brandSchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.slug) {
    let baseSlug = slugify(this.name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await mongoose.model('Brand').findOne({ slug, _id: { $ne: this._id } });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});

// Indexes
brandSchema.index({ name: 'text' });
brandSchema.index({ createdAt: -1 });

export const Brand = mongoose.model<IBrand>('Brand', brandSchema);
