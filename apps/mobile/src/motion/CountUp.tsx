import { useState } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import { useAnimatedReaction } from '@/motion/reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';

import { useTween } from './useTween';

type Props = {
  value: number;
  /** How the whole number is written ("1,450"); the count passes through the same writing, so the digits never jump. */
  format?: (n: number) => string;
  style?: TextStyle | TextStyle[];
};

/** A whole number that counts up (or down) to its data when it changes (K-1065). Tabular figures, so the width holds as it runs. */
export function CountUp({ value, format = String, style }: Props) {
  const reduce = useReduceMotion();
  const tween = useTween(value, { reduce, ms: tokens.motion.countMs });
  const [shown, setShown] = useState(0);
  useAnimatedReaction(
    () => Math.round(tween.value),
    (now) => scheduleOnRN(setShown, now),
  );
  return <Text style={[styles.figures, style]}>{format(shown)}</Text>;
}

const styles = StyleSheet.create({ figures: { fontVariant: ['tabular-nums'] } });
