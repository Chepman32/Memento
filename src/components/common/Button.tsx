import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { SPACING, RADII, TYPOGRAPHY, SHADOWS } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'text' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}) => {
  const { colors } = useThemeStore();

  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: RADII.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        height: 36,
      },
      medium: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        height: 48,
      },
      large: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        height: 56,
      },
    };

    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: colors.primary,
        ...SHADOWS.sm,
      },
      secondary: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary,
      },
      text: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: colors.error,
        ...SHADOWS.sm,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.5 }),
    };
  };

  const getTextStyles = (): TextStyle => {
    const variantTextStyles: Record<ButtonVariant, TextStyle> = {
      primary: {
        color: '#FFFFFF',
      },
      secondary: {
        color: colors.text,
      },
      outlined: {
        color: colors.primary,
      },
      text: {
        color: colors.primary,
      },
      danger: {
        color: '#FFFFFF',
      },
    };

    const sizeTextStyles: Record<ButtonSize, TextStyle> = {
      small: {
        fontSize: 14,
        fontWeight: '600',
      },
      medium: {
        fontSize: 16,
        fontWeight: '600',
      },
      large: {
        fontSize: 18,
        fontWeight: '600',
      },
    };

    return {
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
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
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[getTextStyles(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: SPACING.sm,
  },
});
