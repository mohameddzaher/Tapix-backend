// ============================================
// Tapix API - Stock Movement Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'return' | 'damaged';

export interface IStockMovement extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  orderId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'sale', 'adjustment', 'return', 'damaged'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: String,
    reference: String,
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ productId: 1, createdAt: -1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
