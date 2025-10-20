import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Canvas, Circle, Paint } from '@shopify/react-native-skia';
import { useThemeStore } from '../../store/themeStore';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color,
}) => {
  const { colors } = useThemeStore();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const spinnerColor = color || colors.primary;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.spinner, animatedStyle]}>
        <Canvas style={{ width: size, height: size }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 4}
            style="stroke"
            strokeWidth={4}
            color={spinnerColor}
            opacity={0.3}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 4}
            style="stroke"
            strokeWidth={4}
            color={spinnerColor}
            start={0}
            end={0.75}
          />
        </Canvas>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '100%',
    height: '100%',
  },
});
