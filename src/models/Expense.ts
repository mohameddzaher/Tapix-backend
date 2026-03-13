// ============================================
// Tapix API - Expense Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export type ExpenseCategory =
  | 'inventory'
  | 'shipping'
  | 'marketing'
  | 'salaries'
  | 'rent'
  | 'utilities'
  | 'software'
  | 'equipment'
  | 'taxes'
  | 'other';

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  description?: string;
  receipt?: string;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
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
      enum: ['inventory', 'shipping', 'marketing', 'salaries', 'rent', 'utilities', 'software', 'equipment', 'taxes', 'other'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: String,
    receipt: String,
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

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
