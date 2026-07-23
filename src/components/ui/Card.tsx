import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, View, type ViewProps } from 'react-native';

type Props = ViewProps & {
  /** 'flat' = no shadow (nested inside another card/section), 'raised' = default elevated look */
  variant?: 'flat' | 'raised';
  /** Padding scale — most cards want 'md', dense list rows may want 'sm' */
  padding?: 'sm' | 'md' | 'none';
};

/**
 * Base surface for any card-like block (stat cards, list rows, sections).
 * Centralizes radius/shadow/padding so every card in the app matches —
 * change the look once here instead of per-screen.
 */
export function Card({ children, style, variant = 'raised', padding = 'md', ...rest }: Props) {
  const Colors = useTheme();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: Colors.card, borderColor: Colors.border },
        variant === 'raised' && Shadows.sm,
        padding === 'md' && styles.paddingMd,
        padding === 'sm' && styles.paddingSm,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  paddingMd: {
    padding: Spacing.three,
  },
  paddingSm: {
    padding: Spacing.two,
  },
});
