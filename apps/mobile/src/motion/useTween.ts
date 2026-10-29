/**
 * A number that goes to where its data says (K-1065): a bar's share, a count, a map's colour, a ring's place. It starts at `from`
 * (0: the first time something shows it fills; the value itself: it only follows a change) and, every time `target` changes,
 * eases to it on the UI thread (react-native-reanimated). With Reduce Motion on (`reduce`, from `useReduceMotion`, which the
 * caller asks, K-807) it is simply there.
 */
import { useEffect } from 'react';
import { Easing, type SharedValue, useSharedValue, withTiming } from '@/motion/reanimated';

import { tokens } from '@/theme/tokens';

export function useTween(target: number, { reduce, from = 0, ms = tokens.motion.fillMs }: { reduce: boolean; from?: number; ms?: number }): SharedValue<number> {
  const value = useSharedValue(from);
  useEffect(() => {
    value.set(reduce ? target : withTiming(target, { duration: ms, easing: Easing.out(Easing.cubic) }));
  }, [target, reduce, ms, value]);
  return value;
}
