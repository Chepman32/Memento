/**
 * Memento App
 * Turn photos into beautiful memory slideshows
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/themeStore';
import './src/i18n';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function App() {
  const { colors, theme } = useThemeStore();

  useEffect(() => {
    // Set status bar style based on theme
    const isDark = theme === 'dark';
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
  }, [theme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
