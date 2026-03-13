// ============================================
// Tapix API - Product Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';
import { slugify } from '@tapix/shared';

export interface IProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface IProductSpec {
  name: string;
  nameAr?: string;
  value: string;
  valueAr?: string;
  group?: string;
  groupAr?: string;
}

export interface IProductFAQ {
  id: string;
  question: string;
  questionAr?: string;
  answer: string;
  answerAr?: string;
  order: number;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  titleAr?: string;
  slug: string;
  brand: string;
  sku: string;
  description: string;
  descriptionAr?: string;
  shortDescription?: string;
  shortDescriptionAr?: string;
  specs: IProductSpec[];
  warranty: string;
  warrantyAr?: string;
  deliveryNotes?: string;
  installationNotes?: string;
  price: number;
  compareAtPrice?: number;
  discount?: number;
  discountEndsAt?: Date;
  stockQuantity: number;
  lowStockThreshold: number;
  images: IProductImage[];
  categoryId: mongoose.Types.ObjectId;
  subcategoryId?: mongoose.Types.ObjectId;
  tags: string[];
  faqs: IProductFAQ[];
  relatedProductIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  soldCount: number;
  viewCount: number;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  primaryImage?: IProductImage;
  finalPrice: number;
  isOnSale: boolean;
  isInStock: boolean;
}

const productImageSchema = new Schema<IProductImage>(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSpecSchema = new Schema<IProductSpec>(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    value: { type: String, required: true },
    valueAr: { type: String },
    group: String,
    groupAr: { type: String },
  },
  { _id: false }
);

const productFAQSchema = new Schema<IProductFAQ>(
  {
    id: { type: String, required: true },
    question: { type: String, required: true },
    questionAr: { type: String },
    answer: { type: String, required: true },
    answerAr: { type: String },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: 'text',
    },
    titleAr: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    descriptionAr: {
      type: String,
    },
    shortDescription: String,
    shortDescriptionAr: {
      type: String,
    },
    specs: [productSpecSchema],
    warranty: {
      type: String,
      default: '',
    },
    warrantyAr: {
      type: String,
    },
    deliveryNotes: String,
    installationNotes: String,
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    discount: {
      type: Number,
      min: 0,
      max: 100,
    },
    discountEndsAt: Date,
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    images: [productImageSchema],
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    faqs: [productFAQSchema],
    relatedProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    metaTitle: String,
    metaDescription: String,
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
productSchema.virtual('primaryImage').get(function (this: IProduct) {
  return this.images?.find((img) => img.isPrimary) || this.images?.[0];
});

productSchema.virtual('finalPrice').get(function (this: IProduct) {
  if (this.discount && this.discount > 0) {
    const now = new Date();
    if (!this.discountEndsAt || this.discountEndsAt > now) {
      return this.price * (1 - this.discount / 100);
    }
  }
  return this.price;
});

productSchema.virtual('isOnSale').get(function (this: IProduct) {
  if (!this.discount || this.discount <= 0) return false;
  if (this.discountEndsAt && this.discountEndsAt <= new Date()) return false;
  return true;
});

productSchema.virtual('isInStock').get(function (this: IProduct) {
  return this.stockQuantity > 0;
});

// Pre-save middleware to generate slug
productSchema.pre('save', async function (next) {
  if (this.isModified('title') || !this.slug) {
    let baseSlug = slugify(this.title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await mongoose.model('Product').findOne({ slug, _id: { $ne: this._id } });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});

// Indexes
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ tags: 1 });
productSchema.index(
  { title: 'text', description: 'text', brand: 'text', tags: 'text' },
  { weights: { title: 10, brand: 5, tags: 3, description: 1 } }
);

export const Product = mongoose.model<IProduct>('Product', productSchema);
