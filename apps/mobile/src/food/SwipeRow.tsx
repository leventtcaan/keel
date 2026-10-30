import { Component, type ReactNode } from 'react';
import { Animated, type LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { useReduceMotion } from '@/theme/useReduceMotion';
import { tokens } from '@/theme/tokens';

import { foodParams } from './params';

type Props = {
  children: ReactNode;
  /** Already translated: the word behind the row ("Delete"). */
  label: string;
  /** The row was deleted, by a tap on the revealed button or by a full swipe (the screen takes it out and offers Undo). */
  onDelete: () => void;
  testID?: string;
};

/** A swipe that is more across than down: a list scrolling must not start a delete. */
const SIDEWAYS = 1.5;
const STARTS_AT = 12;

type BodyProps = Props & { reduce: boolean; surface: string; warn: string; onWarn: string };

/**
 * The gesture itself, a class: a gesture outlives the render it began in and must read the latest props when it ends (the delete to
 * call, Reduce Motion), which a class does with `this.props` and a function component only with refs the React linter forbids to
 * hand to a gesture. It is the plain React Native gesture system (PanResponder and Animated): no new dependency, the same in tests.
 */
class SwipeBody extends Component<BodyProps> {
  private readonly x = new Animated.Value(0);
  /** Whether the red Delete is showing and waiting for a tap. */
  private open = false;
  private width = 0;

  private settle(to: number, then?: () => void) {
    if (this.props.reduce) {
      this.x.setValue(to);
      then?.();
    } else Animated.timing(this.x, { toValue: to, duration: 150, useNativeDriver: true }).start(then);
  }

  private readonly pan = PanResponder.create({
    // An open row takes the first touch (a tap on it closes it); a closed one waits for a sideways drag.
    onStartShouldSetPanResponder: () => this.open,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > STARTS_AT && Math.abs(g.dx) > Math.abs(g.dy) * SIDEWAYS,
    onPanResponderMove: (_, g) => this.x.setValue(Math.min(0, (this.open ? -foodParams.swipeDeletePx : 0) + g.dx)),
    onPanResponderRelease: (_, g) => {
      const end = (this.open ? -foodParams.swipeDeletePx : 0) + g.dx;
      if (this.width > 0 && end <= -this.width * foodParams.swipeFullFraction) {
        // A full swipe is the delete itself; the banner has the Undo.
        this.open = false;
        this.settle(-this.width, () => this.props.onDelete());
      } else if (end <= -foodParams.swipeDeletePx * foodParams.swipeRevealFraction && Math.abs(g.dx) > 0) {
        this.open = true;
        this.settle(-foodParams.swipeDeletePx);
      } else {
        this.open = false;
        this.settle(0);
      }
    },
    onPanResponderTerminate: () => this.settle(this.open ? -foodParams.swipeDeletePx : 0),
  });

  private readonly measured = (event: LayoutChangeEvent) => {
    this.width = event.nativeEvent.layout.width;
  };

  render() {
    const { children, label, onDelete, testID, surface, warn, onWarn } = this.props;
    return (
      <View style={styles.wrap} onLayout={this.measured}>
        <Pressable
          testID={testID === undefined ? undefined : `${testID}-delete`}
          accessibilityRole="button"
          accessibilityLabel={label}
          // VoiceOver deletes with the custom action on the row below; this button is for the finger that swiped.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={onDelete}
          style={[styles.behind, { backgroundColor: warn }]}>
          <Text style={[styles.word, { color: onWarn }]}>{label}</Text>
        </Pressable>
        <Animated.View
          testID={testID}
          {...this.pan.panHandlers}
          accessibilityActions={[{ name: 'delete', label }]}
          onAccessibilityAction={(event) => event.nativeEvent.actionName === 'delete' && onDelete()}
          style={{ transform: [{ translateX: this.x }], backgroundColor: surface }}>
          {children}
        </Animated.View>
      </View>
    );
  }
}

/**
 * A row that deletes by swiping left (K-1063; the iOS list habit, as Mail does it): a swipe shows the red Delete behind the row and it waits
 * for a tap; a swipe all the way across deletes at once, and the app's banner offers Undo either way; a touch on an open row closes it. A
 * fast long swipe cannot delete without the person seeing the button: only the full swipe past `swipe_full_fraction` does. VoiceOver gets the
 * same as a custom action on the row, so nothing needs a gesture. With Reduce Motion the row jumps instead of sliding.
 */
export function SwipeRow(props: Props) {
  const { color } = useTheme();
  const reduce = useReduceMotion();
  return <SwipeBody {...props} reduce={reduce} surface={color.surface} warn={color.warn} onWarn={color.background} />;
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  behind: { position: 'absolute', top: 0, bottom: 0, right: 0, width: foodParams.swipeDeletePx, alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
});
