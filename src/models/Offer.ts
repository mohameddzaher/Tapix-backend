// ============================================
// Tapix API - Offer Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export type OfferType = 'percentage' | 'fixed' | 'buy_x_get_y' | 'bundle';

export interface IOffer extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  code?: string;
  type: OfferType;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  productIds?: mongoose.Types.ObjectId[];
  categoryIds?: mongoose.Types.ObjectId[];
  usageLimit?: number;
  usedCount: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isValid: boolean;
}

const offerSchema = new Schema<IOffer>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    code: {
      type: String,
      uppercase: true,
      trim: true,
      sparse: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'buy_x_get_y', 'bundle'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    usageLimit: Number,
    usedCount: {
      type: Number,
      default: 0,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to check if offer is currently valid
offerSchema.virtual('isValid').get(function (this: IOffer) {
  const now = new Date();
  return (
    this.isActive &&
    this.startsAt <= now &&
    this.endsAt > now &&
    (!this.usageLimit || this.usedCount < this.usageLimit)
  );
});

// Indexes
offerSchema.index({ startsAt: 1, endsAt: 1 });
offerSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

export const Offer = mongoose.model<IOffer>('Offer', offerSchema);
