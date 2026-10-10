/**
 * The analysis line after a move's sets (ADR-075 #4, K-973, prototype `setInsight`): the double progression the server has
 * already worked out, said in templates from en.json with the server's numbers (the last session's best set, the range, the
 * weight that comes at the top of it). It is the presentation of an output, not a rule: the phone compares two sets it has
 * and picks a sentence; nothing here sets a weight or a target (U1). A fall in reps is logged, never blamed (U7).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type UnitSystem, formatLoad } from '@/units/units';

type NewSet = components['schemas']['NewSet'];
type Planned = components['schemas']['PlannedExercise'];

/**
 * The best working set of the move today, as the server picks last time's (PlannedExercise.lastBestSet): the heaviest,
 * then the most reps, then the fewest left. Not the last one done, and not the order they came in: a set corrected on the
 * server comes back last, and the line must read the same.
 */
export function bestSet(sets: NewSet[]): NewSet | null {
  return sets.reduce<NewSet | null>((top, set) => {
    if (top === null) return set;
    if (set.loadKg !== top.loadKg) return set.loadKg > top.loadKg ? set : top;
    if (set.reps !== top.reps) return set.reps > top.reps ? set : top;
    return (set.rir ?? Infinity) < (top.rir ?? Infinity) ? set : top;
  }, null);
}

const plural = (key: string, count: number, vars: Record<string, string | number>) => t(`${key}.${count === 1 ? 'one' : 'other'}`, { count, ...vars });

/**
 * The server's condition for the next weight (PlannedExercise.nextLoadAtTopKg, double progression K-109): every set of the
 * plan has reached the top of the range, at the load called. Met by the sets done so far only when the whole plan is done
 * (this week's count, per side for a one-sided move) and each of them is at the top at no less than the load called. Until
 * then the weight of the next session is not promised: one set at the top is an observation, not the call (U1, U2).
 */
function everySetAtTop(planned: Planned, sets: NewSet[], sides: 1 | 2): boolean {
  return sets.length >= planned.sets * sides && sets.every((s) => s.reps >= planned.reps.max && s.loadKg >= (planned.nextLoadKg ?? 0));
}

/**
 * What to say of the move after its sets, from the sets of today and the planned move the server sent: below the range;
 * a load the weekly call holds ("again, as called": the weight called and the weight of last time); then against the best
 * set of last time at the same weight (reps up, the same, or fewer), a heavier weight said so, anything else logged. The
 * weight of the next session ("Top of the range: 105 kg next time") only when every set of the plan reached the top
 * (`everySetAtTop`); before that, the reps alone. A move with no target is the calibration's to say (calibrationRead),
 * not this line's. Null with no set.
 */
export function moveInsight({ planned, sets, sides, held, units }: { planned: Planned; sets: NewSet[]; sides: 1 | 2; held: boolean; units: UnitSystem }): string | null {
  const best = bestSet(sets);
  if (best === null) return null;
  if (best.reps < planned.reps.min) return t('workout.insight.below');
  if (planned.nextLoadKg === undefined) return null;
  const last = planned.lastBestSet;
  // "Again" compares: it is said only of the weight of last time, at the weight called.
  if (held && last !== undefined && best.loadKg === last.loadKg && best.loadKg === planned.nextLoadKg) return t('workout.insight.held', { reps: best.reps });
  if (last === undefined || best.loadKg < last.loadKg) return t('workout.insight.logged');
  if (best.loadKg > last.loadKg) return t('workout.insight.heavier');
  const up = best.reps - last.reps;
  if (up < 0) return t('workout.insight.logged');
  if (up === 0) return t(planned.reps.min === planned.reps.max ? 'workout.insight.sameFixed' : 'workout.insight.same');
  const top = planned.nextLoadAtTopKg;
  if (top === undefined || !everySetAtTop(planned, sets, sides)) return plural('workout.insight.up', up, {});
  return plural('workout.insight.upAtTop', up, { load: formatLoad(top, units) });
}
