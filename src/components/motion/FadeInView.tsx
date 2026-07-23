import { MotiView } from 'moti';
import type { ViewProps } from 'react-native';

type Props = ViewProps & {
  /** Stagger multiple items by passing an increasing delay (e.g. index * 50) */
  delay?: number;
};

/**
 * Reusable mount animation — fades in and slides up 8px on appear.
 * Wrap any card/section with this instead of a plain <View> to get a
 * consistent "appear" motion without repeating animation config everywhere.
 *
 * Usage:
 *   <FadeInView delay={index * 50}><StatCard ... /></FadeInView>
 */
export function FadeInView({ children, delay = 0, style, ...rest }: Props) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250, delay }}
      style={style}
      {...rest}
    >
      {children}
    </MotiView>
  );
}
