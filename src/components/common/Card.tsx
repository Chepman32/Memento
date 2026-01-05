import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { SPACING, RADII, SHADOWS } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  style?: ViewStyle;
  elevated?: boolean;
  bordered?: boolean;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  onLongPress,
  delayLongPress,
  style,
  elevated = true,
  bordered = false,
  padding = true,
}) => {
  const { colors } = useThemeStore();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: RADII.md,
    ...(elevated && SHADOWS.md),
    ...(bordered && {
      borderWidth: 1,
      borderColor: colors.border,
    }),
    ...(padding && {
      padding: SPACING.md,
    }),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        activeOpacity={0.8}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};
