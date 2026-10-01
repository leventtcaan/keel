import { StyleSheet, Text, View } from 'react-native';

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
  busy: boolean;
};

/**
 * The move's warm-ups before its first work set (K-417, G1 K-17): each load with its plates a side when the gym in use
 * is known; the ones logged marked, and one tap logs the next — a warm-up, no RIR to pick, it is nowhere near failure.
 */
export function Warmups({ move, warmups, done, gym, onLog, problem, busy }: Props) {
  const { color } = useTheme();
  const units = useUnits();
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
    done < warmups.length ? <Button label={t('workout.warmup.log', { number: done + 1 })} variant="ghost" onPress={onLog} disabled={busy} /> : null;
  const said = problem === null ? null : <Text style={[styles.text, { color: color.text }]}>{problem}</Text>;
  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: color.text }]}>{t('workout.warmup.title')}</Text>
      <Text style={[styles.small, { color: color.muted }]}>{t('workout.warmup.note')}</Text>
      {rows}
      {next}
      {said}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space.sm },
  grow: { flex: 1 },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
