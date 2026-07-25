import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { ReactNode, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

type PopupSheetProps = {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  headerRight?: ReactNode; // replaces the default X button when provided
};

const CLOSE_DRAG_THRESHOLD = 100;

// A reusable popup card for short forms — dim background, tap outside to
// close, explicit close button, swipe-down to dismiss, slides up as a
// rounded card rather than taking the full screen.
//
// Uses react-native-gesture-handler (not PanResponder) because
// PanResponder's gesture tracking is unreliable when this component is
// rendered inside a real RN <Modal> (as VariantFormModal does) — touch
// deltas don't propagate correctly across that native boundary on Android.
//
// The drag zone View has collapsable={false} + an explicit style — without
// this, Android's renderer "flattens" plain unstyled Views as an
// optimization, which silently breaks gesture-handler's hit-testing on
// everything except a child with its own native rendering (like the close
// button), which is why swipe only worked directly over the X before.
export default function PopupSheet({ title, children, onClose, headerRight }: PopupSheetProps) {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const translateY = useSharedValue(0);

  function close() {
    if (onClose) onClose();
    else router.back();
  }

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > CLOSE_DRAG_THRESHOLD) {
        runOnJS(close)();
      } else {
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Tap outside to close */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={close}
      />

      <Animated.View style={[styles.card, animatedStyle]}>
        <GestureDetector gesture={panGesture}>
          <View collapsable={false} style={styles.dragZone}>
            <View style={styles.dragHandle} />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {headerRight ?? (
                <TouchableOpacity onPress={close} style={styles.closeBtn}>
                  <X size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </GestureDetector>

        {children}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  dragZone: {
    width: '100%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});