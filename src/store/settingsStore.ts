import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, HapticStrength, ExportLocation, LanguageCode } from '../types/settings.types';
import { Theme } from '../types/theme.types';
import { TransitionType, ExportQuality } from '../types/project.types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: Theme.LIGHT,
  soundEnabled: true,
  hapticEnabled: true,
  hapticStrength: HapticStrength.MEDIUM,
  language: 'en',
  defaultPhotoDuration: 3,
  defaultTransition: TransitionType.FADE,
  defaultQuality: ExportQuality.MEDIUM,
  cacheSize: 0,
  exportLocation: ExportLocation.PHOTOS,
};

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  updateCacheSize: (size: number) => void;
  clearCache: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,

      updateSettings: (updates: Partial<AppSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...updates,
          },
        }));
      },

      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
      },

      updateCacheSize: (size: number) => {
        set((state) => ({
          settings: {
            ...state.settings,
            cacheSize: size,
          },
        }));
      },

      clearCache: async () => {
        // Implementation will depend on cache management strategy
        // For now, just reset the cache size
        set((state) => ({
          settings: {
            ...state.settings,
            cacheSize: 0,
          },
        }));
      },
    }),
    {
      name: 'memento-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
