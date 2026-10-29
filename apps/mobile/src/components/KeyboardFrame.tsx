import { type ReactNode, useContext, useEffect, useState } from 'react';
import { Keyboard, type KeyboardEvent, LayoutAnimation, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/theme/useReduceMotion';

/** How high the keyboard stands over the frame's own foot: its height past the room the frame already leaves under it (never below 0). */
export function liftOf(windowHeight: number, keyboardTop: number, gapBelow: number): number {
  return Math.max(0, windowHeight - keyboardTop - gapBelow);
}

/**
 * A screen's scroll with its dock under it (a Save, a Continue), lifted with the keyboard (K-1065): the dock stands on the
 * keyboard, with its Done bar, instead of under it, and the scroll above gets shorter. Put at the foot of a screen's safe area:
 * what it leaves under itself is the bottom inset, and a sheet's own top offset does not matter (a sheet reaches the foot of the
 * screen; the plain KeyboardAvoidingView measures from the sheet's top and comes out short). The lift follows the keyboard's own
 * movement (a layout animation of its duration; the padding is a layout prop, which the next render of the screen would undo if
 * the UI thread drove it), and is at once under Reduce Motion. The scroll itself is a FormScroll.
 */
export function KeyboardFrame({ children }: { children: ReactNode }) {
  const window = useWindowDimensions();
  const reduce = useReduceMotion();
  const below = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const [lift, setLift] = useState(0);
  useEffect(() => {
    const raise = (event: KeyboardEvent) => {
      const to = liftOf(window.height, event.endCoordinates.screenY, below);
      if (!reduce) LayoutAnimation.configureNext({ duration: event.duration > 0 ? event.duration : 250, update: { type: LayoutAnimation.Types.keyboard } });
      setLift(to);
    };
    const subscriptions = [Keyboard.addListener('keyboardWillChangeFrame', raise), Keyboard.addListener('keyboardWillHide', raise)];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [window.height, below, reduce]);
  return (
    <View testID="keyboard-frame" style={[styles.frame, { paddingBottom: lift }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ frame: { flex: 1 } });
