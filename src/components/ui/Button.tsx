import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { PressableScale } from '@/components/motion/PressableScale';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
};

/**
 * Standard tappable button — 4 variants covering every case in the app:
 *  - primary: main CTA (Save, Add Order) — solid brand color
 *  - secondary: alternate action next to a primary — outlined
 *  - ghost: low-emphasis action (Cancel) — text only
 *  - destructive: delete/remove actions — solid error color
 *
 * Uses PressableScale (step 4) for consistent press feedback instead of
 * opacity-fade, so tapping any button in the app feels the same.
 */
export function Button({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const Colors = useTheme();

  const variantStyles = {
    primary: { backgroundColor: Colors.primary, borderWidth: 0 },
    secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
    destructive: { backgroundColor: Colors.error, borderWidth: 0 },
  }[variant];

  const textColor = {
    primary: '#fff',
    secondary: Colors.primary,
    ghost: Colors.textSecondary,
    destructive: '#fff',
  }[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, variantStyles, (disabled || loading) && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
