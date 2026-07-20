/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const ThemePalettes = {
  light: {
    primary: '#E07B39',
    background: '#F5F5F5',
    card: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: '#EEEEEE',
    success: '#27AE60',
    error: '#E74C3C',
    warning: '#F39C12',
    info: '#2980B9',
    lowStockBackground: '#FFF3E0',
    lowStockText: '#E07B39',
  },
  dark: {
    primary: '#F0975A',
    background: '#1A1512',
    card: '#30261F',
    textPrimary: '#F5F1EC',
    textSecondary: '#C2B3A6',
    textMuted: '#9A8D82',
    border: '#4A4037',
    success: '#57C27B',
    error: '#FF6B5B',
    warning: '#F5A623',
    info: '#5DADE2',
    lowStockBackground: '#4A361D',
    lowStockText: '#F0975A',
  },
} as const;

export type ThemeColorKey = keyof typeof ThemePalettes.light;

// Backward-compatible static export — screens not yet converted to useTheme()
// keep importing this and stay light-mode-only until they're migrated.
// TODO: remove once every screen uses useTheme() instead of this.
export const Colors = ThemePalettes.light;



export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
