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
import { dayName } from './program';
import { type Move, ownMove } from './trainData';

type Schemas = components['schemas'];
type Weekday = Schemas['Weekday'];

/** The weekdays a day can be on, Monday first. */
export const WEEKDAYS: readonly Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/** `rowId`: the program's row of the move (PlannedExercise.id), kept by an edit (PATCH /v1/program); absent for a move added. */
export type EditedMove = { rowId?: string; exerciseId: string; sets: number; reps: Schemas['RepRange'] };
/** `id`: the day's own, for the screen (never sent); `weekday`: absent when the day is on none. */
export type EditedDay = { id: string; name: string; weekday?: Weekday; moves: EditedMove[] };

const PENDING = 'pending:';
/** Whether a move's id is an own move not made on the server yet. */
export const isPending = (exerciseId: string) => exerciseId.startsWith(PENDING);

/** The user's own move, answered, as a move of the editor until the program is sent. */
export function pendingMove(body: Schemas['NewCustomExercise']): Move {
  return ownMove({ ...body, id: `${PENDING}${body.clientId}` });
}

let made = 0;
/** An id for a day not made yet: the screen can open the day it is about to add. */
export function nextDayId(): string {
  made += 1;
  return `day-${made}`;
}
const changed = (all: EditedDay[], at: number, day: EditedDay) => all.map((d, i) => (i === at ? day : d));

/** A day after the last, named by its place (`id`: one from nextDayId, or a new one). */
export function newDay(all: EditedDay[], id: string = nextDayId()): EditedDay[] {
  if (all.length >= P.programDaysMax) return all;
  return [...all, { id, name: t('programEditor.defaultName', { number: all.length + 1 }), moves: [] }];
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

/**
 * A day put back where it was (Undo); none past the most a program has. Its weekday, if another day took it meanwhile,
 * stays that day's: the day comes back on none (a weekday is one day's).
 */
export function withDayAt(all: EditedDay[], day: EditedDay, at: number): EditedDay[] {
  if (all.length >= P.programDaysMax) return all;
  let back = day;
  if (day.weekday !== undefined && weekdayTaken(all, -1, day.weekday)) {
    const { weekday: _taken, ...rest } = day;
    back = rest;
  }
  return [...all.slice(0, at), back, ...all.slice(at)];
}

/** A move put back where it was in its day (Undo); not into a day gone meanwhile, past the most, or twice. */
export function withMoveAt(all: EditedDay[], dayId: string, move: EditedMove, index: number): EditedDay[] {
  const at = all.findIndex((day) => day.id === dayId);
  if (at < 0) return all;
  const { moves } = all[at];
  if (moves.length >= P.programDayMovesMax || moves.some((m) => m.exerciseId === move.exerciseId)) return all;
  return changed(all, at, { ...all[at], moves: [...moves.slice(0, index), move, ...moves.slice(index)] });
}

export function withoutMove(all: EditedDay[], at: number, index: number): EditedDay[] {
  return changed(all, at, { ...all[at], moves: all[at].moves.filter((_, i) => i !== index) });
}

const within = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export type Stepped = 'sets' | 'min' | 'max';

/**
 * The lowest and highest a move's number can be: sets 1 to the most; the fewest reps at most the most, the most at most a
 * set's. The fewest at the most is a fixed rep target (5 x 5, K-991): the engine then adds only load.
 */
function bounds(move: EditedMove, field: Stepped): [number, number] {
  if (field === 'sets') return [1, P.programMoveSetsMax];
  return field === 'min' ? [1, move.reps.max] : [move.reps.min, P.maxReps];
}

/** A move's sets, or the fewest or the most of its reps, a step up or down: each on its own (5 x 5, 3-5, 12-15), never past each other. */
export function stepped(all: EditedDay[], at: number, index: number, field: Stepped, by: number): EditedDay[] {
  const move = all[at].moves[index];
  const [low, high] = bounds(move, field);
  const next: EditedMove =
    field === 'sets'
      ? { ...move, sets: within(move.sets + by, low, high) }
      : { ...move, reps: { ...move.reps, [field]: within(move.reps[field] + by, low, high) } };
  return changed(all, at, { ...all[at], moves: all[at].moves.map((m, i) => (i === index ? next : m)) });
}

/** Whether a step that way would change the number: the steppers' buttons are off where it would not. */
export function canStep(move: EditedMove, field: Stepped, by: number): boolean {
  const [low, high] = bounds(move, field);
  const value = field === 'sets' ? move.sets : move.reps[field];
  return by < 0 ? value > low : value < high;
}

/**
 * The program to send (contract OwnProgram), each pending own move named by the id `made` gives it; none while a day
 * has no name (or too long a one) or no move, a pending move has no id yet, or there is no day.
 */
export function ownProgramOf(all: EditedDay[], made: ReadonlyMap<string, string> = new Map()): Schemas['OwnProgram'] | null {
  if (all.length === 0) return null;
  // A weekday is one day's: two on one would be refused by the server, again on every try.
  const weekdays = all.flatMap((day) => (day.weekday === undefined ? [] : [day.weekday]));
  if (new Set(weekdays).size !== weekdays.length) return null;
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

/**
 * The program as the server sent it, as the editor's days (K-970 Edit, PATCH /v1/program): each day by its id and the
 * name it shows, each move by its row (`rowId`) with the program's sets (`baseSets`, not a lighter week's) and range.
 */
export function editedDays(program: Schemas['Program']): EditedDay[] {
  return program.days.map((day) => {
    const moves = day.exercises.map((e) => ({ ...(e.id === undefined ? {} : { rowId: e.id }), exerciseId: e.exerciseId, sets: e.baseSets, reps: { ...e.reps } }));
    return day.weekday === undefined ? { id: day.id, name: dayName(day), moves } : { id: day.id, name: dayName(day), weekday: day.weekday, moves };
  });
}

/**
 * The edit to send (contract ProgramEdit): every day in order, a day of the program by its id (its name only when the
 * user renamed it: a generated day keeps its own otherwise), a new day with its name; every move by its row, a new one
 * without. None while a day has no move or no name, or a weekday is two days': the server would refuse it.
 */
export function programEditOf(days: EditedDay[], program: Schemas['Program']): Schemas['ProgramEdit'] | null {
  if (days.length === 0) return null;
  const weekdays = days.flatMap((day) => (day.weekday === undefined ? [] : [day.weekday]));
  if (new Set(weekdays).size !== weekdays.length) return null;
  const was = new Map(program.days.map((day) => [day.id, day]));
  const edit: Schemas['ProgramEdit'] = { days: [] };
  for (const day of days) {
    const name = day.name.trim();
    if (name === '' || name.length > P.programDayNameMaxChars || day.moves.length === 0) return null;
    const before = was.get(day.id);
    const exercises = day.moves.map(({ rowId, exerciseId, sets, reps }) => ({ ...(rowId === undefined ? {} : { id: rowId }), exerciseId, sets, reps }));
    edit.days.push({
      ...(before === undefined ? {} : { id: day.id }),
      ...(before === undefined || dayName(before) !== name ? { name } : {}),
      ...(day.weekday === undefined ? {} : { weekday: day.weekday }),
      exercises,
    });
  }
  return edit;
}

/**
 * The moves whose next target the edit will take away, as the server does (ADR-073 Ek 7), each named once: a row kept with
 * another rep range (its target was for the old one), when it had one; or a move taken out and added again, which is a new
 * row without the target the old one had (a row of the program with a target whose move comes back without a row, while
 * the row itself is no longer in the edit). Other sets, another day, keep it. Said before saving.
 */
export function targetsLost(days: EditedDay[], program: Schemas['Program']): string[] {
  const rows = new Map(program.days.flatMap((day) => day.exercises.flatMap((e) => (e.id === undefined ? [] : [[e.id, e] as const]))));
  const kept = new Set(days.flatMap((day) => day.moves.flatMap((m) => (m.rowId === undefined ? [] : [m.rowId]))));
  // The moves that had a target on a row the edit no longer has.
  const droppedWithTarget = new Set([...rows.values()].filter((e) => e.nextLoadKg !== undefined && !kept.has(e.id as string)).map((e) => e.exerciseId));
  const lost = days.flatMap((day) =>
    day.moves.flatMap((m) => {
      if (m.rowId === undefined) return droppedWithTarget.has(m.exerciseId) ? [m.exerciseId] : [];
      const row = rows.get(m.rowId);
      if (row === undefined || row.nextLoadKg === undefined || row.exerciseId !== m.exerciseId) return [];
      return row.reps.min !== m.reps.min || row.reps.max !== m.reps.max ? [m.exerciseId] : [];
    }),
  );
  return [...new Set(lost)];
}

/**
 * Whether the edit under way still fits the program as the server has it now (after a 409): every day and row it kept from
 * `before` (the program it was made on) is in `now`. A day or move the user added has no id in the program and needs none;
 * one the user took out need not be there. When it fits, the 409 was not the program changing under the edit (it was
 * today's workout on a day the edit moves or removes), and the edit is not lost.
 */
export function draftFits(days: EditedDay[], before: Schemas['Program'], now: Schemas['Program']): boolean {
  const wasDays = new Set(before.days.map((day) => day.id));
  const nowDays = new Set(now.days.map((day) => day.id));
  const nowRows = new Set(now.days.flatMap((day) => day.exercises.flatMap((e) => (e.id === undefined ? [] : [e.id]))));
  return days.every((day) => (!wasDays.has(day.id) || nowDays.has(day.id)) && day.moves.every((m) => m.rowId === undefined || nowRows.has(m.rowId)));
}
