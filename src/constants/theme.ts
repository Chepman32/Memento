import { Dimensions } from 'react-native';
import { Theme, ThemeColors } from '../types/theme.types';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Light Theme Colors
export const LIGHT_THEME: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  primary: '#007AFF',
  secondary: '#5856D6',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  accent: '#FF3B30',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#007AFF',
};

// Dark Theme Colors
export const DARK_THEME: ThemeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  border: '#38383A',
  shadow: 'rgba(255, 255, 255, 0.1)',
  accent: '#FF453A',
  error: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
  info: '#64D2FF',
};

// Solar Theme Colors
export const SOLAR_THEME: ThemeColors = {
  background: '#FFF8DC',
  surface: '#FFEAA7',
  primary: '#FF9F43',
  secondary: '#F39C12',
  text: '#5D3A00',
  textSecondary: '#8B6914',
  border: '#F0D78C',
  shadow: 'rgba(255, 140, 0, 0.2)',
  accent: '#E17055',
  error: '#E17055',
  success: '#6C5CE7',
  warning: '#FD79A8',
  info: '#74B9FF',
};

// Mono Theme Colors
export const MONO_THEME: ThemeColors = {
  background: '#E8E8E8',
  surface: '#D3D3D3',
  primary: '#4A4A4A',
  secondary: '#6B6B6B',
  text: '#1A1A1A',
  textSecondary: '#7A7A7A',
  border: '#BDBDBD',
  shadow: 'rgba(0, 0, 0, 0.15)',
  accent: '#2C2C2C',
  error: '#666666',
  success: '#8A8A8A',
  warning: '#757575',
  info: '#5C5C5C',
};

export const THEME_COLORS: Record<Theme, ThemeColors> = {
  [Theme.LIGHT]: LIGHT_THEME,
  [Theme.DARK]: DARK_THEME,
  [Theme.SOLAR]: SOLAR_THEME,
  [Theme.MONO]: MONO_THEME,
};

// Legacy color export for backward compatibility
export const COLORS = LIGHT_THEME;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADII = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body1: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  body2: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    color: COLORS.textSecondary,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};

export const ANIMATION = {
  timing: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    deceleration: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    acceleration: 'cubic-bezier(0.4, 0.0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  },
};

export const BREAKPOINTS = {
  small: 0,
  medium: 768,
  large: 1024,
  xlarge: 1280,
};

export const Z_INDEX = {
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
};
