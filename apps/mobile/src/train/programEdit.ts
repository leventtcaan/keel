/**
 * A program the user writes or changes (K-968 "Type it in"; K-970's Edit reuses it): days with a name and, when the user
 * gives one, a weekday, used once; moves with their sets and rep range. Every change keeps it within what the contract's
 * OwnProgram takes (its limits mirrored in workout.json); a change that would leave them is no change. A move added starts
 * from program_new_move_sets and the engine's range of its kind; the user sets their own. Pure: the editor and the tests
 * share it.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

import { workoutParams as P } from './params';
import type { Move } from './trainData';

type Schemas = components['schemas'];
type Weekday = Schemas['Weekday'];

/** The weekdays a day can be on, Monday first. */
export const WEEKDAYS: readonly Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export type EditedMove = { exerciseId: string; sets: number; reps: Schemas['RepRange'] };
/** `weekday`: absent when the day is on none. */
export type EditedDay = { name: string; weekday?: Weekday; moves: EditedMove[] };

const changed = (days: EditedDay[], at: number, day: EditedDay) => days.map((d, i) => (i === at ? day : d));

/** A day after the last, named by its place. */
export function newDay(days: EditedDay[]): EditedDay[] {
  if (days.length >= P.programDaysMax) return days;
  return [...days, { name: t('programEditor.defaultName', { number: days.length + 1 }), moves: [] }];
}

export function withoutDay(days: EditedDay[], at: number): EditedDay[] {
  return days.filter((_, i) => i !== at);
}

export function renamed(days: EditedDay[], at: number, name: string): EditedDay[] {
  return changed(days, at, { ...days[at], name });
}

/** Whether another day is on this weekday already. */
export function weekdayTaken(days: EditedDay[], at: number, weekday: Weekday): boolean {
  return days.some((day, i) => i !== at && day.weekday === weekday);
}

/** The day on this weekday, or on none (undefined); a weekday another day has is no change. */
export function withWeekday(days: EditedDay[], at: number, weekday: Weekday | undefined): EditedDay[] {
  if (weekday !== undefined && weekdayTaken(days, at, weekday)) return days;
  const { weekday: _was, ...day } = days[at];
  return changed(days, at, weekday === undefined ? day : { ...day, weekday });
}

export function withMove(days: EditedDay[], at: number, move: Move): EditedDay[] {
  const day = days[at];
  if (day.moves.length >= P.programDayMovesMax) return days;
  const added = { exerciseId: move.id, sets: P.programNewMoveSets, reps: { ...P.programNewMoveReps[move.kind] } };
  return changed(days, at, { ...day, moves: [...day.moves, added] });
}

export function withoutMove(days: EditedDay[], at: number, index: number): EditedDay[] {
  return changed(days, at, { ...days[at], moves: days[at].moves.filter((_, i) => i !== index) });
}

const within = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** A move's sets, or the fewest or the most of its reps, a step up or down: sets 1 to the most, a range always a range. */
export function stepped(days: EditedDay[], at: number, index: number, field: 'sets' | 'min' | 'max', by: number): EditedDay[] {
  const move = days[at].moves[index];
  const { min, max } = move.reps;
  const next =
    field === 'sets'
      ? { ...move, sets: within(move.sets + by, 1, P.programMoveSetsMax) }
      : field === 'min'
        ? { ...move, reps: { min: within(min + by, 1, max - 1), max } }
        : { ...move, reps: { min, max: within(max + by, min + 1, P.maxReps) } };
  return changed(days, at, { ...days[at], moves: days[at].moves.map((m, i) => (i === index ? next : m)) });
}

/** The program to send (contract OwnProgram); none while a day has no name (or too long a one) or no move, or there is no day. */
export function ownProgramOf(days: EditedDay[]): Schemas['OwnProgram'] | null {
  if (days.length === 0) return null;
  const program: Schemas['OwnProgram'] = { days: [] };
  for (const day of days) {
    const name = day.name.trim();
    // The server counts a name in UTF-16 units, as length does.
    if (name === '' || name.length > P.programDayNameMaxChars || day.moves.length === 0) return null;
    const exercises = day.moves.map(({ exerciseId, sets, reps }) => ({ exerciseId, sets, reps }));
    program.days.push(day.weekday === undefined ? { name, exercises } : { name, weekday: day.weekday, exercises });
  }
  return program;
}
