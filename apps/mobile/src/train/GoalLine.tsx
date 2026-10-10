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
  const [kicker, value, last] = ((): [string, string, string | null] => {
    // No target (a first session, or a move swapped in): last time's best set when the server has one, else the range alone;
    // either way the weight is the person's to pick (ADR-075 #3, Ek 8).
    if (planned.nextLoadKg === undefined) {
      const pick = move.load === 'BODYWEIGHT' ? null : t('workout.goal.pick');
      return best === undefined
        ? [t('workout.goal.first'), t('workout.goal.reps', { reps: range }), pick]
        : [t('workout.goal.lastTime'), setText(best, move, units), pick];
    }
    if (best === undefined) return [t('workout.goal.start'), setText({ loadKg: planned.nextLoadKg, reps: range }, move, units), null];
    const target = { loadKg: planned.nextLoadKg, reps: planned.nextReps ?? range };
    // The target is the set of last time (a load held): it is matched, not beaten, and last time is not said twice.
    if (target.loadKg === best.loadKg && target.reps === best.reps) return [t('workout.goal.again'), setText(target, move, units), null];
    return [t('workout.goal.beat'), setText(target, move, units), t('workout.goal.last', { set: setText(best, move, units) })];
  })();
  return (
    <View testID="goal" style={[styles.goal, { backgroundColor: color.surface }]}>
      <View style={styles.grow}>
        <Text style={[styles.kicker, { color: color.textSecondary }]}>{kicker}</Text>
        <Text style={[styles.value, { color: color.text }]}>{value}</Text>
      </View>
      {last !== null && <Text style={[styles.kicker, styles.side, { color: color.textSecondary }]}>{last}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  goal: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  grow: { flex: 1, gap: tokens.space.xs },
  // "Pick a weight that's hard by the last rep, with good form." is a sentence: it wraps in its half, to the right.
  side: { flexShrink: 1, maxWidth: '55%', textAlign: 'right' },
  kicker: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  value: { fontFamily: tokens.font.display, fontSize: tokens.type.heading },
});
