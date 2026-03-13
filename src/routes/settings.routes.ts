// ============================================
// Tapix API - Settings Routes
// ============================================

import { Router, Response } from 'express';
import { z } from 'zod';
import { Settings } from '../models/Settings';
import { authenticate, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Public settings schema - only non-sensitive fields
const publicSettingsFields = [
  'siteName',
  'siteDescription',
  'sitePhone',
  'siteEmail',
  'siteAddress',
  'currency',
  'timezone',
  'dateFormat',
  'maintenanceMode',
  'maintenanceMessage',
  'shippingFee',
  'freeShippingThreshold',
  'enableFreeShipping',
  'estimatedDeliveryDays',
  'enableTax',
  'taxRate',
  'taxLabel',
  'enableCOD',
  'codFee',
  'enableOnlinePayment',
  'socialFacebook',
  'socialInstagram',
  'socialTwitter',
  'socialYoutube',
  'socialTiktok',
  'socialLinkedin',
  'socialWhatsapp',
  'socialSnapchat',
  'socialLinktree',
  'logo',
  'favicon',
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'headerStyle',
  'footerStyle',
  'productCardStyle',
  'metaTitle',
  'metaDescription',
  'metaKeywords',
  'enableReviews',
  'reviewsRequireApproval',
  'enableWishlist',
  'enableCompare',
  'maxCompareProducts',
  'enableRecentlyViewed',
  'recentlyViewedLimit',
  'enableReferralProgram',
  'referralRewardAmount',
  'referralRewardType',
];

// Get public settings (no auth required)
router.get(
  '/public',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const settings = await (Settings as any).getSettings();

    // Filter to only public fields
    const publicSettings: Record<string, any> = {};
    for (const field of publicSettingsFields) {
      if (settings[field] !== undefined) {
        publicSettings[field] = settings[field];
      }
    }

    res.json({
      success: true,
      data: publicSettings,
    });
  })
);

// Get all settings (admin only)
router.get(
  '/',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const settings = await (Settings as any).getSettings();

    // Mask sensitive fields
    const maskedSettings = settings.toObject();
    if (maskedSettings.stripeSecretKey) {
      maskedSettings.stripeSecretKey = '••••••••' + maskedSettings.stripeSecretKey.slice(-4);
    }
    if (maskedSettings.paypalSecret) {
      maskedSettings.paypalSecret = '••••••••' + maskedSettings.paypalSecret.slice(-4);
    }
    if (maskedSettings.smtpPassword) {
      maskedSettings.smtpPassword = '••••••••';
    }

    res.json({
      success: true,
      data: maskedSettings,
    });
  })
);

// Update settings schema
const updateSettingsSchema = z.object({
  // General
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  siteEmail: z.string().email().optional(),
  sitePhone: z.string().max(20).optional(),
  siteAddress: z.string().max(500).optional(),
  currency: z.string().min(1).max(10).optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional(),
  // Shipping
  shippingFee: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  enableFreeShipping: z.boolean().optional(),
  estimatedDeliveryDays: z.number().min(1).max(30).optional(),
  // Payment
  taxRate: z.number().min(0).max(100).optional(),
  enableTax: z.boolean().optional(),
  taxLabel: z.string().max(50).optional(),
  enableCOD: z.boolean().optional(),
  codFee: z.number().min(0).optional(),
  enableOnlinePayment: z.boolean().optional(),
  stripeEnabled: z.boolean().optional(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  paypalEnabled: z.boolean().optional(),
  paypalClientId: z.string().optional(),
  paypalSecret: z.string().optional(),
  // Email
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  emailFromName: z.string().max(100).optional(),
  emailFromAddress: z.string().email().optional(),
  enableOrderConfirmationEmail: z.boolean().optional(),
  enableShippingNotificationEmail: z.boolean().optional(),
  enableAccountEmails: z.boolean().optional(),
  enableMarketingEmails: z.boolean().optional(),
  // Social
  socialFacebook: z.string().url().or(z.literal('')).optional(),
  socialInstagram: z.string().url().or(z.literal('')).optional(),
  socialTwitter: z.string().url().or(z.literal('')).optional(),
  socialYoutube: z.string().url().or(z.literal('')).optional(),
  socialTiktok: z.string().url().or(z.literal('')).optional(),
  socialLinkedin: z.string().url().or(z.literal('')).optional(),
  socialWhatsapp: z.string().optional(),
  socialSnapchat: z.string().url().or(z.literal('')).optional(),
  socialLinktree: z.string().url().or(z.literal('')).optional(),
  // Appearance
  logo: z.string().url().or(z.literal('')).optional(),
  favicon: z.string().url().or(z.literal('')).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  headerStyle: z.enum(['default', 'transparent', 'colored']).optional(),
  footerStyle: z.enum(['default', 'minimal', 'expanded']).optional(),
  productCardStyle: z.enum(['default', 'minimal', 'detailed']).optional(),
  // SEO
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  metaKeywords: z.array(z.string()).optional(),
  googleAnalyticsId: z.string().optional(),
  facebookPixelId: z.string().optional(),
  // Notifications
  enablePushNotifications: z.boolean().optional(),
  enableEmailNotifications: z.boolean().optional(),
  lowStockThreshold: z.number().min(1).optional(),
  notifyOnNewOrder: z.boolean().optional(),
  notifyOnLowStock: z.boolean().optional(),
  notifyOnNewReview: z.boolean().optional(),
  adminNotificationEmails: z.array(z.string().email()).optional(),
  // Advanced
  enableReviews: z.boolean().optional(),
  reviewsRequireApproval: z.boolean().optional(),
  enableWishlist: z.boolean().optional(),
  enableCompare: z.boolean().optional(),
  maxCompareProducts: z.number().min(2).max(10).optional(),
  enableRecentlyViewed: z.boolean().optional(),
  recentlyViewedLimit: z.number().min(1).max(50).optional(),
  enableReferralProgram: z.boolean().optional(),
  referralRewardAmount: z.number().min(0).optional(),
  referralRewardType: z.enum(['fixed', 'percentage']).optional(),
  // Loyalty Program
  enableLoyaltyProgram: z.boolean().optional(),
  pointsPerCurrency: z.number().min(0).optional(),
  pointsRedemptionRate: z.number().min(1).optional(),
  referralBonusPoints: z.number().min(0).optional(),
  minPointsToRedeem: z.number().min(0).optional(),
  maxPointsPerOrder: z.number().min(0).optional(),
  // Homepage Sections
  homepageSections: z.array(z.object({
    key: z.string(),
    enabled: z.boolean(),
    order: z.number(),
  })).optional(),
}).strict();

// Update settings (super admin only)
router.patch(
  '/',
  authenticate,
  requireSuperAdmin,
  validate(updateSettingsSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body;

    // Don't overwrite secrets if masked value is sent
    if (data.stripeSecretKey?.startsWith('••••')) {
      delete data.stripeSecretKey;
    }
    if (data.paypalSecret?.startsWith('••••')) {
      delete data.paypalSecret;
    }
    if (data.smtpPassword === '••••••••') {
      delete data.smtpPassword;
    }

    const settings = await (Settings as any).getSettings();

    Object.assign(settings, data);
    settings.updatedBy = req.user!._id;
    await settings.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  })
);

export default router;
