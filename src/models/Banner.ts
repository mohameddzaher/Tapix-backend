// ============================================
// Tapix API - Banner Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';

export type BannerPosition =
  | 'hero_main'
  | 'hero_secondary'
  | 'home_middle'
  | 'home_bottom'
  | 'category_top'
  | 'product_sidebar'
  | 'flash_deals';

export interface IBanner extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  linkText?: string;
  linkTextAr?: string;
  position: BannerPosition;
  backgroundColor?: string;
  textColor?: string;
  order: number;
  startsAt?: Date;
  endsAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isCurrentlyActive: boolean;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleAr: {
      type: String,
      trim: true,
    },
    subtitle: String,
    subtitleAr: {
      type: String,
    },
    image: {
      type: String,
      required: true,
    },
    mobileImage: String,
    link: String,
    linkText: String,
    linkTextAr: {
      type: String,
    },
    position: {
      type: String,
      enum: ['hero_main', 'hero_secondary', 'home_middle', 'home_bottom', 'category_top', 'product_sidebar', 'flash_deals'],
      required: true,
      index: true,
    },
    backgroundColor: String,
    textColor: String,
    order: {
      type: Number,
      default: 0,
    },
    startsAt: Date,
    endsAt: Date,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to check if banner is currently active
bannerSchema.virtual('isCurrentlyActive').get(function (this: IBanner) {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.startsAt && this.startsAt > now) return false;
  if (this.endsAt && this.endsAt <= now) return false;
  return true;
});

// Indexes
bannerSchema.index({ position: 1, order: 1 });
bannerSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

export const Banner = mongoose.model<IBanner>('Banner', bannerSchema);
