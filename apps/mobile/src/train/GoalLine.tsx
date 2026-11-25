import { StyleSheet, Text } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { repCount } from './reps';
import { setText } from './session';

type Schemas = components['schemas'];

/**
 * The move's target as ONE line (K-1207; ADR-075 #1, prototype `.goal`), all of it the server's: after a session of it, the next set to beat
 * (nextLoadKg × nextReps) and last time's best set (lastBestSet); before one, the load to start from over the range; with
 * no load known, the range alone. A move outside the plan has none.
 */
export function GoalLine({ planned, move }: { planned: Schemas['PlannedExercise']; move: Schemas['Exercise'] }) {
  const { color } = useTheme();
  const units = useUnits();
  const range = repCount(planned.reps);
  const best = planned.lastBestSet;
  const [kicker, value, last, pick] = ((): [string, string, string | null, string | null] => {
    // No target (a first session, or a move swapped in): last time's best set when the server has one, else the range alone;
    // either way the weight is the person's to pick (ADR-075 #3, Ek 8), unless the body is the load: a bodyweight move, and one
    // with an added load that starts at the body alone (K-1013, the pull-up), have no weight to pick.
    if (planned.nextLoadKg === undefined) {
      const pick = move.load === 'EXTERNAL' ? t('workout.goal.pick') : null;
      return best === undefined
        ? [t('workout.goal.first'), t('workout.goal.reps', { reps: range }), null, pick]
        : [t('workout.goal.lastTime'), setText(best, move, units), null, pick];
    }
    if (best === undefined) return [t('workout.goal.start'), setText({ loadKg: planned.nextLoadKg, reps: range }, move, units), null, null];
    const target = { loadKg: planned.nextLoadKg, reps: planned.nextReps ?? range };
    // The target is the set of last time (a load held): it is matched, not beaten, and last time is not said twice.
    if (target.loadKg === best.loadKg && target.reps === best.reps) return [t('workout.goal.again'), setText(target, move, units), null, null];
    return [t('workout.goal.beat'), setText(target, move, units), t('workout.goal.last', { set: setText(best, move, units) }), null];
  })();
  // One line, the number to lift (K-1207): what kind of target it is (beat last time, match it, where to start) and what last time was
  // are for a screen reader; the screen shows the set to make and nothing else.
  const said = [kicker, value, last, pick].filter((part): part is string => part !== null).join('. ');
  return (
    <Text testID="goal" accessibilityLabel={said} style={[styles.value, { color: color.text }]}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  value: { ...tokens.face.display, fontSize: tokens.type.heading },
});
