import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { GymWeights } from './loadSteps';
import { platesLine, setText } from './session';
import type { Warmup } from './warmup';

type Props = {
  move: components['schemas']['Exercise'];
  warmups: Warmup[];
  /** How many are logged: they are done in order. */
  done: number;
  gym: GymWeights | undefined;
  onLog: () => void;
  problem: string | null;
  /** Which showing of the problem this is: the same failure again is said again (K-815). */
  problemOccurrence?: unknown;
  busy: boolean;
};

/**
 * The move's warm-ups before its first work set (K-417, G1 K-17): each load with its plates a side when the gym in use
 * is known; the ones logged marked, and one tap logs the next — a warm-up, no RIR to pick, it is nowhere near failure.
 * Folded to one line (its count and that one tap) so the set under way is in the first view (K-971); a tap opens the
 * loads, and once one is logged they stay open.
 */
export function Warmups({ move, warmups, done, gym, onLog, problem, problemOccurrence, busy }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  const [opened, setOpened] = useState<boolean | null>(null);
  // Untouched, open once one is logged; a tap on the line decides from then on.
  const open = opened ?? done > 0;
  const rows = warmups.map((warmup, index) => {
    const plates = platesLine(move, warmup.loadKg, gym);
    const mark = index < done ? <Text style={[styles.small, { color: color.accent }]}>{t('workout.warmup.done')}</Text> : null;
    const side = plates === null ? null : <Text style={[styles.small, { color: color.muted }]}>{plates}</Text>;
    return (
      <View key={index} style={styles.row}>
        <Text style={[styles.text, styles.grow, { color: index < done ? color.muted : color.text }]}>{setText(warmup, move, units)}</Text>
        {side}
        {mark}
      </View>
    );
  });
  const next =
    done < warmups.length ? <Button label={t('workout.warmup.log', { number: done + 1 })} variant="ghost" size="sm" onPress={onLog} disabled={busy} /> : null;
  const said = problem === null ? null : (
      <ProblemText style={[styles.text, { color: color.text }]} occurrence={problemOccurrence}>
        {problem}
      </ProblemText>
    );
  const count = warmups.length === 1 ? t('workout.setsOne') : t('workout.sets', { count: warmups.length });
  const loads = open ? (
    <>
      <Text style={[styles.small, { color: color.muted }]}>{t('workout.warmup.note')}</Text>
      {rows}
    </>
  ) : null;
  return (
    <View style={styles.block}>
      <View style={styles.line}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workout.warmup.fold', { count })}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpened(!open)}
          style={[styles.row, styles.grow, styles.touch]}>
          <Text style={[styles.label, { color: color.text }]}>{t('workout.warmup.title')}</Text>
          <Text style={[styles.small, { color: color.muted }]}>{count}</Text>
        </Pressable>
        {next}
      </View>
      {loads}
      {said}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  touch: { minHeight: tokens.size.touch, alignItems: 'center' },
  grow: { flex: 1 },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
