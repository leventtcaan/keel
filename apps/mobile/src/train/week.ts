/**
 * This week's sessions as the Train tab reads them (K-970, ADR-073 Ek 3). Every date, move and flag is the server's
 * (`Program.week`: moved, skipped, short, today's swaps); nothing here moves a session or works out a chain. The phone
 * finds today's date among the server's dates, puts a session's moves in its order with today's swaps in their place,
 * and names the split from the days' names (a day's copy says which split it is from).
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';

type Schemas = components['schemas'];
type Weekday = Schemas['Weekday'];

export type Found = { session: Schemas['WeekSession']; day: Schemas['ProgramDay'] };
/** A move of the session; `insteadOf`: the planned move it stands in for today (a swap, today only). */
export type SessionMove = { planned: Schemas['PlannedExercise']; insteadOf?: Schemas['PlannedExercise'] };
export type WeekRow = Found & { weekday: Weekday };

const BY_UTC_DAY: readonly Weekday[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** The weekday of a calendar day (YYYY-MM-DD), read as a date only: no time zone moves it. */
export function weekdayOf(date: string): Weekday {
  return BY_UTC_DAY[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function found(program: Schemas['Program'], session: Schemas['WeekSession']): Found | null {
  const day = program.days.find((d) => d.id === session.programDayId);
  return day === undefined ? null : { session, day };
}

const sessions = (program: Schemas['Program']): Found[] =>
  [...(program.week ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((s) => found(program, s) ?? []);

/** The week's session on this date (today), with its program day; none on a day without one. */
export function todaySession(program: Schemas['Program'], date: string): Found | null {
  return sessions(program).find((f) => f.session.date === date) ?? null;
}

/** The session's moves in its order: the short version's only, and a move swapped for today in its planned move's place. */
export function sessionMoves(day: Schemas['ProgramDay'], session: Schemas['WeekSession']): SessionMove[] {
  return session.exerciseIds.flatMap((id): SessionMove[] => {
    const swap = session.swaps?.find((s) => s.exercise.exerciseId === id);
    if (swap !== undefined) {
      const insteadOf = day.exercises.find((e) => e.exerciseId === swap.insteadOf);
      return [insteadOf === undefined ? { planned: swap.exercise } : { planned: swap.exercise, insteadOf }];
    }
    const planned = day.exercises.find((e) => e.exerciseId === id);
    return planned === undefined ? [] : [{ planned }];
  });
}

/** The week's sessions but today's, in date order, each on the weekday of its date. */
export function weekRows(program: Schemas['Program'], date: string): WeekRow[] {
  return sessions(program)
    .filter((f) => f.session.date !== date)
    .map((f) => ({ ...f, weekday: weekdayOf(f.session.date) }));
}

/**
 * The program's split in words: the user's own is their own; a generated one is each split its days are from, once, in
 * the days' order ("Upper / Lower + Push / Pull / Legs"), never one name for the whole.
 */
export function splitName(program: Schemas['Program']): string {
  if (program.source === 'OWN') return t('train.split.own');
  const names = program.days.flatMap((day) => {
    const key = `programDays.${day.nameKey ?? ''}.split`;
    return day.nameKey !== undefined && has(key) ? [t(key)] : [];
  });
  return [...new Set(names)].join(t('train.split.join'));
}
