import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  /** How small it shrinks on press, 0-1 (default 0.97 = subtle) */
  scaleTo?: number;
};

/**
 * Reusable press-feedback wrapper — scales down slightly on press.
 * Use instead of raw Pressable/TouchableOpacity wherever the element is
 * tappable (cards, buttons, list rows) for a consistent tactile feel.
 *
 * Uses plain Reanimated (not moti/interactions) to avoid an extra
 * dependency — this is the only animation moti doesn't cover well itself.
 *
 * Usage:
 *   <PressableScale onPress={...}><Card>...</Card></PressableScale>
 */
export function PressableScale({
  children,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 100 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 150 });
        onPressOut?.(e);
      }}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
