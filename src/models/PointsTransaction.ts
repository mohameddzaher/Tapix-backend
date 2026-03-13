// ============================================
// Tapix API - Points Transaction Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IPointsTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'earned_purchase' | 'earned_referral' | 'redeemed' | 'adjusted' | 'expired';
  points: number; // positive for earn, negative for redeem
  orderId?: mongoose.Types.ObjectId;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const pointsTransactionSchema = new Schema<IPointsTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['earned_purchase', 'earned_referral', 'redeemed', 'adjusted', 'expired'],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

pointsTransactionSchema.index({ userId: 1, createdAt: -1 });
pointsTransactionSchema.index({ type: 1 });

export const PointsTransaction = mongoose.model<IPointsTransaction>('PointsTransaction', pointsTransactionSchema);
