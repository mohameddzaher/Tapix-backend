// ============================================
// Tapix E-Commerce Platform - Shared Utilities
// ============================================

// ================== FORMATTING ==================
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(d);
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(d);
};

// ================== STRING UTILITIES ==================
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const truncate = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
};

export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const titleCase = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ================== ORDER UTILITIES ==================
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TPX-${timestamp}-${random}`;
};

export const getOrderStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    new: 'New Order',
    accepted: 'Order Accepted',
    in_progress: 'In Progress',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    failed: 'Failed',
  };
  return labels[status] || status;
};

export const getOrderStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    new: '#3B82F6',
    accepted: '#8B5CF6',
    in_progress: '#F59E0B',
    out_for_delivery: '#06B6D4',
    delivered: '#10B981',
    cancelled: '#EF4444',
    failed: '#DC2626',
  };
  return colors[status] || '#6B7280';
};

export const getPaymentStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  };
  return labels[status] || status;
};

// ================== PRODUCT UTILITIES ==================
export const calculateDiscount = (price: number, compareAtPrice?: number): number | null => {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
};

export const getStockStatus = (
  quantity: number,
  lowThreshold = 5
): { label: string; color: string; urgency: 'high' | 'medium' | 'low' | 'none' } => {
  if (quantity === 0) {
    return { label: 'Out of Stock', color: '#EF4444', urgency: 'none' };
  }
  if (quantity <= lowThreshold) {
    return { label: `Only ${quantity} left!`, color: '#F59E0B', urgency: 'high' };
  }
  if (quantity <= lowThreshold * 2) {
    return { label: 'Limited Stock', color: '#F59E0B', urgency: 'medium' };
  }
  return { label: 'In Stock', color: '#10B981', urgency: 'low' };
};

export const generateSocialProofMessage = (
  soldCount: number,
  recentSoldCount: number
): string | null => {
  if (recentSoldCount >= 10) {
    return `${recentSoldCount} people bought this today`;
  }
  if (recentSoldCount >= 5) {
    return `${recentSoldCount} sold in the last 24 hours`;
  }
  if (soldCount >= 100) {
    return `${soldCount}+ sold`;
  }
  if (soldCount >= 50) {
    return 'Popular item';
  }
  if (soldCount >= 20) {
    return 'Trending';
  }
  return null;
};

// ================== RATING UTILITIES ==================
export const getRatingLabel = (rating: number): string => {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4) return 'Very Good';
  if (rating >= 3.5) return 'Good';
  if (rating >= 3) return 'Average';
  if (rating >= 2) return 'Fair';
  return 'Poor';
};

export const generateRatingStars = (rating: number): string => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
};

// ================== VALIDATION UTILITIES ==================
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-+()]{8,20}$/;
  return phoneRegex.test(phone);
};

// ================== ARRAY UTILITIES ==================
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const uniqueBy = <T, K>(array: T[], keyFn: (item: T) => K): T[] => {
  const seen = new Set<K>();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ================== OBJECT UTILITIES ==================
export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result as Omit<T, K>;
};

// ================== CONSTANTS ==================
export const ORDER_STATUSES = [
  'new',
  'accepted',
  'in_progress',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'failed',
] as const;

export const PAYMENT_METHODS = ['cash_on_delivery', 'card', 'apple_pay'] as const;

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export const USER_ROLES = ['super_admin', 'admin', 'user'] as const;

export const BANNER_POSITIONS = [
  'hero_main',
  'hero_secondary',
  'home_middle',
  'home_bottom',
  'category_top',
  'product_sidebar',
] as const;

export const DEFAULT_PERMISSIONS = {
  orders: { read: false, write: false },
  products: { read: false, write: false },
  offers: { read: false, write: false },
  reviews: { moderate: false },
  analytics: { limited: false, full: false },
  staff: { read: false, write: false },
  cms: { read: false, write: false },
};

export const ADMIN_DEFAULT_PERMISSIONS = {
  orders: { read: true, write: true },
  products: { read: true, write: true },
  offers: { read: true, write: true },
  reviews: { moderate: true },
  analytics: { limited: true, full: false },
  staff: { read: false, write: false },
  cms: { read: true, write: false },
};

export const SUPER_ADMIN_PERMISSIONS = {
  orders: { read: true, write: true },
  products: { read: true, write: true },
  offers: { read: true, write: true },
  reviews: { moderate: true },
  analytics: { limited: true, full: true },
  staff: { read: true, write: true },
  cms: { read: true, write: true },
};
