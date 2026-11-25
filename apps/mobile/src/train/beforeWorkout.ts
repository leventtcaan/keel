/**
 * Before the workout (Evre 7 C1, plan/evre-7-inceleme.md §16): today's card gives a reason to start without prose: how long it
 * takes, and for the headline lifts what the last time was beside what today asks. Numbers the server already has
 * (`lastBestSet`, `nextLoadKg`, `nextReps`); the phone words them. The time is an estimate (workout.json: a set's seconds plus the
 * rest), said as "about", to the nearest few minutes.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type UnitSystem } from '@/units/units';

import { workoutParams as P } from './params';
import { setText } from './session';

type Schemas = components['schemas'];

/** The minutes the session takes: every set with its rest, and the cardio after it; null with nothing planned. */
export function estimatedMinutes(moves: readonly Schemas['PlannedExercise'][], cardioMinutes: number): number | null {
  const sets = moves.reduce((n, m) => n + m.sets, 0);
  if (sets === 0) return null;
  const lifting = (sets * (P.sessionSetSeconds + P.restSecondsMin)) / 60;
  const total = lifting + cardioMinutes;
  return Math.max(P.sessionMinutesRound, Math.round(total / P.sessionMinutesRound) * P.sessionMinutesRound);
}

/** The last best set in the user's unit, as a set is written; null for a move done for the first time or not read. */
function lastSet(planned: Schemas['PlannedExercise'], move: Schemas['Exercise'] | undefined, units: UnitSystem): string | null {
  const last = planned.lastBestSet;
  return last === undefined || move === undefined ? null : setText({ loadKg: last.loadKg, reps: last.reps }, move, units);
}

/**
 * "Last 80 kg × 8" alone, whatever today asks. This week's card writes today's ask as the move's own number on the right
 * (9c-5), so the line under the name is only the last time; null for a move done for the first time.
 */
export function lastLine(planned: Schemas['PlannedExercise'], move: Schemas['Exercise'] | undefined, units: UnitSystem): string | null {
  const last = lastSet(planned, move, units);
  return last === null ? null : t('train.lastOnly', { last });
}

/** "Last 80 kg × 8, today 80 kg × 9"; only the last when today has no target yet; null for a move done for the first time. */
export function lastTodayLine(planned: Schemas['PlannedExercise'], move: Schemas['Exercise'] | undefined, units: UnitSystem): string | null {
  const last = lastSet(planned, move, units);
  if (last === null || move === undefined) return null;
  if (planned.nextLoadKg === undefined || planned.nextReps === undefined) return t('train.lastOnly', { last });
  return t('train.lastToday', { last, today: setText({ loadKg: planned.nextLoadKg, reps: planned.nextReps }, move, units) });
}
