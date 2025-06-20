import { Theme, ThemeMode } from '../types';

// Main green color from reference images
export const PRIMARY_GREEN = '#00D2AA';

// Common spacing values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Common border radius values
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

// Shadow styles
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Light Theme
export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: PRIMARY_GREEN,
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#1A1A1A',
    textSecondary: '#666666',
    border: '#E0E0E0',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    card: '#FFFFFF',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  spacing,
  borderRadius,
  shadows,
};

// Dark Theme
export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    primary: PRIMARY_GREEN,
    background: '#1A1A1A',
    surface: '#2A2A2A',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    border: '#404040',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    card: '#2A2A2A',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  spacing,
  borderRadius,
  shadows,
};

// Get theme based on mode
export const getTheme = (mode: ThemeMode): Theme => {
  switch (mode) {
    case 'light':
      return lightTheme;
    case 'dark':
      return darkTheme;
    case 'system':
      // For now return light, we'll handle system detection later
      return lightTheme;
    default:
      return lightTheme;
  }
};

// Typography
export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Icon sizes
export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
};

// Default category colors
export const categoryColors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
];

// Account card colors
export const cardColors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#FFB347', // Orange
  '#87CEEB', // Sky Blue
  '#DEB887', // Tan
  '#F0E68C', // Khaki
];

// Default category icons (we'll use simple names that can be mapped to vector icons)
export const defaultCategoryIcons = {
  income: [
    'wallet',
    'briefcase',
    'cash',
    'credit-card',
    'gift',
  ],
  expense: [
    'bag',
    'restaurant',
    'car',
    'home',
    'flash',
    'heart',
    'book',
    'musical-notes',
    'film',
    'phone-portrait',
  ],
}; 