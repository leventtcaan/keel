/**
 * The session's words and the set it logs (K-405): a set as the user reads it, in their unit; the rest time; each move's
 * place in the session; what the user typed, in kg as the server keeps it (ADR-029); and the set body the queue sends.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type UnitSystem, formatLoad, formatPlate, parseLoadKg, weightInput } from '@/units/units';

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
  if (plan.current === 0) return plan.rows.length === 1 ? t('workout.setsOne') : t('workout.sets', { count: plan.rows.length });
  return t('workout.setOf', { number: plan.current + 1, count: plan.rows.length });
}

/**
 * What the user typed, in kg at the server's precision; null when it is not a set the server would take (no load, a
 * part rep, nothing done, past the contract's ceilings). A bodyweight move's load is 0 whatever the field says. A load
 * left as suggested is the suggestion's kg: shown in lb it is rounded (62.5 kg is 137.8 lb), and read back it would be
 * another load (62.51 kg) than the one the server set.
 */
export function parseEntry(
  load: string,
  reps: string,
  move: Schemas['Exercise'],
  units: UnitSystem,
  suggestedKg: number | null = null,
): Entry | null {
  const count = Number(reps.trim());
  if (reps.trim() === '' || !Number.isInteger(count) || count < 1 || count > workoutParams.maxReps) return null;
  if (move.load === 'BODYWEIGHT') return { loadKg: 0, reps: count };
  const kg = parseLoad(load, units, suggestedKg);
  return kg === null ? null : { loadKg: kg, reps: count };
}

/** The load typed, in kg as parseEntry reads it (the suggestion's own kg when left as shown); null when it is no load. */
export function parseLoad(load: string, units: UnitSystem, suggestedKg: number | null): number | null {
  if (suggestedKg !== null && load.trim() === weightInput(suggestedKg, units)) return suggestedKg;
  const kg = parseLoadKg(load, units);
  return kg === null || kg < 0 || kg > workoutParams.maxLoadKg ? null : kg;
}

/** The plates on each side, heaviest first, in the user's unit; none is the bar alone. */
export function platesText(plates: number[], units: UnitSystem): string {
  if (plates.length === 0) return t('workout.barOnly');
  return t('workout.plates', { plates: plates.map((kg) => formatPlate(kg, units)).join(' + ') });
}

/** A work set with the row's side and the RIR picked. */
export function buildSet(clientId: string, move: Schemas['Exercise'], side: Schemas['Side'], entry: Entry, rir: number): Schemas['NewSet'] {
  return { clientId, exerciseId: move.id, setType: 'WORKING', loadKg: entry.loadKg, reps: entry.reps, rir, side };
}
