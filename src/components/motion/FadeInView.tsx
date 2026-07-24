import { useEffect } from 'react';
import type { ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

type Props = ViewProps & {
  /** Stagger multiple items by passing an increasing delay (e.g. index * 50) */
  delay?: number;
};

/**
 * Reusable mount animation — fades in and slides up 8px on appear.
 * Wrap any card/section with this instead of a plain <View> to get a
 * consistent "appear" motion without repeating animation config everywhere.
 *
 * Rewritten to use react-native-reanimated directly instead of Moti —
 * Moti (as of 0.30.0) is still built on Reanimated 3 internals and breaks
 * on Reanimated 4 (SDK 57 default), throwing a tslib/__extends error.
 * This achieves the identical effect with the dependency you already have.
 *
 * Usage:
 *   <FadeInView delay={index * 50}><StatCard ... /></FadeInView>
 */
export function FadeInView({ children, delay = 0, style, ...rest }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 250 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 250 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
}