import { PressableScale } from '@/components/motion/PressableScale';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
};

/**
 * Standard tappable button — 5 variants covering every case in the app:
 *  - primary: main CTA (Save, Add Order) — solid brand color
 *  - secondary: alternate action next to a primary — outlined
 *  - ghost: low-emphasis action (Cancel) — text only
 *  - destructive: delete/remove actions — solid error color
 *  - success: confirm/complete actions (Complete Batch) — solid success color,
 *    deliberately distinct from primary so "this finishes something" reads
 *    differently from "this is the main action on this screen"
 *
 * Uses PressableScale (step 4) for consistent press feedback instead of
 * opacity-fade, so tapping any button in the app feels the same.
 */
export function Button({ label, onPress, variant = 'primary', disabled, loading, icon: Icon }: Props) {
  const Colors = useTheme();

  const variantStyles = {
    primary: { backgroundColor: Colors.primary, borderWidth: 0 },
    secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
    destructive: { backgroundColor: Colors.error, borderWidth: 0 },
    success: { backgroundColor: Colors.success, borderWidth: 0 },
  }[variant];

  const textColor = {
    primary: '#fff',
    secondary: Colors.primary,
    ghost: Colors.textSecondary,
    destructive: '#fff',
    success: '#fff',
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
        <View style={styles.content}>
          {Icon && <Icon size={18} color={textColor} />}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </View>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half + 2,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});