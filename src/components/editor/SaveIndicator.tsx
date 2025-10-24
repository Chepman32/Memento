import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { TYPOGRAPHY, SPACING, RADII } from '../../constants/theme';
import { SaveStatus } from '../../hooks/useAutosave';

interface SaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({ status, lastSaved }) => {
  const { colors } = useThemeStore();
  const [opacity] = useState(new Animated.Value(0));
  const [scale] = useState(new Animated.Value(0.9));

  useEffect(() => {
    if (status !== 'error') {
      // Fade out
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade in with slight scale animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [status, opacity, scale]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'saving':
      case 'saved':
        return null;
      case 'error':
        return {
          text: 'Save failed',
          color: colors.error,
          icon: '⚠',
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  if (!statusDisplay) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: statusDisplay.color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <Text style={[styles.icon, { color: statusDisplay.color }]}>
        {statusDisplay.icon}
      </Text>
      <Text style={[styles.text, { color: statusDisplay.color }]}>
        {statusDisplay.text}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  icon: {
    fontSize: 14,
    marginRight: SPACING.xs,
  },
  text: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
});
