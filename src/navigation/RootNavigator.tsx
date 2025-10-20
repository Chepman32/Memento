import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { RootStackParamList } from './navigationTypes';
import { useThemeStore } from '../store/themeStore';

// Screens
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import ImageSelectionScreen from '../screens/ImageSelectionScreen';
import EditorScreen from '../screens/EditorScreen';
import PreviewScreen from '../screens/PreviewScreen';
import ExportScreen from '../screens/ExportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PaywallScreen from '../screens/PaywallScreen';

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { colors } = useThemeStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          cardStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ImageSelection"
          component={ImageSelectionScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          }}
        />
        <Stack.Screen
          name="Editor"
          component={EditorScreen}
        />
        <Stack.Screen
          name="Preview"
          component={PreviewScreen}
        />
        <Stack.Screen
          name="Export"
          component={ExportScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
