export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SOLAR = 'solar',
  MONO = 'mono',
}

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  spacing: typeof import('../constants/theme').SPACING;
  radii: typeof import('../constants/theme').RADII;
  typography: typeof import('../constants/theme').TYPOGRAPHY;
  shadows: typeof import('../constants/theme').SHADOWS;
}
