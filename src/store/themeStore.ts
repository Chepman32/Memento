import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeColors } from '../types/theme.types';
import { THEME_COLORS } from '../constants/theme';

interface ThemeState {
  theme: Theme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  getColors: () => ThemeColors;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: Theme.LIGHT,
      colors: THEME_COLORS[Theme.LIGHT],

      setTheme: (theme: Theme) => {
        set({
          theme,
          colors: THEME_COLORS[theme],
        });
      },

      getColors: () => {
        return get().colors;
      },
    }),
    {
      name: 'memento-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
