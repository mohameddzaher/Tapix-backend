// ============================================
// Tapix API - User Model
// ============================================

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAddress {
  id: string;
  label: string;
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
  isDefault: boolean;
}

export interface IPermission {
  orders: { read: boolean; write: boolean };
  products: { read: boolean; write: boolean };
  offers: { read: boolean; write: boolean };
  reviews: { moderate: boolean };
  analytics: { limited: boolean; full: boolean };
  staff: { read: boolean; write: boolean };
  cms: { read: boolean; write: boolean };
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  age?: number;
  role: 'super_admin' | 'admin' | 'staff' | 'user';
  permissions?: IPermission;
  addresses: IAddress[];
  wishlist: mongoose.Types.ObjectId[];
  recentlyViewed: mongoose.Types.ObjectId[];
  isActive: boolean;
  isEmailVerified: boolean;
  googleId?: string;
  createdBy?: mongoose.Types.ObjectId;
  lastLogin?: Date;
  refreshTokens: string[];
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  pushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  // Referral fields
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  canRefer: boolean;
  referralCredits: number;
  totalReferrals: number;
  successfulReferrals: number;
  // Loyalty points fields
  loyaltyPoints: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  pointsFrozen: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  fullName: string;
}

const addressSchema = new Schema<IAddress>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
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
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const permissionSchema = new Schema<IPermission>(
  {
    orders: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
    },
    products: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
    },
    offers: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
    },
    reviews: {
      moderate: { type: Boolean, default: false },
    },
    analytics: {
      limited: { type: Boolean, default: false },
      full: { type: Boolean, default: false },
    },
    staff: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
    },
    cms: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: String,
    age: Number,
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'staff', 'user'],
      default: 'user',
    },
    permissions: permissionSchema,
    addresses: [addressSchema],
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    recentlyViewed: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastLogin: Date,
    refreshTokens: [String],
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    pushSubscription: {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
    // Referral fields
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    canRefer: {
      type: Boolean,
      default: true, // Admin can disable this for specific users
    },
    referralCredits: {
      type: Number,
      default: 0,
    },
    totalReferrals: {
      type: Number,
      default: 0,
    },
    successfulReferrals: {
      type: Number,
      default: 0,
    },
    // Loyalty points fields
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    totalPointsEarned: {
      type: Number,
      default: 0,
    },
    totalPointsRedeemed: {
      type: Number,
      default: 0,
    },
    pointsFrozen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual for full name
userSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Generate unique referral code for new users
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.referralCode) {
    // Generate a unique referral code based on first name + random string
    const prefix = this.firstName.slice(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referralCode = `${prefix}${random}`;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
