import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useThemeStore } from '../../store/themeStore';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../../constants/theme';

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
  variant?: 'subtle' | 'vibrant' | 'static';
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  variant = 'subtle',
}) => {
  const { colors } = useThemeStore();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (variant !== 'static') {
      progress.value = withRepeat(
        withTiming(1, { duration: 10000 }),
        -1,
        true
      );
    }
  }, [variant]);

  const getGradientColors = (): [string, string, string] => {
    switch (variant) {
      case 'vibrant':
        return [colors.primary, colors.secondary, colors.accent];
      case 'subtle':
        return [colors.background, colors.surface, colors.background];
      default:
        return [colors.background, colors.background, colors.background];
    }
  };

  const [color1, color2, color3] = getGradientColors();

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(SCREEN_WIDTH, SCREEN_HEIGHT)}
            colors={[color1, color2, color3]}
          />
        </Rect>
      </Canvas>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
});
