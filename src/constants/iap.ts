import {
  SubscriptionType,
  SUBSCRIPTION_PRODUCTS,
} from '../types/purchase.types';

// IAP Product IDs (kept for reference but not used - app is free)
export const IAP_PRODUCT_IDS = {
  MONTHLY: SUBSCRIPTION_PRODUCTS[SubscriptionType.MONTHLY].id,
  ANNUAL: SUBSCRIPTION_PRODUCTS[SubscriptionType.ANNUAL].id,
};

// App is completely free - no limits
export const FREE_TIER_LIMITS = {
  MAX_PHOTOS: 100, // Generous limit for all users
  MAX_TRANSITIONS: 13, // All transitions available
  MAX_EFFECTS: 8, // All effects available
  MAX_EXPORT_QUALITY: '4K' as const, // Best quality for everyone
};

// Premium tier limits (same as free - app is free)
export const PREMIUM_TIER_LIMITS = {
  MAX_PHOTOS: 100,
  MAX_TRANSITIONS: 13,
  MAX_EFFECTS: 8,
  MAX_EXPORT_QUALITY: '4K' as const,
};

// Feature flags (all features enabled for free)
export const PREMIUM_FEATURES = {
  UNLIMITED_PHOTOS: 'unlimitedPhotos',
  PREMIUM_TRANSITIONS: 'premiumTransitions',
  CUSTOM_MUSIC: 'customMusic',
  EXPORT_4K: 'export4K',
  NO_WATERMARK: 'noWatermark',
  ADVANCED_EFFECTS: 'advancedEffects',
  PRIORITY_SUPPORT: 'prioritySupport',
  CLOUD_SYNC: 'cloudSync',
} as const;

// Paywall configuration (not used - app is free)
export const PAYWALL_CONFIG = {
  MONTHLY_PRICE: '$0.00',
  ANNUAL_PRICE: '$0.00',
  ANNUAL_SAVINGS: '100%',
  TRIAL_DAYS_MONTHLY: 0,
  TRIAL_DAYS_ANNUAL: 0,
};
