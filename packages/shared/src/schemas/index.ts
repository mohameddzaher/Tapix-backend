// ============================================
// Tapix E-Commerce Platform - Zod Schemas
// ============================================

import { z } from 'zod';

// ================== AUTH SCHEMAS ==================
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  phone: z.string().optional(),
  referralCode: z.string().max(20).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// ================== USER SCHEMAS ==================
export const addressSchema = z.object({
  label: z.string().min(1).max(50),
  fullAddress: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  area: z.string().min(2).max(100),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  landmark: z.string().optional(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  isDefault: z.boolean().default(false),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().optional(),
  age: z.number().min(13).max(120).optional(),
  avatar: z.string().url().optional(),
});

export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  phone: z.string().optional(),
  role: z.enum(['admin', 'staff']),
  permissions: z.object({
    orders: z.object({ read: z.boolean(), write: z.boolean() }),
    products: z.object({ read: z.boolean(), write: z.boolean() }),
    offers: z.object({ read: z.boolean(), write: z.boolean() }),
    reviews: z.object({ moderate: z.boolean() }),
    analytics: z.object({ limited: z.boolean(), full: z.boolean() }),
    staff: z.object({ read: z.boolean(), write: z.boolean() }),
    cms: z.object({ read: z.boolean(), write: z.boolean() }),
  }),
});

export const updateStaffSchema = createStaffSchema.partial().omit({ password: true });

// ================== PRODUCT SCHEMAS ==================
export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, 'Image URL is required'),
  alt: z.string().max(200).default(''),
  isPrimary: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

export const productSpecSchema = z.object({
  name: z.string().min(1).max(100),
  nameAr: z.string().optional(),
  value: z.string().min(1).max(500),
  valueAr: z.string().optional(),
  group: z.string().optional(),
  groupAr: z.string().optional(),
});

export const productFAQSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(5).max(500),
  questionAr: z.string().optional(),
  answer: z.string().min(5).max(2000),
  answerAr: z.string().optional(),
  order: z.number().int().min(0),
});

export const createProductSchema = z.object({
  title: z.string().min(3).max(200),
  titleAr: z.string().optional(),
  brand: z.string().min(1).max(100),
  sku: z.string().min(1).max(50),
  description: z.string().min(10).max(10000),
  descriptionAr: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  shortDescriptionAr: z.string().optional(),
  specs: z.array(productSpecSchema).default([]),
  warranty: z.string().max(500).default(''),
  warrantyAr: z.string().optional(),
  deliveryNotes: z.string().max(1000).optional(),
  installationNotes: z.string().max(1000).optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).optional(),
  discountEndsAt: z.string().datetime().optional(),
  stockQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  images: z.array(productImageSchema).min(1),
  categoryId: z.string(),
  subcategoryId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  faqs: z.array(productFAQSchema).default([]),
  relatedProductIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
});

export const updateProductSchema = createProductSchema.partial();

// ================== CATEGORY SCHEMAS ==================
export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  nameAr: z.string().optional(),
  description: z.string().max(500).optional(),
  descriptionAr: z.string().optional(),
  image: z.string().url().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ================== BRAND SCHEMAS ==================
export const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  nameAr: z.string().optional(),
  description: z.string().max(500).optional(),
  descriptionAr: z.string().optional(),
  logo: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const updateBrandSchema = createBrandSchema.partial();

// ================== ORDER SCHEMAS ==================
export const orderAddressSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  email: z.string().email(),
  fullAddress: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  area: z.string().min(2).max(100),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  landmark: z.string().optional(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  shippingAddress: orderAddressSchema,
  paymentMethod: z.enum(['cash_on_delivery', 'card', 'apple_pay']),
  discountCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'new',
    'accepted',
    'in_progress',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'failed',
  ]),
  note: z.string().max(500).optional(),
});

// ================== REVIEW SCHEMAS ==================
export const createReviewSchema = z.object({
  productId: z.string(),
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().min(10).max(2000),
  images: z.array(z.string().url()).max(5).optional(),
});

export const moderateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

// ================== CART SCHEMAS ==================
export const addToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0),
});

// ================== OFFER SCHEMAS ==================
// Helper: accept null/NaN/0 as "not provided" for optional positive number fields
const optionalPositiveNumber = z.preprocess(
  (val) => (val === null || val === undefined || val === 0 || (typeof val === 'number' && isNaN(val))) ? undefined : val,
  z.number().positive().optional()
);
const optionalPositiveInt = z.preprocess(
  (val) => (val === null || val === undefined || val === 0 || (typeof val === 'number' && isNaN(val))) ? undefined : val,
  z.number().int().positive().optional()
);

export const createOfferSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  code: z.string().min(3).max(20).optional(),
  type: z.enum(['percentage', 'fixed', 'buy_x_get_y', 'bundle']),
  value: z.number().positive(),
  minOrderAmount: optionalPositiveNumber,
  maxDiscount: optionalPositiveNumber,
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  usageLimit: optionalPositiveInt,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean().default(true),
});

export const updateOfferSchema = createOfferSchema.partial();

// ================== BANNER SCHEMAS ==================
export const createBannerSchema = z.object({
  title: z.string().min(1).max(100),
  titleAr: z.string().optional(),
  subtitle: z.string().max(200).optional(),
  subtitleAr: z.string().optional(),
  image: z.string().url(),
  mobileImage: z.string().url().optional().or(z.literal('')),
  link: z.string().url().optional().or(z.literal('')),
  linkText: z.string().max(50).optional(),
  linkTextAr: z.string().optional(),
  position: z.enum([
    'hero_main',
    'hero_secondary',
    'home_middle',
    'home_bottom',
    'category_top',
    'product_sidebar',
    'flash_deals',
  ]),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  order: z.number().int().min(0).default(0),
  startsAt: z.string().optional().or(z.literal('')),
  endsAt: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const updateBannerSchema = createBannerSchema.partial();

// ================== NEWSLETTER SCHEMAS ==================
export const subscribeNewsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ================== CONTACT SCHEMAS ==================
export const createContactMessageSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
});

export const updateContactStatusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved', 'closed']),
  notes: z.string().max(1000).optional(),
  assignedTo: z.string().optional(),
});

// ================== BLOG SCHEMAS ==================
export const createBlogPostSchema = z.object({
  title: z.string().min(5).max(200),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(50),
  featuredImage: z.string().url().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export const createBlogCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

// ================== CMS SCHEMAS ==================
export const updateCMSContentSchema = z.object({
  value: z.string(),
});

export const updatePolicyPageSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(50),
  isActive: z.boolean().default(true),
});

export const createFAQSchema = z.object({
  question: z.string().min(5).max(500),
  answer: z.string().min(10).max(5000),
  categoryId: z.string().optional(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateFAQSchema = createFAQSchema.partial();

// ================== QUERY SCHEMAS ==================
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).passthrough(); // Allow extra fields to pass through for filters

export const productFiltersSchema = z.object({
  search: z.string().optional(),
  categoryIds: z.string().optional().transform((val) => val?.split(',').filter(Boolean)),
  categorySlug: z.string().optional(),
  brands: z.string().optional().transform((val) => val?.split(',').filter(Boolean)),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  inStock: z.coerce.boolean().optional(),
  onSale: z.coerce.boolean().optional(),
  newArrivals: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  tags: z.string().optional().transform((val) => val?.split(',').filter(Boolean)),
  excludeCategorySlugs: z.string().optional().transform((val) => val?.split(',').filter(Boolean)),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'rating', 'popularity', 'discount']).optional(),
});

export const orderFiltersSchema = z.object({
  status: z
    .string()
    .optional()
    .transform((val) => val?.split(',').filter(Boolean)),
  paymentMethod: z
    .string()
    .optional()
    .transform((val) => val?.split(',').filter(Boolean)),
  paymentStatus: z
    .string()
    .optional()
    .transform((val) => val?.split(',').filter(Boolean)),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
});

// ================== INVENTORY SCHEMAS ==================
export const createStockMovementSchema = z.object({
  productId: z.string(),
  type: z.enum(['purchase', 'sale', 'adjustment', 'return', 'damaged']),
  quantity: z.number().int(),
  reason: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const bulkStockUpdateSchema = z.object({
  updates: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(0),
    reason: z.string().max(500).optional(),
  })).min(1),
});

// ================== ACCOUNTING SCHEMAS ==================
export const createExpenseSchema = z.object({
  title: z.string().min(2).max(200),
  amount: z.number().positive(),
  category: z.enum(['inventory', 'shipping', 'marketing', 'salaries', 'rent', 'utilities', 'software', 'equipment', 'taxes', 'other']),
  date: z.string(),
  description: z.string().max(2000).optional(),
  receipt: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const createTransactionSchema = z.object({
  type: z.enum(['credit', 'debit']),
  amount: z.number().positive(),
  category: z.enum(['order_revenue', 'order_refund', 'expense', 'adjustment']),
  description: z.string().max(500),
  reference: z.string().max(200).optional(),
  date: z.string().optional(),
});

// ================== SEO SCHEMAS ==================
export const createSEOPageSchema = z.object({
  path: z.string().min(1).max(500),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  noIndex: z.boolean().default(false),
  noFollow: z.boolean().default(false),
  structuredData: z.string().optional(),
});

export const updateSEOPageSchema = createSEOPageSchema.partial();

export const createSEORedirectSchema = z.object({
  fromPath: z.string().min(1).max(500),
  toPath: z.string().min(1).max(500),
  type: z.enum(['301', '302']).default('301'),
  isActive: z.boolean().default(true),
});

export const createSEOKeywordSchema = z.object({
  keyword: z.string().min(1).max(200),
  targetPage: z.string().max(500).optional(),
  currentRank: z.number().int().min(0).optional(),
  searchVolume: z.number().int().min(0).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  notes: z.string().max(1000).optional(),
});

// ================== TYPE EXPORTS ==================
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
