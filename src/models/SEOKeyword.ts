// ============================================
// Tapix API - SEO Keyword Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface ISEOKeyword extends Document {
  _id: mongoose.Types.ObjectId;
  keyword: string;
  targetPage?: string;
  currentRank?: number;
  searchVolume?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const seoKeywordSchema = new Schema<ISEOKeyword>(
  {
    keyword: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetPage: String,
    currentRank: { type: Number, min: 0 },
    searchVolume: { type: Number, min: 0 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

export const SEOKeyword = mongoose.model<ISEOKeyword>('SEOKeyword', seoKeywordSchema);
