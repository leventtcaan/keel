/**
 * A program the user writes or changes (K-968 "Type it in"; K-970's Edit reuses it): days with a name and, when the user
 * gives one, a weekday, used once; moves with their sets and rep range. Every change keeps it within what the contract's
 * OwnProgram takes (its limits mirrored in workout.json); a change that would leave them is no change. A move added starts
 * from program_new_move_sets and the engine's range of its kind; the user sets their own. An own move the user makes is
 * pending (`pending:<clientId>`) until the program is sent: then it is made and the program names it by the server's id
 * (ADR-073 Ek 2). Pure: the editor and the tests share it.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

import { workoutParams as P } from './params';
import { type Move, ownMove } from './trainData';

type Schemas = components['schemas'];
type Weekday = Schemas['Weekday'];

/** The weekdays a day can be on, Monday first. */
export const WEEKDAYS: readonly Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export type EditedMove = { exerciseId: string; sets: number; reps: Schemas['RepRange'] };
/** `id`: the day's own, for the screen (never sent); `weekday`: absent when the day is on none. */
export type EditedDay = { id: string; name: string; weekday?: Weekday; moves: EditedMove[] };

const PENDING = 'pending:';
/** Whether a move's id is an own move not made on the server yet. */
export const isPending = (exerciseId: string) => exerciseId.startsWith(PENDING);

/** The user's own move, answered, as a move of the editor until the program is sent. */
export function pendingMove(body: Schemas['NewCustomExercise']): Move {
  return ownMove({ ...body, id: `${PENDING}${body.clientId}` });
}

let days = 0;
const changed = (all: EditedDay[], at: number, day: EditedDay) => all.map((d, i) => (i === at ? day : d));

/** A day after the last, named by its place. */
export function newDay(all: EditedDay[]): EditedDay[] {
  if (all.length >= P.programDaysMax) return all;
  days += 1;
  return [...all, { id: `day-${days}`, name: t('programEditor.defaultName', { number: all.length + 1 }), moves: [] }];
}

export function withoutDay(all: EditedDay[], at: number): EditedDay[] {
  return all.filter((_, i) => i !== at);
}

export function renamed(all: EditedDay[], at: number, name: string): EditedDay[] {
  return changed(all, at, { ...all[at], name });
}

/** Whether another day is on this weekday already. */
export function weekdayTaken(all: EditedDay[], at: number, weekday: Weekday): boolean {
  return all.some((day, i) => i !== at && day.weekday === weekday);
}

/** The day on this weekday, or on none (undefined); a weekday another day has is no change. */
export function withWeekday(all: EditedDay[], at: number, weekday: Weekday | undefined): EditedDay[] {
  if (weekday !== undefined && weekdayTaken(all, at, weekday)) return all;
  const { weekday: _was, ...day } = all[at];
  return changed(all, at, weekday === undefined ? day : { ...day, weekday });
}

/** A move added at the end of the day; none past the most a day has, nor one the day has already. */
export function withMove(all: EditedDay[], at: number, move: Move): EditedDay[] {
  const day = all[at];
  if (day.moves.length >= P.programDayMovesMax || day.moves.some((m) => m.exerciseId === move.id)) return all;
  const added = { exerciseId: move.id, sets: P.programNewMoveSets, reps: { ...P.programNewMoveReps[move.kind] } };
  return changed(all, at, { ...day, moves: [...day.moves, added] });
}

export function withoutMove(all: EditedDay[], at: number, index: number): EditedDay[] {
  return changed(all, at, { ...all[at], moves: all[at].moves.filter((_, i) => i !== index) });
}

const within = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * A move's sets a step up or down (1 to the most), or its rep range moved as a window (6-10 → 7-11), its width kept,
 * never under one rep nor over the reps a set takes.
 */
export function stepped(all: EditedDay[], at: number, index: number, field: 'sets' | 'reps', by: number): EditedDay[] {
  const move = all[at].moves[index];
  const { min, max } = move.reps;
  let next: EditedMove;
  if (field === 'sets') {
    next = { ...move, sets: within(move.sets + by, 1, P.programMoveSetsMax) };
  } else {
    const from = within(min + by, 1, P.maxReps - (max - min));
    next = { ...move, reps: { min: from, max: from + (max - min) } };
  }
  return changed(all, at, { ...all[at], moves: all[at].moves.map((m, i) => (i === index ? next : m)) });
}

/** Whether a step that way would change the number: the steppers' buttons are off where it would not. */
export function canStep(move: EditedMove, field: 'sets' | 'reps', by: number): boolean {
  if (field === 'sets') return by < 0 ? move.sets > 1 : move.sets < P.programMoveSetsMax;
  return by < 0 ? move.reps.min > 1 : move.reps.max < P.maxReps;
}

/**
 * The program to send (contract OwnProgram), each pending own move named by the id `made` gives it; none while a day
 * has no name (or too long a one) or no move, a pending move has no id yet, or there is no day.
 */
export function ownProgramOf(all: EditedDay[], made: ReadonlyMap<string, string> = new Map()): Schemas['OwnProgram'] | null {
  if (all.length === 0) return null;
  const program: Schemas['OwnProgram'] = { days: [] };
  for (const day of all) {
    const name = day.name.trim();
    // The server counts a name in UTF-16 units, as length does.
    if (name === '' || name.length > P.programDayNameMaxChars || day.moves.length === 0) return null;
    const exercises: Schemas['OwnProgram']['days'][number]['exercises'] = [];
    for (const { exerciseId, sets, reps } of day.moves) {
      const id = isPending(exerciseId) ? made.get(exerciseId) : exerciseId;
      if (id === undefined) return null;
      exercises.push({ exerciseId: id, sets, reps });
    }
    program.days.push(day.weekday === undefined ? { name, exercises } : { name, weekday: day.weekday, exercises });
  }
  return program;
}

/** The pending own moves the program names, each once, in the order first named. */
export function pendingIn(all: EditedDay[]): string[] {
  return [...new Set(all.flatMap((day) => day.moves.map((m) => m.exerciseId).filter(isPending)))];
}
