import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = {
  header: (open: boolean) => React.ReactNode;
  children: React.ReactNode;
  initiallyOpen?: boolean;
};

// Animates height on the UI thread via Reanimated (not JS-thread layout
// recalculation), so this stays smooth even on lower-end Android devices.
// Content height is measured once via an invisible off-screen copy, then
// the real, visible copy sits inside an animated-height clipping container.
export function Accordion({ header, children, initiallyOpen = false }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useSharedValue(initiallyOpen ? 1 : 0);

  function toggle() {
    const next = !open;
    setOpen(next);
    progress.value = withTiming(next ? 1 : 0, { duration: 220 });
  }

  const animatedStyle = useAnimatedStyle(() => ({
    height: progress.value * contentHeight,
  }));

  return (
    <View>
      <TouchableOpacity activeOpacity={0.7} onPress={toggle}>
        {header(open)}
      </TouchableOpacity>

      {contentHeight === 0 && (
        <View
          style={{ position: 'absolute', opacity: 0, left: 0, right: 0 }}
          pointerEvents="none"
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          {children}
        </View>
      )}

      <Animated.View style={[{ overflow: 'hidden' }, animatedStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}