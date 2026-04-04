// ============================================
// Tapix API - B2B Product Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IB2BProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  quantity: number;
  costPerUnit: number;
  totalCost?: number;
  onlinePrice?: number;
  offlinePrice?: number;
  specs?: string;
  supplierId?: mongoose.Types.ObjectId;
  linkedB2CProductId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  profit: number;
}

const b2bProductSchema = new Schema<IB2BProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
    },
    description: String,
    category: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    costPerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCost: {
      type: Number,
      min: 0,
    },
    onlinePrice: {
      type: Number,
      min: 0,
    },
    offlinePrice: {
      type: Number,
      min: 0,
    },
    specs: String,
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'B2BSupplier',
      index: true,
    },
    linkedB2CProductId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate SKU code (TPX-XXX) if not provided
b2bProductSchema.pre('save', async function (next) {
  if (this.isNew && !this.sku) {
    const count = await mongoose.model('B2BProduct').countDocuments();
    this.sku = `TPX-${String(count + 1).padStart(3, '0')}`;
  }

  // Auto-calculate totalCost
  if (!this.totalCost || this.isModified('costPerUnit') || this.isModified('quantity')) {
    this.totalCost = this.costPerUnit * this.quantity;
  }
  next();
});

// Virtual for profit margin
b2bProductSchema.virtual('profit').get(function (this: IB2BProduct) {
  const sellingPrice = this.offlinePrice || this.onlinePrice || 0;
  return sellingPrice - this.costPerUnit;
});

b2bProductSchema.index({ name: 'text', category: 'text' });
b2bProductSchema.index({ createdAt: -1 });
b2bProductSchema.index({ isActive: 1 });

export const B2BProduct = mongoose.model<IB2BProduct>('B2BProduct', b2bProductSchema);
