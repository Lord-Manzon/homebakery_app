import { createContext, useContext, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

// Tuning knobs for the hide/show feel:
const HIDE_AFTER_PX = 10;     // downward movement needed before hiding (ignores tiny jitter)
const SHOW_AFTER_PX = 4;      // upward movement needed before showing — small on purpose,
                               // so it reacts almost instantly to "user started scrolling up"
const DONT_HIDE_BEFORE_Y = 40; // don't hide while still near the very top of the list
const HIDDEN_OFFSET = 90;      // px the tab bar slides down when hidden
const ANIM_DURATION = 250;     // ms — within the requested 200–300ms range

type TabBarVisibilityContextValue = {
  translateY: SharedValue<number>;
  opacity: SharedValue<number>;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(null);

export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const lastOffset = useRef(0);
  const isHidden = useRef(false);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastOffset.current;

    if (delta > HIDE_AFTER_PX && y > DONT_HIDE_BEFORE_Y && !isHidden.current) {
      isHidden.current = true;
      translateY.value = withTiming(HIDDEN_OFFSET, { duration: ANIM_DURATION });
      opacity.value = withTiming(0, { duration: ANIM_DURATION });
    } else if (delta < -SHOW_AFTER_PX && isHidden.current) {
      isHidden.current = false;
      translateY.value = withTiming(0, { duration: ANIM_DURATION });
      opacity.value = withTiming(1, { duration: ANIM_DURATION });
    }

    lastOffset.current = y;
  }

  return (
    <TabBarVisibilityContext.Provider value={{ translateY, opacity, onScroll }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

/**
 * Attach `onScroll` (+ `scrollEventThrottle={16}`) to a screen's
 * ScrollView/FlatList/SectionList to make it participate in the
 * hide-on-scroll-down / show-on-scroll-up tab bar behavior.
 */
export function useTabBarVisibility() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    throw new Error('useTabBarVisibility must be used inside TabBarVisibilityProvider');
  }
  return ctx;
}
