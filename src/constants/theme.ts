/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */


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
    primarySoft: '#F0AD7A',
    surface: '#FAF8F5',
    infoBackground: '#EBF5FB',
    successBackground: '#EAFAF1',
    errorBackground: '#FDEDEC',
    lowStockBackground: '#FFF3E0',
    lowStockText: '#E07B39',

    surfaceMuted: '#F0ECE6',
    overlay: 'rgba(26, 21, 18, 0.4)',
  },
  dark: {
  primary: '#F0975A',
  primarySoft: '#F8C79A',        // ← add

  background: '#1A1512',
  card: '#30261F',
  surface: '#352A23',            // ← add

  textPrimary: '#F5F1EC',
  textSecondary: '#C2B3A6',
  textMuted: '#9A8D82',

  border: '#4A4037',

  success: '#57C27B',
  error: '#FF6B5B',
  warning: '#F5A623',
  info: '#5DADE2',

  successBackground: '#1F3A2C',  // ✅ keep
  infoBackground: '#22333F',     // ✅ keep
  errorBackground: '#3D2420',    // ✅ keep

  lowStockBackground: '#4A361D',
  lowStockText: '#F0975A',

  surfaceMuted: '#3D322A',
  overlay: 'rgba(0, 0, 0, 0.6)',
}
} as const;

export type ThemeColorKey = keyof typeof ThemePalettes.light;

// Backward-compatible static export — screens not yet converted to useTheme()
// keep importing this and stay light-mode-only until they're migrated.
// TODO: remove once every screen uses useTheme() instead of this.
export const Colors = ThemePalettes.light;



export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const Shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12 },
    android: { elevation: 8 },
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
