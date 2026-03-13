// ============================================
// Tapix API - Testimonial Model
// Site-wide customer testimonials about the company
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

export interface ITestimonial extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerAvatar?: string;
  rating: number;
  title?: string;
  content: string;
  status: TestimonialStatus;
  isFeatured: boolean;
  order: number;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<ITestimonial>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    customerAvatar: String,
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
testimonialSchema.index({ status: 1, isFeatured: -1, order: 1 });
testimonialSchema.index({ createdAt: -1 });
testimonialSchema.index({ customerEmail: 1 });

export const Testimonial = mongoose.model<ITestimonial>('Testimonial', testimonialSchema);
