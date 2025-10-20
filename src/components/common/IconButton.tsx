import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { RADII, SHADOWS } from '../../constants/theme';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 44,
  disabled = false,
  loading = false,
  variant = 'default',
  style,
}) => {
  const { colors } = useThemeStore();

  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center',
      justifyContent: 'center',
    };

    const variantStyles: Record<string, ViewStyle> = {
      default: {
        backgroundColor: 'transparent',
      },
      filled: {
        backgroundColor: colors.primary,
        ...SHADOWS.sm,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...(disabled && { opacity: 0.5 }),
    };
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[getButtonStyles(), style]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'filled' ? '#FFFFFF' : colors.primary}
          size="small"
        />
      ) : (
        icon
      )}
    </TouchableOpacity>
  );
};
