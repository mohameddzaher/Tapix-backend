// ============================================
// Tapix API - B2B Client Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IB2BClient extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const b2bClientSchema = new Schema<IB2BClient>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
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
    taxNumber: {
      type: String,
      trim: true,
    },
    notes: String,
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
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

b2bClientSchema.index({ name: 'text', companyName: 'text' });
b2bClientSchema.index({ createdAt: -1 });

export const B2BClient = mongoose.model<IB2BClient>('B2BClient', b2bClientSchema);
