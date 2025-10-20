export enum SubscriptionType {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

export enum PremiumFeature {
  UNLIMITED_PHOTOS = 'unlimitedPhotos',
  PREMIUM_TRANSITIONS = 'premiumTransitions',
  CUSTOM_MUSIC = 'customMusic',
  EXPORT_4K = 'export4K',
  NO_WATERMARK = 'noWatermark',
  ADVANCED_EFFECTS = 'advancedEffects',
  PRIORITY_SUPPORT = 'prioritySupport',
  CLOUD_SYNC = 'cloudSync',
}

export interface PurchaseState {
  isPremium: boolean;
  subscriptionType?: SubscriptionType;
  expirationDate?: Date;
  features: PremiumFeature[];
  isTrialActive: boolean;
  trialEndDate?: Date;
}

export interface ProductConfig {
  id: string;
  type: SubscriptionType;
  price: string;
  currency: string;
  trialDays: number;
  features: PremiumFeature[];
}

export const SUBSCRIPTION_PRODUCTS: Record<SubscriptionType, ProductConfig> = {
  [SubscriptionType.MONTHLY]: {
    id: 'com.memento.premium.monthly',
    type: SubscriptionType.MONTHLY,
    price: '4.99',
    currency: 'USD',
    trialDays: 3,
    features: [
      PremiumFeature.UNLIMITED_PHOTOS,
      PremiumFeature.PREMIUM_TRANSITIONS,
      PremiumFeature.CUSTOM_MUSIC,
      PremiumFeature.EXPORT_4K,
      PremiumFeature.NO_WATERMARK,
      PremiumFeature.ADVANCED_EFFECTS,
      PremiumFeature.PRIORITY_SUPPORT,
    ],
  },
  [SubscriptionType.ANNUAL]: {
    id: 'com.memento.premium.annual',
    type: SubscriptionType.ANNUAL,
    price: '29.99',
    currency: 'USD',
    trialDays: 7,
    features: [
      PremiumFeature.UNLIMITED_PHOTOS,
      PremiumFeature.PREMIUM_TRANSITIONS,
      PremiumFeature.CUSTOM_MUSIC,
      PremiumFeature.EXPORT_4K,
      PremiumFeature.NO_WATERMARK,
      PremiumFeature.ADVANCED_EFFECTS,
      PremiumFeature.PRIORITY_SUPPORT,
      PremiumFeature.CLOUD_SYNC,
    ],
  },
};
