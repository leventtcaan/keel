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

/** "Last 80 kg × 8, today 80 kg × 9"; only the last when today has no target yet; null for a move done for the first time. */
export function lastTodayLine(planned: Schemas['PlannedExercise'], move: Schemas['Exercise'] | undefined, units: UnitSystem): string | null {
  const last = planned.lastBestSet;
  if (last === undefined || move === undefined) return null;
  const lastText = setText({ loadKg: last.loadKg, reps: last.reps }, move, units);
  if (planned.nextLoadKg === undefined || planned.nextReps === undefined) return t('train.lastOnly', { last: lastText });
  return t('train.lastToday', { last: lastText, today: setText({ loadKg: planned.nextLoadKg, reps: planned.nextReps }, move, units) });
}
