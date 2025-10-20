import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import { sounds } from '../utils/soundEffects';
import { SCREEN_WIDTH, SCREEN_HEIGHT, TYPOGRAPHY } from '../constants/theme';
import { SPRING_CONFIGS } from '../constants/animations';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

const LOGO_SIZE = 120;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { colors } = useThemeStore();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Preload sounds
    sounds.preload();

    // Animate logo entrance
    scale.value = withSpring(1, SPRING_CONFIGS.bouncy);
    opacity.value = withTiming(1, { duration: 600 });
    rotation.value = withSequence(
      withTiming(360, { duration: 800, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 0 })
    );

    // Navigate to home after animation
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated background */}
      <Canvas style={styles.canvas}>
        <Group opacity={0.1}>
          <Circle
            cx={SCREEN_WIDTH / 2}
            cy={SCREEN_HEIGHT / 2}
            r={LOGO_SIZE * 2}
            color={colors.primary}
          />
          <Circle
            cx={SCREEN_WIDTH / 2}
            cy={SCREEN_HEIGHT / 2}
            r={LOGO_SIZE * 1.5}
            color={colors.secondary}
          />
        </Group>
      </Canvas>

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>M</Text>
        </View>
      </Animated.View>

      {/* App name */}
      <Animated.View style={[styles.titleContainer, animatedLogoStyle]}>
        <Text style={[styles.title, { color: colors.text }]}>Memento</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Turn photos into memories
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h1,
    marginBottom: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.body2,
  },
});

export default SplashScreen;
