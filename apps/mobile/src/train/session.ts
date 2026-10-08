/**
 * The session's words and the set it logs (K-405): a set as the user reads it, in their unit; the rest time; each move's
 * place in the session; what the user typed, in kg as the server keeps it (ADR-029); and the set body the queue sends.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type UnitSystem, formatLoad, formatPlate, loadValue, parseLoadKg, weightInput } from '@/units/units';

import { type GymWeights, lighter, plateUnits, platesFor, round, within } from './loadSteps';
import { workoutParams } from './params';
import type { ExercisePlan } from './workout';

type Schemas = components['schemas'];
type Entry = { loadKg: number; reps: number };

/**
 * A load, an added load with its plus (a weighted dip), or the body alone (a weighted move with nothing added too). The
 * reps may be a range ("6-10"), as a target says them.
 */
export function setText(set: { loadKg: number; reps: number | string }, move: Schemas['Exercise'], units: UnitSystem): string {
  if (move.load === 'BODYWEIGHT' || (move.load === 'BODYWEIGHT_PLUS_EXTERNAL' && set.loadKg === 0))
    return t('workout.bodyweight', { reps: set.reps });
  const key = move.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'workout.added' : 'workout.set';
  return t(key, { load: formatLoad(set.loadKg, units), reps: set.reps });
}

export function restText(seconds: number): string {
  return t('workout.rest.time', { minutes: Math.floor(seconds / 60), seconds: String(seconds % 60).padStart(2, '0') });
}

/** The session's time (K-971): minutes and seconds, and the hours in front once past one. */
export function clockText(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secondsText = String(seconds % 60).padStart(2, '0');
  if (minutes < 60) return t('workout.clock.minutes', { minutes, seconds: secondsText });
  return t('workout.clock.hours', { hours: Math.floor(minutes / 60), minutes: String(minutes % 60).padStart(2, '0'), seconds: secondsText });
}

/**
 * One tap of the weight stepper (K-971, ADR-075 #1): a pair of the smallest plates (set_load_step_kg or _lb, in the
 * user's unit). At the gym in use it lands on a load the gym makes: the one within the step (loadSteps.within, as the
 * calibration and the server round), else the next it makes past it; a gym that says nothing of this equipment takes the
 * plain step. Nothing yet starts from nothing (at a gym, the empty bar). Never under nothing; null where a tap would not
 * move it. Any other weight is typed.
 */
export function stepLoad(kg: number | null, direction: 1 | -1, move: Schemas['Exercise'], gym: GymWeights | undefined, units: UnitSystem): number | null {
  const from = kg ?? 0;
  if (direction < 0 && from <= 0) return null;
  const step = units === 'METRIC' ? workoutParams.loadStep.kg : workoutParams.loadStep.lb;
  const plain = parseLoadKg(String(Math.max(0, loadValue(from, units) + direction * step)), units) ?? 0;
  if (gym === undefined) return plain;
  const found = within(move.equipment, move.id, gym, from, plain);
  if (found.kind === 'to') return found.kg;
  if (found.kind === 'unknown') return plain;
  if (direction < 0) return lighter(move.equipment, move.id, gym, from, plain);
  const up = round(move.equipment, move.id, gym, from, plain);
  return up.kind === 'to' ? up.kg : null;
}

/** One tap of the reps stepper: one rep either way, from one to the most a set takes; nothing typed counts from none. */
export function stepReps(reps: string, direction: 1 | -1): number | null {
  const now = Number(reps.trim());
  const next = (reps.trim() === '' || !Number.isInteger(now) ? 0 : now) + direction;
  return next < 1 || next > workoutParams.maxReps ? null : next;
}

/**
 * The sets planned before any is done, the set under way, or all done; a move outside the plan has no count to say. A
 * one-sided move's two rows (a side each) are one set.
 */
export function exerciseStatus(plan: ExercisePlan): string {
  if (plan.current === null) return t('workout.allDone');
  const sides = plan.rows.some((row) => row.side !== 'BOTH') ? 2 : 1;
  const number = Math.floor(plan.current / sides) + 1;
  const count = plan.rows.length / sides;
  if (plan.open === true) return t('workout.setNumber', { number });
  if (plan.current === 0) return count === 1 ? t('workout.setsOne') : t('workout.sets', { count });
  return t('workout.setOf', { number, count });
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

/**
 * The picker's choice a logged RIR falls in (ADR-075 #2): the last choice is that many or more ("2+"), so an older set
 * logged as 3 from the 3+ choice is in it.
 */
export function rirChoice(rir: number): number {
  return Math.min(rir, workoutParams.rirChoices[workoutParams.rirChoices.length - 1]);
}

/** A work set with the row's side, the RIR picked and its note, if any. */
export function buildSet(
  clientId: string,
  move: Schemas['Exercise'],
  side: Schemas['Side'],
  entry: Entry,
  rir: number,
  note?: string,
  supersetId?: string,
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
    ...(supersetId === undefined ? {} : { supersetId }),
  };
}
