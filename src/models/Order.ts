// ============================================
// Tapix API - Order Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';
import { generateOrderNumber } from '@tapix/shared';

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'in_progress'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export type PaymentMethod = 'cash_on_delivery' | 'card' | 'apple_pay';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  title: string;
  sku: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  quantity: number;
  image?: string;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  updatedBy: mongoose.Types.ObjectId;
  note?: string;
}

export interface IOrderAddress {
  fullName: string;
  phone: string;
  email: string;
  fullAddress: string;
  city: string;
  area: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  userId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  discountCode?: string;
  taxRate: number;
  taxAmount: number;
  taxLabel: string;
  total: number;
  status: OrderStatus;
  statusHistory: IOrderStatusHistory[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  shippingAddress: IOrderAddress;
  notes?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discount: { type: Number, min: 0, max: 100 },
    quantity: { type: Number, required: true, min: 1 },
    image: String,
  },
  { _id: false }
);

const orderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    status: {
      type: String,
      required: true,
      enum: ['new', 'accepted', 'in_progress', 'out_for_delivery', 'delivered', 'cancelled', 'failed'],
    },
    timestamp: { type: Date, required: true, default: Date.now },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: String,
  },
  { _id: false }
);

const orderAddressSchema = new Schema<IOrderAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    fullAddress: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, required: true },
    building: String,
    floor: String,
    apartment: String,
    landmark: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountCode: String,
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxLabel: {
      type: String,
      default: 'VAT',
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['new', 'accepted', 'in_progress', 'out_for_delivery', 'delivered', 'cancelled', 'failed'],
      default: 'new',
      index: true,
    },
    statusHistory: [orderStatusHistorySchema],
    paymentMethod: {
      type: String,
      enum: ['cash_on_delivery', 'card', 'apple_pay'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentIntentId: String,
    shippingAddress: {
      type: orderAddressSchema,
      required: true,
    },
    notes: String,
    estimatedDelivery: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save middleware to generate order number
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
  }
  next();
});

// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'shippingAddress.phone': 1 });
orderSchema.index({ 'shippingAddress.email': 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
