// ============================================
// Tapix API - B2B Expense Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export type B2BExpenseCategory =
  | 'salaries'
  | 'rent'
  | 'utilities'
  | 'marketing'
  | 'shipping'
  | 'packaging'
  | 'software'
  | 'equipment'
  | 'transportation'
  | 'food'
  | 'maintenance'
  | 'other';

export interface IB2BExpense extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  category: B2BExpenseCategory;
  date: Date;
  description?: string;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const b2bExpenseSchema = new Schema<IB2BExpense>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['salaries', 'rent', 'utilities', 'marketing', 'shipping', 'packaging', 'software', 'equipment', 'transportation', 'food', 'maintenance', 'other'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    description: String,
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

b2bExpenseSchema.index({ date: -1 });
b2bExpenseSchema.index({ category: 1, date: -1 });

export const B2BExpense = mongoose.model<IB2BExpense>('B2BExpense', b2bExpenseSchema);
