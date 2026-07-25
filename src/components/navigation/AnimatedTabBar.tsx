import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';

/**
 * Drop-in replacement for the default tab bar renderer — wraps it in an
 * Animated.View whose translateY/opacity are driven by whichever screen's
 * scroll handler last fired (see TabBarVisibilityContext). The tab bar
 * itself (icons, labels, colors) is untouched — this only adds the
 * hide-on-scroll-down / show-on-scroll-up motion around it.
 */
export function AnimatedTabBar(props: BottomTabBarProps) {
  const { translateY, opacity } = useTabBarVisibility();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}