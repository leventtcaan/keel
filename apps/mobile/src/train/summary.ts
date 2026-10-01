/**
 * The session's summary (K-406, prototype 2.6, B §6.4): effort, not volume — the category's total volume rewards
 * adding sets and punishes adding effort. Against last time each move says what improved: the same weight for more reps
 * at the same RIR; the same weight and reps with more in the tank; a heavier weight; else a higher estimated max (Epley,
 * as the engine reads it, K-218). An isolation move is never compared by its weight (Güray G6 K-33); a bodyweight move
 * has no weight to compare. The header counts the moves whose work sets reached the target effort (RIR 0 to the
 * planned RIR, G1 K-5); a move past it gets a note for next time, never a blame (U7).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type UnitSystem, formatLoad } from '@/units/units';

import { workoutParams } from './params';

type Schemas = components['schemas'];
type NewSet = Schemas['NewSet'];

export type MoveSummary = { exerciseId: string; sets: NewSet[]; line: string | null; note: string | null };
export type Summary = { moves: MoveSummary[]; reached: number; judged: number };

/**
 * Epley, as the engine (E1rm.java): none without RIR, past the reps to failure it holds for, or without a load. Counted
 * in whole hundredths and rounded once, half up to a tenth: load × (divisor + reps to failure) / divisor — a float lands
 * on either side of a tie (30.75 × 38/30 = 38.95).
 */
export function e1rm(loadKg: number, reps: number, rir: number | undefined): number | null {
  if (rir === undefined || rir < 0 || reps < 1 || loadKg <= 0) return null;
  const toFailure = reps + rir;
  if (toFailure > workoutParams.e1rmMaxRepsToFailure) return null;
  const hundredths = Math.round(loadKg * 100);
  if (toFailure === 1) return Math.floor((hundredths + 5) / 10) / 10;
  const divisor = workoutParams.e1rmEpleyDivisor;
  // tenths = hundredths × (divisor + t) / (10 × divisor), half up: floor((2n + d) / 2d) with d = 10 × divisor.
  const n = hundredths * (divisor + toFailure);
  const d = 10 * divisor;
  return Math.floor((2 * n + d) / (2 * d)) / 10;
}

const top = (sets: NewSet[]) => Math.max(...sets.map((s) => s.loadKg));
/** The best set at a weight: the most reps, then the fewest left in the tank. */
const best = (sets: NewSet[], load: number) =>
  sets.filter((s) => s.loadKg === load).sort((a, b) => b.reps - a.reps || (a.rir ?? Infinity) - (b.rir ?? Infinity))[0];
const bestE1rm = (sets: NewSet[]) => Math.max(-Infinity, ...sets.map((s) => e1rm(s.loadKg, s.reps, s.rir) ?? -Infinity));
const plural = (key: string, count: number, vars: Record<string, string | number>) =>
  t(`${key}.${count === 1 ? 'one' : 'other'}`, { count, ...vars });

function line(today: NewSet[], last: NewSet[], move: Schemas['Exercise'], units: UnitSystem): string | null {
  if (last.length === 0) return t('summary.first');
  // A bodyweight move's load is 0: never heavier. A weighted one's is only what is added: heavier is comparable, an
  // estimated max is not (the engine adds the bodyweight; the phone does not read it).
  const loadTracked = move.kind === 'COMPOUND';
  const estimable = loadTracked && move.load === 'EXTERNAL';
  const [todayTop, lastTop] = [top(today), top(last)];
  const [now, then] = [best(today, todayTop), best(last, lastTop)];
  if (loadTracked && todayTop > lastTop) {
    const load = formatLoad(todayTop - lastTop, units);
    return now.rir === undefined ? t('summary.loadUpNoRir', { load }) : t('summary.loadUp', { load, rir: now.rir });
  }
  if (todayTop === lastTop && now.rir !== undefined && then.rir !== undefined) {
    if (now.rir === then.rir && now.reps > then.reps) {
      return plural(move.load === 'BODYWEIGHT' ? 'summary.moreRepsBody' : 'summary.moreReps', now.reps - then.reps, { rir: now.rir });
    }
    if (now.reps === then.reps && now.rir > then.rir) return t('summary.moreInTank', { count: now.rir - then.rir });
  }
  if (estimable) {
    const gain = Math.round((bestE1rm(today) - bestE1rm(last)) * 10) / 10;
    if (Number.isFinite(gain) && gain > 0) return t('summary.e1rmUp', { load: formatLoad(gain, units) });
  }
  return null;
}

/** Today's work sets, move by move in the order first done, each against last time's (`last`, the phone's records). */
export function summarize(
  today: NewSet[],
  last: (exerciseId: string) => NewSet[],
  moves: Map<string, Schemas['Exercise']>,
  planned: Schemas['PlannedExercise'][],
  units: UnitSystem,
): Summary {
  const working = today.filter((s) => s.setType === 'WORKING');
  const ids = [...new Set(working.map((s) => s.exerciseId))];
  let reached = 0;
  let judged = 0;
  const summaries = ids.map((exerciseId) => {
    const sets = working.filter((s) => s.exerciseId === exerciseId);
    const move = moves.get(exerciseId);
    // The planned RIR; a move outside the plan (a day gone from the program, a swap) is judged by the engine's.
    const target = planned.find((p) => p.exerciseId === exerciseId)?.targetRir ?? workoutParams.targetRirMax;
    const rirs = sets.flatMap((s) => (s.rir === undefined ? [] : [s.rir]));
    let note: string | null = null;
    if (target !== undefined && rirs.length > 0) {
      judged += 1;
      const most = Math.max(...rirs);
      if (most <= target) reached += 1;
      else note = t('summary.note', { rir: most, target });
    }
    return { exerciseId, sets, line: move === undefined ? null : line(sets, last(exerciseId), move, units), note };
  });
  return { moves: summaries, reached, judged };
}
