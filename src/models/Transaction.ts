// ============================================
// Tapix API - Transaction Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'credit' | 'debit';
export type TransactionCategory = 'order_revenue' | 'order_refund' | 'expense' | 'adjustment';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  description: string;
  reference?: string;
  orderId?: mongoose.Types.ObjectId;
  expenseId?: mongoose.Types.ObjectId;
  date: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['order_revenue', 'order_refund', 'expense', 'adjustment'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    reference: String,
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    expenseId: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ date: -1 });
transactionSchema.index({ type: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
