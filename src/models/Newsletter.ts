// ============================================
// Tapix API - Newsletter Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface INewsletterSubscriber extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  isActive: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date;
}

const newsletterSchema = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: Date,
  },
  {
    timestamps: false,
  }
);

export const Newsletter = mongoose.model<INewsletterSubscriber>('Newsletter', newsletterSchema);
