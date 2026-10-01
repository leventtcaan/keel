/**
 * The session's words and the set it logs (K-405): a set as the user reads it, in their unit; the rest time; each move's
 * place in the session; what the user typed, in kg as the server keeps it (ADR-029); and the set body the queue sends.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type UnitSystem, formatLoad, parseLoadKg } from '@/units/units';

import { workoutParams } from './params';
import type { ExercisePlan } from './workout';

type Schemas = components['schemas'];
type Entry = { loadKg: number; reps: number };

/** A load, an added load with its plus (a weighted dip), or the body alone. */
export function setText(set: Entry, move: Schemas['Exercise'], units: UnitSystem): string {
  if (move.load === 'BODYWEIGHT') return t('workout.bodyweight', { reps: set.reps });
  const key = move.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'workout.added' : 'workout.set';
  return t(key, { load: formatLoad(set.loadKg, units), reps: set.reps });
}

export function restText(seconds: number): string {
  return t('workout.rest.time', { minutes: Math.floor(seconds / 60), seconds: String(seconds % 60).padStart(2, '0') });
}

/** The sets planned before any is done, the set under way, or all done. */
export function exerciseStatus(plan: ExercisePlan): string {
  if (plan.current === null) return t('workout.allDone');
  if (plan.current === 0) return t('workout.sets', { count: plan.rows.length });
  return t('workout.setOf', { number: plan.current + 1, count: plan.rows.length });
}

/**
 * What the user typed, in kg at the server's precision; null when it is not a set the server would take (no load, a
 * part rep, nothing done, past the contract's ceilings). A bodyweight move's load is 0 whatever the field says.
 */
export function parseEntry(load: string, reps: string, move: Schemas['Exercise'], units: UnitSystem): Entry | null {
  const count = Number(reps.trim());
  if (reps.trim() === '' || !Number.isInteger(count) || count < 1 || count > workoutParams.maxReps) return null;
  if (move.load === 'BODYWEIGHT') return { loadKg: 0, reps: count };
  const kg = parseLoadKg(load, units);
  if (kg === null || kg < 0 || kg > workoutParams.maxLoadKg) return null;
  return { loadKg: kg, reps: count };
}

/** A work set with the row's side and the RIR picked. */
export function buildSet(clientId: string, move: Schemas['Exercise'], side: Schemas['Side'], entry: Entry, rir: number): Schemas['NewSet'] {
  return { clientId, exerciseId: move.id, setType: 'WORKING', loadKg: entry.loadKg, reps: entry.reps, rir, side };
}
