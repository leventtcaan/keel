/**
 * The session's words and the set it logs (K-405): a set as the user reads it, in their unit; the rest time; each move's
 * place in the session; what the user typed, in kg as the server keeps it (ADR-029); and the set body the queue sends.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type UnitSystem, formatLoad, formatPlate, parseLoadKg, weightInput } from '@/units/units';

import { type GymWeights, plateUnits, platesFor } from './loadSteps';
import { workoutParams } from './params';
import type { ExercisePlan } from './workout';

type Schemas = components['schemas'];
type Entry = { loadKg: number; reps: number };

/** A load, an added load with its plus (a weighted dip), or the body alone (a weighted move with nothing added too). */
export function setText(set: Entry, move: Schemas['Exercise'], units: UnitSystem): string {
  if (move.load === 'BODYWEIGHT' || (move.load === 'BODYWEIGHT_PLUS_EXTERNAL' && set.loadKg === 0))
    return t('workout.bodyweight', { reps: set.reps });
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

/** The plates a side for a load of an external-load move at the gym in use; null without a gym, or nothing to load. */
export function platesLine(move: Schemas['Exercise'], loadKg: number, gym: GymWeights | undefined): string | null {
  if (gym === undefined || move.load !== 'EXTERNAL') return null;
  const plates = platesFor(move.equipment, loadKg, gym);
  return plates === null ? null : platesText(plates, plateUnits(gym));
}

/**
 * The plates on each side, heaviest first, in the unit they were made in (the gym's, which may not be the user's: they
 * are what is on the rack), with it; none is the bar alone.
 */
function platesText(plates: number[], plateUnits: UnitSystem): string {
  if (plates.length === 0) return t('workout.barOnly');
  const unit = t(plateUnits === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit');
  return t('workout.plates', { plates: plates.map((kg) => formatPlate(kg, plateUnits)).join(t('workout.platesJoin')), unit });
}

/** A note as the server keeps it (K-422): the words without their outer spaces; only spaces is no note. */
export function noteOf(text: string | undefined): string | null {
  const words = text?.trim() ?? '';
  return words === '' ? null : words;
}

/** A work set with the row's side, the RIR picked and its note, if any. */
export function buildSet(
  clientId: string,
  move: Schemas['Exercise'],
  side: Schemas['Side'],
  entry: Entry,
  rir: number,
  note?: string,
): Schemas['NewSet'] {
  const words = noteOf(note);
  return {
    clientId,
    exerciseId: move.id,
    setType: 'WORKING',
    loadKg: entry.loadKg,
    reps: entry.reps,
    rir,
    side,
    ...(words === null ? {} : { note: words }),
  };
}
