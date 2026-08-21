import React, { useEffect, useState, useCallback } from 'react';
import { View, LayoutChangeEvent, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

interface AnimatedCollapsibleProps {
  expanded: boolean;
  children: React.ReactNode;
}

const AnimatedCollapsible: React.FC<AnimatedCollapsibleProps> = ({
  expanded,
  children,
}) => {
  const [contentHeight, setContentHeight] = useState(0);
  const [shouldRender, setShouldRender] = useState(expanded);
  const animatedHeight = useSharedValue(0);
  const opacity = useSharedValue(expanded ? 1 : 0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0 && height !== contentHeight) {
        setContentHeight(height);
      }
    },
    [contentHeight],
  );

  useEffect(() => {
    if (expanded) {
      setShouldRender(true);
    }
  }, [expanded]);

  useEffect(() => {
    if (contentHeight === 0) return;

    if (expanded) {
      animatedHeight.value = withTiming(contentHeight, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    } else {
      opacity.value = withTiming(0, {
        duration: 150,
        easing: Easing.in(Easing.ease),
      });
      animatedHeight.value = withTiming(
        0,
        {
          duration: 200,
          easing: Easing.in(Easing.cubic),
        },
        finished => {
          if (finished) {
            scheduleOnRN(setShouldRender, false);
          }
        },
      );
    }
  }, [expanded, contentHeight, animatedHeight, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: opacity.value,
    overflow: 'hidden',
  }));

  return (
    <View>
      {/* Hidden measurement view - always rendered to get accurate height */}
      <View style={styles.measureView} pointerEvents="none">
        <View onLayout={handleLayout}>{children}</View>
      </View>

      {/* Animated visible view */}
      {shouldRender && (
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  measureView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
});

export default AnimatedCollapsible;
