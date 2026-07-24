import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, Text, View } from 'react-native';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

type Props = {
  label: string;
  tone?: Tone;
  /** Escape hatch for one-off colors that don't fit the standard tones (e.g. a brand-tinted status). Overrides `tone` when set. */
  color?: { bg: string; text: string };
};

/**
 * Small pill label for status (e.g. "Paid", "Low Stock", "Delivered").
 * Tone maps to your existing semantic colors — 'warning' has no dedicated
 * *Background token yet, so it uses the same color+alpha trick already
 * used elsewhere in the app (e.g. production.tsx) rather than a solid fill.
 */
export function Badge({ label, tone = 'neutral', color }: Props) {
  const Colors = useTheme();

  const toneStyles: Record<Tone, { bg: string; text: string }> = {
    success: { bg: Colors.successBackground, text: Colors.success },
    error: { bg: Colors.errorBackground, text: Colors.error },
    info: { bg: Colors.infoBackground, text: Colors.info },
    warning: { bg: Colors.warning + '20', text: Colors.warning },
    neutral: { bg: Colors.surfaceMuted, text: Colors.textSecondary },
  };

  const { bg, text } = color ?? toneStyles[tone];

  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.half + 1,
    paddingHorizontal: Spacing.two,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
});