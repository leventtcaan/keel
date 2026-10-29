import { Component, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { useReduceMotion } from '@/theme/useReduceMotion';
import { tokens } from '@/theme/tokens';

import { foodParams } from './params';

type Props = {
  children: ReactNode;
  /** Already translated: the word behind the row ("Delete"). */
  label: string;
  /** The row was swiped far enough: it goes (the screen takes it out and offers Undo). */
  onDelete: () => void;
  testID?: string;
};

/** A swipe that is more across than down: a list scrolling must not start a delete. */
const SIDEWAYS = 1.5;
const STARTS_AT = 12;
const OFF_SCREEN = 4;

type BodyProps = Props & { reduce: boolean; surface: string; warn: string; onWarn: string };

/**
 * The gesture itself, a class: a gesture outlives the render it began in and must read the latest props when it ends (the delete to
 * call, Reduce Motion), which a class does with `this.props` and a function component only with refs the React linter forbids to
 * hand to a gesture. It is the plain React Native gesture system (PanResponder and Animated): no new dependency, the same in tests.
 */
class SwipeBody extends Component<BodyProps> {
  private readonly x = new Animated.Value(0);

  private settle(to: number, then?: () => void) {
    if (this.props.reduce) {
      this.x.setValue(to);
      then?.();
    } else Animated.timing(this.x, { toValue: to, duration: 150, useNativeDriver: true }).start(then);
  }

  private readonly pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > STARTS_AT && Math.abs(g.dx) > Math.abs(g.dy) * SIDEWAYS,
    onPanResponderMove: (_, g) => this.x.setValue(Math.min(0, g.dx)),
    onPanResponderRelease: (_, g) => {
      if (g.dx <= -foodParams.swipeDeletePx) this.settle(-foodParams.swipeDeletePx * OFF_SCREEN, () => this.props.onDelete());
      else this.settle(0);
    },
    onPanResponderTerminate: () => this.settle(0),
  });

  render() {
    const { children, label, onDelete, testID, surface, warn, onWarn } = this.props;
    return (
      <View testID={testID} style={styles.wrap}>
        <View style={[styles.behind, { backgroundColor: warn }]}>
          <Text style={[styles.word, { color: onWarn }]}>{label}</Text>
        </View>
        <Animated.View
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
 * A row that deletes by swiping left (K-1063; the iOS list habit): a short swipe shows the word "Delete" behind it, a swipe past
 * `swipe_delete_px` does it. VoiceOver gets the same as a custom action on the row, so nothing needs a gesture. With Reduce Motion
 * the row jumps instead of sliding.
 */
export function SwipeRow(props: Props) {
  const { color } = useTheme();
  const reduce = useReduceMotion();
  return <SwipeBody {...props} reduce={reduce} surface={color.surface} warn={color.warn} onWarn={color.background} />;
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  behind: { ...StyleSheet.absoluteFill, alignItems: 'flex-end', justifyContent: 'center', paddingRight: tokens.space.lg },
  word: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
});
