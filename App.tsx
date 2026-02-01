/**
 * SlideMint App
 * Turn photos into beautiful memory slideshows
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/themeStore';
import useProjectStore from './src/store/projectStore';
import { useLanguageInitialization } from './src/hooks';
import { Theme } from './src/types/theme.types';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function App() {
  const { colors, theme } = useThemeStore();
  const { isInitialized } = useLanguageInitialization();
  const { migrateAllProjects } = useProjectStore();

  useEffect(() => {
    // Set status bar style based on theme
    const isDark = theme === Theme.DARK;
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
  }, [theme]);

  useEffect(() => {
    // Migrate existing projects to persistent storage on startup
    migrateAllProjects().catch(err => {
      console.warn('[App] Photo migration failed:', err);
    });
  }, [migrateAllProjects]);

  // Show loading screen while language is being initialized
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} />
    );
  }

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
