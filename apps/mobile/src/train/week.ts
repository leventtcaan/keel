/**
 * This week's sessions as the Train tab reads them (K-970, ADR-073 Ek 3). Every date, move and flag is the server's
 * (`Program.week`: moved, skipped, short, today's swaps; `Program.today`); nothing here moves a session or works out a chain. The phone
 * finds today's date among the server's dates, puts a session's moves in its order with today's swaps in their place,
 * and names the split from the days' names (a day's copy says which split it is from).
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';
import type { LocalRecord } from '@/sync/store';

import { localDay } from '@/today/today';

import { type ActiveWorkout, activeWorkout } from './workout';

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

/**
 * The week's session on the server's today (`Program.today`, the user's calendar; K-995), with its program day; none on a
 * day without one. Never the phone's clock: travelling, the phone's date is another day than the server's. Without the
 * server's word on today, no session is taken for today.
 */
export function todaySession(program: Schemas['Program']): Found | null {
  if (program.today === undefined) return null;
  return sessions(program).find((f) => f.session.date === program.today) ?? null;
}

/**
 * The session the server moved off today ("Move it"): the one moved that can still be undone, as only today's move can
 * (`undoable`); today is rest, and where it went is its date. Not by `movedFrom`: that is the session's own day in the
 * program, which a session moved twice, or pushed along in a chain, does not share with today.
 */
export function movedOffToday(program: Schemas['Program']): Found | null {
  return sessions(program).find((f) => f.session.moved === true && f.session.undoable === true) ?? null;
}

/**
 * Today's session, as the Train tab and This week read it (K-970, K-969, K-995):
 * - `onPhone`: a workout on this phone not finished (its sets may still be in the queue): it is continued, never a second
 *   one started; today's session is under way when it is that session.
 * - `done`: finished on this phone (the finish may still be in the queue), or the server's DONE.
 * - `openElsewhere`: the server's OPEN with nothing of it on this phone: it goes on there, this phone starts none.
 * The phone's records come first; the server's word only after them. `stale`: the program is the copy kept offline;
 * then today is the phone's day and the copy's session states (workout, undoable, the move's preview) are not believed:
 * they were the server's when it was kept.
 */
export type SessionStatus = 'onPhone' | 'done' | 'openElsewhere' | 'none';
export type SessionState = { today: string; stale: boolean; found: Found | null; status: SessionStatus; onPhone: ActiveWorkout | null };

/**
 * Today, as every training screen reads it (the Train card, Change, swap, the session): the server's (`Program.today`, the
 * user's calendar), unless the program is the copy kept offline or says none: then the phone's own day.
 */
export function todayFor(program: Schemas['Program'] | null, kept: boolean, now: Date): string {
  return program === null || kept || program.today === undefined ? localDay(now) : program.today;
}

export function sessionState({ program, kept, records, now }: { program: Schemas['Program']; kept: boolean; records: LocalRecord[]; now: Date }): SessionState {
  const phoneDay = localDay(now);
  const stale = kept || program.today === undefined;
  const today = todayFor(program, kept, now);
  const found = sessions(program).find((f) => f.session.date === today) ?? null;
  // One left open past the server's close is closed there already: not under way, so today's session can start (K-972).
  const onPhone = activeWorkout(records, now.getTime());
  let status: SessionStatus = 'none';
  if (found !== null) {
    const id = found.day.id;
    if (onPhone !== null && onPhone.programDayId === id && localDay(new Date(onPhone.startedAt)) === phoneDay) status = 'onPhone';
    else if (finishedOnPhone(records, phoneDay, id)) status = 'done';
    else if (!stale && found.session.workout?.state === 'DONE') status = 'done';
    else if (!stale && found.session.workout?.state === 'OPEN') status = onPhone !== null && onPhone.programDayId === id ? 'onPhone' : 'openElsewhere';
  }
  return { today, stale, found, status, onPhone };
}

/** Whether a workout of this program day started on this day was finished on this phone (its finish sent or not). */
function finishedOnPhone(records: LocalRecord[], day: string, programDayId: string): boolean {
  const kept = (r: LocalRecord) => r.state !== 'REJECTED';
  const finished = new Set(records.filter((r) => r.kind === 'finish' && kept(r)).map((r) => r.parentClientId));
  return records.some((r) => {
    if (r.kind !== 'workout' || !kept(r) || !finished.has(r.clientId)) return false;
    const body = r.body as Schemas['NewWorkout'];
    return body.programDayId === programDayId && localDay(new Date(body.startedAt)) === day;
  });
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

/**
 * What "Move it" would do now, as the server says (`WeekSession.movePreview`, K-995): each session it puts on a new day,
 * with its program day and the weekday of the new date; `conflict` when the server would refuse it. None without a preview.
 */
export function moveShifts(
  program: Schemas['Program'],
  session: Schemas['WeekSession'],
): { shifts: { day: Schemas['ProgramDay']; date: string; weekday: Weekday }[]; conflict: NonNullable<Schemas['MovePreview']['conflict']> | null } | null {
  const preview = session.movePreview;
  if (preview === undefined) return null;
  const shifts = preview.shifts.flatMap((shift) => {
    const day = program.days.find((d) => d.id === shift.programDayId);
    return day === undefined ? [] : [{ day, date: shift.date, weekday: weekdayOf(shift.date) }];
  });
  return { shifts, conflict: preview.conflict ?? null };
}

/** The week's sessions but today's (the server's today), in date order, each on the weekday of its date. */
export function weekRows(program: Schemas['Program'], today: string | undefined = program.today): WeekRow[] {
  return sessions(program)
    .filter((f) => f.session.date !== today)
    .map((f) => ({ ...f, weekday: weekdayOf(f.session.date) }));
}

/**
 * The program's split in words: the user's own is their own; a generated one is each split its days are from, once, in
 * the days' order ("Upper / Lower + Push / Pull / Legs"), never one name for the whole.
 */
export function splitName(program: Schemas['Program']): string {
  if (program.source === 'OWN') return t('train.split.own');
  // The server names a generated day by its whole copy key ("programDays.upper_a.name", K-996); its split sits beside it.
  const names = program.days.flatMap((day) => {
    const key = day.nameKey?.replace(/\.name$/, '.split');
    return key !== undefined && key !== day.nameKey && has(key) ? [t(key)] : [];
  });
  return [...new Set(names)].join(t('train.split.join'));
}
