import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PurchaseState,
  SubscriptionType,
  PremiumFeature,
} from '../types/purchase.types';

const ALL_FEATURES = Object.values(PremiumFeature) as PremiumFeature[];

// App is completely free - all features unlocked by default
const DEFAULT_PURCHASE_STATE: PurchaseState = {
  isPremium: true, // Always premium - app is free
  features: ALL_FEATURES,
  isTrialActive: false,
};

interface PurchaseStoreState {
  purchaseState: PurchaseState;
  updatePurchaseState: (state: Partial<PurchaseState>) => void;
  checkSubscription: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  hasFeature: (feature: PremiumFeature) => boolean;
  activateTrial: (type: SubscriptionType) => void;
  activateSubscription: (type: SubscriptionType, expirationDate: Date) => void;
  cancelSubscription: () => void;
}

export const usePurchaseStore = create<PurchaseStoreState>()(
  persist(
    (set, get) => ({
      purchaseState: DEFAULT_PURCHASE_STATE,

      updatePurchaseState: (updates: Partial<PurchaseState>) => {
        set(state => ({
          purchaseState: {
            ...state.purchaseState,
            ...updates,
          },
        }));
      },

      checkSubscription: async () => {
        // App is completely free - no subscription checks needed
        // All features are always available
      },

      restorePurchases: async () => {
        // This will be implemented with react-native-iap
        // For now, return false
        console.log('Restore purchases called');
        return false;
      },

      hasFeature: (_feature: PremiumFeature): boolean => {
        // App is completely free - all features always available
        return true;
      },

      activateTrial: (type: SubscriptionType) => {
        const trialDays = type === SubscriptionType.MONTHLY ? 3 : 7;
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        set({
          purchaseState: {
            isPremium: true,
            subscriptionType: type,
            features: ALL_FEATURES,
            isTrialActive: true,
            trialEndDate,
          },
        });
      },

      activateSubscription: (type: SubscriptionType, expirationDate: Date) => {
        set({
          purchaseState: {
            isPremium: true,
            subscriptionType: type,
            expirationDate,
            features: ALL_FEATURES,
            isTrialActive: false,
            trialEndDate: undefined,
          },
        });
      },

      cancelSubscription: () => {
        set({
          purchaseState: DEFAULT_PURCHASE_STATE,
        });
      },
    }),
    {
      name: 'slidemint-purchase',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
