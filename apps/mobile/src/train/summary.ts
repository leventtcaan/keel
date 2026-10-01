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

/** Epley, as the engine (E1rm.java): none without RIR, past the reps to failure it holds for, or without a load. */
export function e1rm(loadKg: number, reps: number, rir: number | undefined): number | null {
  if (rir === undefined || rir < 0 || reps < 1 || loadKg <= 0) return null;
  const toFailure = reps + rir;
  if (toFailure > workoutParams.e1rmMaxRepsToFailure) return null;
  if (toFailure === 1) return Math.round(loadKg * 10) / 10;
  return Math.round(loadKg * (1 + toFailure / workoutParams.e1rmEpleyDivisor) * 10) / 10;
}

const top = (sets: NewSet[]) => Math.max(...sets.map((s) => s.loadKg));
/** The best set at a weight: the most reps, then the fewest left in the tank. */
const best = (sets: NewSet[], load: number) =>
  sets.filter((s) => s.loadKg === load).sort((a, b) => b.reps - a.reps || (a.rir ?? Infinity) - (b.rir ?? Infinity))[0];
const bestE1rm = (sets: NewSet[]) => Math.max(-Infinity, ...sets.map((s) => e1rm(s.loadKg, s.reps, s.rir) ?? -Infinity));
const plural = (key: string, count: number, vars: Record<string, string | number>) => t(`${key}.${count === 1 ? 'one' : 'other'}`, { count, ...vars });

function line(today: NewSet[], last: NewSet[], move: Schemas['Exercise'], units: UnitSystem): string | null {
  if (last.length === 0) return t('summary.first');
  const loadTracked = move.kind === 'COMPOUND' && move.load !== 'BODYWEIGHT';
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
  if (loadTracked) {
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
    const target = planned.find((p) => p.exerciseId === exerciseId)?.targetRir;
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
