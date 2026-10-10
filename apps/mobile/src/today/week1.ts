/**
 * The first week's days (K-978, ADR-077 #4, Ek 1 and Ek 4): the call that closes the first week can move the missed
 * sessions to other days, or add a day. The server says which days it suggests (`suggested`); the user may pick others,
 * and the save is an edit of the program's days by their ids (PATCH /v1/program, K-995 B), so every row keeps its target.
 * The phone works out no day and no rule: it puts the chosen weekdays on the days the program already has.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { WEEKDAYS } from '@/train/programEdit';

type Schemas = components['schemas'];
export type Weekday = Schemas['Weekday'];

export type DayCall = { kind: 'move'; missed: Weekday[]; suggested: Weekday[] } | { kind: 'add'; toDays: number; suggested: Weekday[] };
/** A session that goes from one weekday to another. */
export type DayMove = { from: Weekday; to: Weekday };
/** `conflict`: the server's "not now", or the program no longer has the day (nothing changed); `offline`: no answer. */
export type Saved = { kind: 'done' } | { kind: 'conflict' } | { kind: 'offline' } | { kind: 'failed' };

/** The first week's day calls (ADR-077 Ek 1: NOT_NEEDED, the days are the user's to pick); every other call, none. */
export function dayCall(decision: Schemas['Decision']): DayCall | null {
  const action = decision.action;
  if (action.type === 'MOVE_MISSED_SESSIONS') return { kind: 'move', missed: action.missed, suggested: action.suggested };
  if (action.type === 'ADD_TRAINING_DAY') return { kind: 'add', toDays: action.toDays, suggested: action.suggested };
  return null;
}

/** The weekdays the program trains on, in the week's order. */
export function trainingWeekdays(program: Schemas['Program']): Weekday[] {
  const on = new Set(program.days.flatMap((day) => (day.weekday === undefined ? [] : [day.weekday])));
  return WEEKDAYS.filter((day) => on.has(day));
}

/** The weekdays the program does not train on: where a session can go. */
export function freeDays(program: Schemas['Program']): Weekday[] {
  const on = new Set(trainingWeekdays(program));
  return WEEKDAYS.filter((day) => !on.has(day));
}

/**
 * The program as the edit takes it (every day in order, by id; every move by its row id with the program's sets and
 * range), with the moved sessions on their new weekdays. Null when it cannot be: a session whose weekday the program
 * no longer trains on, a target weekday that is a training day already, or one chosen twice — the program changed since,
 * or the choice cannot be saved; nothing is sent.
 */
export function moveBody(program: Schemas['Program'], moves: DayMove[]): Schemas['ProgramEdit'] | null {
  const free = new Set(freeDays(program));
  const trained = new Set(trainingWeekdays(program));
  const targets = moves.map((move) => move.to);
  if (new Set(targets).size !== targets.length) return null;
  if (moves.some((move) => !trained.has(move.from) || !free.has(move.to))) return null;
  const to = new Map(moves.map((move) => [move.from, move.to]));
  return {
    days: program.days.map((day) => {
      const weekday = day.weekday === undefined ? undefined : (to.get(day.weekday) ?? day.weekday);
      return {
        id: day.id,
        ...(weekday === undefined ? {} : { weekday }),
        exercises: day.exercises.map((move) => ({ id: move.id, exerciseId: move.exerciseId, sets: move.baseSets, reps: move.reps })),
      };
    }),
  };
}

/**
 * Save the moved sessions. The program was read for the choice; if it no longer fits it (a day gone), nothing is sent
 * (`conflict`). The server's CONFLICT (409) is its "not now" (a session of today already started); no answer is `offline`.
 */
export async function moveDays(api: ApiClient, program: Schemas['Program'], moves: DayMove[]): Promise<Saved> {
  const body = moveBody(program, moves);
  if (body === null) return { kind: 'conflict' };
  let answer;
  try {
    answer = await api.PATCH('/v1/program', { body });
  } catch {
    return { kind: 'offline' };
  }
  if (answer.data !== undefined) return { kind: 'done' };
  return answer.response.status === 409 ? { kind: 'conflict' } : { kind: 'failed' };
}
