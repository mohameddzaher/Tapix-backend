// ============================================
// Tapix API - CMS Models
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

// CMS Content
export interface ICMSContent extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  type: 'text' | 'html' | 'json' | 'image';
  value: string;
  description?: string;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const cmsContentSchema = new Schema<ICMSContent>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'html', 'json', 'image'],
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    description: String,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Policy Page
export interface IPolicyPage extends Document {
  _id: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  content: string;
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const policyPageSchema = new Schema<IPolicyPage>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// FAQ
export interface IFAQ extends Document {
  _id: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  categoryId?: mongoose.Types.ObjectId;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFAQ>(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
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
  },
  {
    timestamps: true,
  }
);

faqSchema.index({ order: 1 });
faqSchema.index({ categoryId: 1, order: 1 });

export const CMSContent = mongoose.model<ICMSContent>('CMSContent', cmsContentSchema);
export const PolicyPage = mongoose.model<IPolicyPage>('PolicyPage', policyPageSchema);
export const FAQ = mongoose.model<IFAQ>('FAQ', faqSchema);
