// ============================================
// Tapix API - SEO Redirect Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface ISEORedirect extends Document {
  _id: mongoose.Types.ObjectId;
  fromPath: string;
  toPath: string;
  type: '301' | '302';
  isActive: boolean;
  hitCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const seoRedirectSchema = new Schema<ISEORedirect>(
  {
    fromPath: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    toPath: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['301', '302'],
      default: '301',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    hitCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const SEORedirect = mongoose.model<ISEORedirect>('SEORedirect', seoRedirectSchema);
