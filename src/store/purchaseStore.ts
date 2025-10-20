import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PurchaseState, SubscriptionType, PremiumFeature } from '../types/purchase.types';

const DEFAULT_PURCHASE_STATE: PurchaseState = {
  isPremium: false,
  features: [],
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
        set((state) => ({
          purchaseState: {
            ...state.purchaseState,
            ...updates,
          },
        }));
      },

      checkSubscription: async () => {
        // This will be implemented with react-native-iap
        // For now, just check if the subscription is expired
        const { purchaseState } = get();

        if (purchaseState.expirationDate) {
          const now = new Date();
          const expiration = new Date(purchaseState.expirationDate);

          if (now > expiration) {
            // Subscription expired
            set({
              purchaseState: {
                ...purchaseState,
                isPremium: false,
                subscriptionType: undefined,
                features: [],
              },
            });
          }
        }

        // Check trial expiration
        if (purchaseState.isTrialActive && purchaseState.trialEndDate) {
          const now = new Date();
          const trialEnd = new Date(purchaseState.trialEndDate);

          if (now > trialEnd) {
            set({
              purchaseState: {
                ...purchaseState,
                isTrialActive: false,
                isPremium: false,
                features: [],
              },
            });
          }
        }
      },

      restorePurchases: async () => {
        // This will be implemented with react-native-iap
        // For now, return false
        console.log('Restore purchases called');
        return false;
      },

      hasFeature: (feature: PremiumFeature): boolean => {
        const { purchaseState } = get();
        return purchaseState.features.includes(feature);
      },

      activateTrial: (type: SubscriptionType) => {
        const trialDays = type === SubscriptionType.MONTHLY ? 3 : 7;
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        // Get all features for this subscription type
        const features = Object.values(PremiumFeature);

        set({
          purchaseState: {
            isPremium: true,
            subscriptionType: type,
            features,
            isTrialActive: true,
            trialEndDate,
          },
        });
      },

      activateSubscription: (type: SubscriptionType, expirationDate: Date) => {
        // Get all features for this subscription type
        const features = Object.values(PremiumFeature);

        set({
          purchaseState: {
            isPremium: true,
            subscriptionType: type,
            expirationDate,
            features,
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
      name: 'memento-purchase',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
