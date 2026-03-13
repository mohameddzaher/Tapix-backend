// ============================================
// Tapix API - SEO Page Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface ISEOPage extends Document {
  _id: mongoose.Types.ObjectId;
  path: string;
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  keywords: string[];
  noIndex: boolean;
  noFollow: boolean;
  structuredData?: string;
  createdAt: Date;
  updatedAt: Date;
}

const seoPageSchema = new Schema<ISEOPage>(
  {
    path: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    metaTitle: { type: String, maxlength: 70 },
    metaDescription: { type: String, maxlength: 160 },
    ogTitle: { type: String, maxlength: 70 },
    ogDescription: { type: String, maxlength: 200 },
    ogImage: String,
    canonicalUrl: String,
    keywords: [{ type: String }],
    noIndex: { type: Boolean, default: false },
    noFollow: { type: Boolean, default: false },
    structuredData: String,
  },
  {
    timestamps: true,
  }
);

export const SEOPage = mongoose.model<ISEOPage>('SEOPage', seoPageSchema);
