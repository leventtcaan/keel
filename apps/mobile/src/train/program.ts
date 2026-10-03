/**
 * The program in words, for the Train tab (K-405). Every number is the server's (K-217): the calls of the deload ladder
 * in force today, this week's sets (fewer in a lighter week), the next session's load and reps. Loads in the user's unit
 * (ADR-029: the server keeps kg).
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';
import { type UnitSystem, formatLoad } from '@/units/units';

import type { Move } from './trainData';

type Schemas = components['schemas'];

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** A calendar day (YYYY-MM-DD) as "Oct 4"; read as a date only, so no time zone moves it. */
export function shortDate(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

/** The calls in force, most binding first: a week off, then a lighter week, then the weights held. */
export function programNotes(program: Schemas['Program'], declared?: Schemas['DeclaredState'] | null): string[] {
  const notes: string[] = [];
  // K-528: a busy week's least dose, a suggestion beside the program — its targets stay as they are (U2). The server sends
  // one with a busy week only.
  const dose = declared?.busyDose;
  if (dose !== undefined) notes.push(busyNote(dose));
  if (program.restUntil !== undefined) notes.push(t('train.status.restWeek', { date: shortDate(program.restUntil) }));
  if (program.deload !== undefined) notes.push(t('train.status.deload', { date: shortDate(program.deload.until) }));
  if (program.loadHeldSince !== undefined) notes.push(t('train.status.held', { date: shortDate(program.loadHeldSince) }));
  return notes;
}

/** A generated day by its copy key; the user's own day by the name they gave it. */
export function dayName(day: Schemas['ProgramDay']): string {
  return day.nameKey !== undefined ? t(`programDays.${day.nameKey}.name`) : (day.name ?? '');
}

/** A move by the catalog's copy, the user's own by the name they gave it; a move this app version does not know, by its id. */
export function exerciseName(id: string, moves?: ReadonlyMap<string, Move>): string {
  const own = moves?.get(id)?.name;
  if (own !== undefined) return own;
  const key = `exercises.${id}.name`;
  return has(key) ? t(key) : id;
}

/** This week's sets; in a lighter week, how many of the program's. */
export function setsLine(planned: Schemas['PlannedExercise']): string {
  if (planned.sets < planned.baseSets) return t('train.sets.lighter', { sets: planned.sets, base: planned.baseSets });
  return planned.sets === 1 ? t('train.sets.one') : t('train.sets.other', { count: planned.sets });
}

export function repsLine(planned: Schemas['PlannedExercise']): string {
  return t('train.reps', { min: planned.reps.min, max: planned.reps.max });
}

/** The next session's target as the server set it; an added load (a weighted dip) with its plus. None until known. */
export function nextLine(planned: Schemas['PlannedExercise'], units: UnitSystem, load: Schemas['Exercise']['load']): string | null {
  if (planned.nextLoadKg === undefined || planned.nextReps === undefined) return null;
  if (load === 'BODYWEIGHT') return t('train.nextBodyweight', { reps: planned.nextReps }); // no weight to aim for
  const key = load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'train.nextAdded' : 'train.next';
  return t(key, { load: formatLoad(planned.nextLoadKg, units), reps: planned.nextReps });
}

/** "One session and one set per exercise, at your usual weights": the server's numbers, said in words. */
function busyNote(dose: Schemas['BusyDose']): string {
  const sessions = t(dose.sessions === 1 ? 'train.busy.sessions.one' : 'train.busy.sessions.other', { count: dose.sessions });
  const sets = t(dose.setsPerExercise === 1 ? 'train.busy.sets.one' : 'train.busy.sets.other', { count: dose.setsPerExercise });
  return t(dose.keepLoad ? 'train.busy.withLoad' : 'train.busy.dose', { sessions, sets });
}
