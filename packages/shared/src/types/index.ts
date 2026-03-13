// ============================================
// Tapix E-Commerce Platform - Shared Types
// ============================================

// ================== USER TYPES ==================
export type UserRole = 'super_admin' | 'admin' | 'user';

export interface Permission {
  orders: { read: boolean; write: boolean };
  products: { read: boolean; write: boolean };
  offers: { read: boolean; write: boolean };
  reviews: { moderate: boolean };
  analytics: { limited: boolean; full: boolean };
  staff: { read: boolean; write: boolean };
  cms: { read: boolean; write: boolean };
}

export interface Address {
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

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  age?: number;
  role: UserRole;
  permissions?: Permission;
  addresses: Address[];
  wishlist: string[];
  recentlyViewed: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  googleId?: string;
  createdBy?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  addresses: Address[];
  wishlist: string[];
  isEmailVerified: boolean;
}

// ================== PRODUCT TYPES ==================
export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductSpec {
  name: string;
  value: string;
  group?: string;
}

export interface ProductFAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  brand: string;
  sku: string;
  description: string;
  shortDescription?: string;
  specs: ProductSpec[];
  warranty: string;
  deliveryNotes?: string;
  installationNotes?: string;
  price: number;
  compareAtPrice?: number;
  discount?: number;
  discountEndsAt?: Date;
  stockQuantity: number;
  lowStockThreshold: number;
  images: ProductImage[];
  categoryId: string;
  subcategoryId?: string;
  tags: string[];
  faqs: ProductFAQ[];
  relatedProductIds: string[];
  isActive: boolean;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  soldCount: number;
  viewCount: number;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListItem {
  id: string;
  title: string;
  slug: string;
  brand: string;
  price: number;
  compareAtPrice?: number;
  discount?: number;
  stockQuantity: number;
  primaryImage?: ProductImage;
  categoryId: string;
  isFeatured: boolean;
  averageRating: number;
  reviewCount: number;
  soldCount: number;
}

// ================== CATEGORY TYPES ==================
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  parentId?: string;
  order: number;
  isActive: boolean;
  productCount: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ================== ORDER TYPES ==================
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

export interface OrderItem {
  productId: string;
  title: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  updatedBy: string;
  note?: string;
}

export interface OrderAddress {
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

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  discountCode?: string;
  total: number;
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  shippingAddress: OrderAddress;
  notes?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ================== REVIEW TYPES ==================
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  orderId: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  moderatedBy?: string;
  moderatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ================== CART TYPES ==================
export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: Date;
}

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  discountCode?: string;
  discountAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartWithProducts extends Omit<Cart, 'items'> {
  items: (CartItem & { product: ProductListItem })[];
  subtotal: number;
  total: number;
}

// ================== OFFER TYPES ==================
export type OfferType = 'percentage' | 'fixed' | 'buy_x_get_y' | 'bundle';

export interface Offer {
  id: string;
  title: string;
  description?: string;
  code?: string;
  type: OfferType;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  productIds?: string[];
  categoryIds?: string[];
  usageLimit?: number;
  usedCount: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ================== BANNER TYPES ==================
export type BannerPosition =
  | 'hero_main'
  | 'hero_secondary'
  | 'home_middle'
  | 'home_bottom'
  | 'category_top'
  | 'product_sidebar';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  linkText?: string;
  position: BannerPosition;
  backgroundColor?: string;
  textColor?: string;
  order: number;
  startsAt?: Date;
  endsAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ================== NOTIFICATION TYPES ==================
export type NotificationType =
  | 'order_new'
  | 'order_status'
  | 'review_new'
  | 'stock_low'
  | 'promo'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

// ================== NEWSLETTER TYPES ==================
export interface NewsletterSubscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date;
}

// ================== CONTACT TYPES ==================
export type ContactStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactStatus;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ================== BLOG TYPES ==================
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  categoryId?: string;
  tags: string[];
  authorId: string;
  isPublished: boolean;
  publishedAt?: Date;
  metaTitle?: string;
  metaDescription?: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ================== CMS TYPES ==================
export interface CMSContent {
  id: string;
  key: string;
  type: 'text' | 'html' | 'json' | 'image';
  value: string;
  description?: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  isActive: boolean;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  categoryId?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ================== ANALYTICS TYPES ==================
export interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  pendingOrders: number;
  todayOrders: number;
  todayRevenue: number;
  conversionRate: number;
}

export interface SalesAnalytics {
  period: string;
  orders: number;
  revenue: number;
  averageOrderValue: number;
}

export interface TopProduct {
  productId: string;
  title: string;
  soldCount: number;
  revenue: number;
}

export interface TopCategory {
  categoryId: string;
  name: string;
  soldCount: number;
  revenue: number;
}

export interface OrderStatusDistribution {
  status: OrderStatus;
  count: number;
  percentage: number;
}

// ================== AUDIT LOG TYPES ==================
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'status_change'
  | 'permission_change';

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ================== API RESPONSE TYPES ==================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthResponse {
  success: boolean;
  user: UserPublic;
  accessToken: string;
}

// ================== FILTER TYPES ==================
export interface ProductFilters {
  search?: string;
  categoryIds?: string[];
  brandIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  tags?: string[];
}

export interface ProductSort {
  field: 'price' | 'createdAt' | 'rating' | 'soldCount' | 'title';
  order: 'asc' | 'desc';
}

export interface OrderFilters {
  status?: OrderStatus[];
  paymentMethod?: PaymentMethod[];
  paymentStatus?: PaymentStatus[];
  startDate?: Date;
  endDate?: Date;
  search?: string;
}
