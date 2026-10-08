import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { repCount } from './reps';
import { setText } from './session';

type Schemas = components['schemas'];

/**
 * The move's target (ADR-075 #1, prototype `.goal`), all of it the server's: after a session of it, the next set to beat
 * (nextLoadKg × nextReps) and last time's best set (lastBestSet); before one, the load to start from over the range; with
 * no load known, the range alone. A move outside the plan has none.
 */
export function GoalLine({ planned, move }: { planned: Schemas['PlannedExercise']; move: Schemas['Exercise'] }) {
  const { color } = useTheme();
  const units = useUnits();
  const range = repCount(planned.reps);
  const best = planned.lastBestSet;
  const [kicker, value, last] =
    best !== undefined
      ? [t('workout.goal.beat'), setText({ loadKg: planned.nextLoadKg ?? best.loadKg, reps: planned.nextReps ?? range }, move, units), t('workout.goal.last', { set: setText(best, move, units) })]
      : planned.nextLoadKg !== undefined
        ? [t('workout.goal.start'), setText({ loadKg: planned.nextLoadKg, reps: range }, move, units), null]
        : [t('workout.goal.first'), t('workout.goal.reps', { reps: range }), null];
  return (
    <View testID="goal" style={[styles.goal, { backgroundColor: color.surface }]}>
      <View style={styles.grow}>
        <Text style={[styles.kicker, { color: color.textSecondary }]}>{kicker}</Text>
        <Text style={[styles.value, { color: color.text }]}>{value}</Text>
      </View>
      {last !== null && <Text style={[styles.kicker, { color: color.textSecondary }]}>{last}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  goal: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.md, borderRadius: tokens.radius.card },
  grow: { flex: 1, gap: tokens.space.xs },
  kicker: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  value: { fontFamily: tokens.font.display, fontSize: tokens.type.heading },
});
