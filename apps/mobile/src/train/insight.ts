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
 * What to say of the move after its sets, from the best set of today and the planned move the server sent: below the
 * range; a load the weekly call holds ("as called"); then against the best set of last time at the same weight (reps up,
 * the same, or fewer), a heavier weight said so, anything else logged. A move with no target is the calibration's to
 * say (calibrationRead), not this line's. Null with no set.
 */
export function moveInsight({ planned, best, held, units }: { planned: Planned; best: NewSet | null; held: boolean; units: UnitSystem }): string | null {
  if (best === null) return null;
  if (best.reps < planned.reps.min) return t('workout.insight.below');
  if (planned.nextLoadKg === undefined) return null;
  if (held) return t('workout.insight.held', { reps: best.reps });
  const last = planned.lastBestSet;
  if (last === undefined || best.loadKg < last.loadKg) return t('workout.insight.logged');
  if (best.loadKg > last.loadKg) return t('workout.insight.heavier');
  const up = best.reps - last.reps;
  if (up < 0) return t('workout.insight.logged');
  if (up === 0) return t(planned.reps.min === planned.reps.max ? 'workout.insight.sameFixed' : 'workout.insight.same');
  const toTop = planned.reps.max - best.reps;
  const top = planned.nextLoadAtTopKg;
  if (top === undefined) return plural('workout.insight.up', up, {});
  const load = formatLoad(top, units);
  return toTop > 0 ? plural('workout.insight.upToTop', up, { toTop, load }) : plural('workout.insight.upAtTop', up, { load });
}
