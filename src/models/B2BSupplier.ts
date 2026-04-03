// ============================================
// Tapix API - B2B Supplier Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IB2BSupplier extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  totalPurchases: number;
  totalAmountPaid: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const b2bSupplierSchema = new Schema<IB2BSupplier>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: String,
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'Saudi Arabia',
    },
    notes: String,
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
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

b2bSupplierSchema.index({ name: 'text' });
b2bSupplierSchema.index({ createdAt: -1 });

export const B2BSupplier = mongoose.model<IB2BSupplier>('B2BSupplier', b2bSupplierSchema);
