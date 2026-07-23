import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { Card } from '@/components/ui/Card';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  icon: LucideIcon;
  value: string;
  label: string;
  /** Accent color for the icon + its background chip — defaults to primary */
  tone?: string;
  onPress?: () => void;
  /** Mount stagger — pass index * 50 when rendering a list of these */
  delay?: number;
  /** Width is controlled by the parent grid (step 6), not the card itself */
  style?: object;
};

/**
 * The stat card used across the bento dashboard grid. Width/sizing is left
 * to the parent layout (some cards full-width, some half, some third) —
 * this component only owns its internal content and motion.
 */
export function StatCard({ icon: Icon, value, label, tone, onPress, delay = 0, style }: Props) {
  const Colors = useTheme();
  const accent = tone ?? Colors.primary;

  const content = (
    <Card>
      <View style={[styles.iconChip, { backgroundColor: accent + '18' }]}>
        <Icon size={18} color={accent} />
      </View>
      <Text style={[styles.value, { color: Colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: Colors.textSecondary }]}>{label}</Text>
    </Card>
  );

  return (
    <FadeInView delay={delay} style={style}>
      {onPress ? (
        <PressableScale onPress={onPress}>{content}</PressableScale>
      ) : (
        content
      )}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  value: {
    fontFamily: Fonts.bold,
    fontSize: 22,
  },
  label: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
});
