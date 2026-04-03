// ============================================
// Tapix API - B2B Sale Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IB2BSaleItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  costPerUnit: number;
}

export interface IB2BSale extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  clientId: mongoose.Types.ObjectId;
  items: IB2BSaleItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  totalCost: number;
  profit: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod?: string;
  amountPaid: number;
  notes?: string;
  saleDate: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const b2bSaleItemSchema = new Schema<IB2BSaleItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'B2BProduct',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    costPerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const b2bSaleSchema = new Schema<IB2BSale>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'B2BClient',
      required: true,
      index: true,
    },
    items: {
      type: [b2bSaleItemSchema],
      required: true,
      validate: [(v: IB2BSaleItem[]) => v.length > 0, 'At least one item is required'],
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 15, // Saudi VAT 15%
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    profit: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'unpaid'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: String,
    saleDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
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

// Auto-generate invoice number
b2bSaleSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await mongoose.model('B2BSale').countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    this.invoiceNumber = `INV-${year}${month}-${(count + 1).toString().padStart(4, '0')}`;
  }

  // Calculate totals
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalCost = this.items.reduce((sum, item) => sum + (item.costPerUnit * item.quantity), 0);
    this.tax = (this.subtotal - this.discount) * (this.taxRate / 100);
    this.total = this.subtotal - this.discount + this.tax;
    this.profit = this.total - this.totalCost - this.tax;
  }

  next();
});

b2bSaleSchema.index({ createdAt: -1 });
b2bSaleSchema.index({ saleDate: -1 });
b2bSaleSchema.index({ paymentStatus: 1 });

export const B2BSale = mongoose.model<IB2BSale>('B2BSale', b2bSaleSchema);
