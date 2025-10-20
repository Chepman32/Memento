import { SubscriptionType, SUBSCRIPTION_PRODUCTS } from '../types/purchase.types';

// IAP Product IDs
export const IAP_PRODUCT_IDS = {
  MONTHLY: SUBSCRIPTION_PRODUCTS[SubscriptionType.MONTHLY].id,
  ANNUAL: SUBSCRIPTION_PRODUCTS[SubscriptionType.ANNUAL].id,
};

// Free tier limits
export const FREE_TIER_LIMITS = {
  MAX_PHOTOS: 5,
  MAX_TRANSITIONS: 6,
  MAX_EFFECTS: 3,
  MAX_EXPORT_QUALITY: '1080p' as const,
};

// Premium tier limits
export const PREMIUM_TIER_LIMITS = {
  MAX_PHOTOS: 50,
  MAX_TRANSITIONS: 13,
  MAX_EFFECTS: 8,
  MAX_EXPORT_QUALITY: '4K' as const,
};

// Feature flags
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

// Paywall configuration
export const PAYWALL_CONFIG = {
  MONTHLY_PRICE: '$4.99',
  ANNUAL_PRICE: '$29.99',
  ANNUAL_SAVINGS: '50%',
  TRIAL_DAYS_MONTHLY: 3,
  TRIAL_DAYS_ANNUAL: 7,
};
