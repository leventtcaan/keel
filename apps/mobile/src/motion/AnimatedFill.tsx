import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from '@/motion/reanimated';

import { useReduceMotion } from '@/theme/useReduceMotion';

import { useTween } from './useTween';

type Props = {
  /** How much of the track is filled, in percent (0 to 100). */
  percent: number;
  style: StyleProp<ViewStyle>;
  testID?: string;
  /** What the share sets: a fill's width (default), or where a mark stands along the track. */
  edge?: 'width' | 'left';
};

/** A bar's fill that grows or shrinks to its share when the data changes (K-1065); the share is the caller's, nothing is counted here. */
export function AnimatedFill({ percent, style, testID, edge = 'width' }: Props) {
  const to = Math.min(100, Math.max(0, percent));
  // A fill grows from nothing the first time it shows; a mark only follows a change of its place.
  const reduce = useReduceMotion();
  const shown = useTween(to, { reduce, from: edge === 'width' ? 0 : to });
  const moving = useAnimatedStyle(() => (edge === 'width' ? { width: `${shown.value}%` } : { left: `${shown.value}%` }));
  return <Animated.View testID={testID} style={[style, moving]} />;
}
