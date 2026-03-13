// ============================================
// Tapix API - Referral Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IReferral extends Document {
  referrer: mongoose.Types.ObjectId;
  referee: mongoose.Types.ObjectId;
  referralCode: string;
  status: 'pending' | 'completed' | 'cancelled';
  referrerReward: number;
  refereeDiscount: number;
  orderAmount?: number;
  orderId?: mongoose.Types.ObjectId;
  completedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    referrerReward: {
      type: Number,
      default: 100, // SAR 100 for the referrer
    },
    refereeDiscount: {
      type: Number,
      default: 100, // SAR 100 discount for the referee
    },
    orderAmount: Number,
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    completedAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
referralSchema.index({ status: 1 });
referralSchema.index({ createdAt: -1 });
referralSchema.index({ referrer: 1, status: 1 });

export const Referral = mongoose.model<IReferral>('Referral', referralSchema);
