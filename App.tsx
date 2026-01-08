/**
 * SlideMint App
 * Turn photos into beautiful memory slideshows
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/themeStore';
import { useSettingsStore } from './src/store/settingsStore';
import { Theme } from './src/types/theme.types';
import i18n, { changeLanguage } from './src/i18n';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function App() {
  const { colors, theme } = useThemeStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    // Set status bar style based on theme
    const isDark = theme === Theme.DARK;
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
  }, [theme]);

  useEffect(() => {
    // Sync language from settings on mount and when settings change
    if (settings.language) {
      const currentLang = i18n.language || 'en';
      const normalizedCurrent = currentLang.split('-')[0].toLowerCase();
      const normalizedSettings = settings.language.split('-')[0].toLowerCase();
      
      // Only change if different to avoid unnecessary updates
      if (normalizedCurrent !== normalizedSettings) {
        changeLanguage(settings.language);
      }
    }
  }, [settings.language]);

  const containerStyle = { flex: 1 };

  return (
    <GestureHandlerRootView style={containerStyle}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={theme === Theme.DARK ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
