/**
 * A program read from another app's recent sessions (K-957, ADR-073 #1, Ek 1): each routine the user kept doing is a day,
 * on each weekday it kept to, with the moves done in most of its sessions, how many sets and the reps they fell in. Worked out
 * on the phone from the file it already read (ADR-053 §4); nothing here is sent. The user sees the draft, and only their
 * confirmation makes it their program (PUT /v1/program). A move not mapped to the catalog or an own move keeps the file's
 * name: it becomes the user's own move when they confirm, never before, so a draft turned down leaves nothing behind. A
 * name the user left out of the import is left out here too. Names differing only in case or spaces are one name.
 * Every number is a product choice in data/parameters/import.json (tag urun, ADR-073 D1); the limits are OwnProgram's.
 */
import type { components } from '@/api/schema';
import { workoutParams } from '@/train/params';

import type { FileSession } from './formats';
import { importParams } from './params';

type Schemas = components['schemas'];
type Weekday = Schemas['Weekday'];

/** A move of the day: a catalog move or an own move (`exerciseId`), or a name of the file no move was mapped to (`ownName`). */
export type DraftMove = ({ exerciseId: string } | { ownName: string }) & { sets: number; reps: Schemas['RepRange'] };
/** `weekday`: absent when the routine kept to no weekday, or another routine kept to this one more. */
export type DraftDay = { name: string; weekday?: Weekday; moves: DraftMove[] };
/** `noRoutine`: no named session repeats enough to be a day; the user types the program in instead. */
export type ProgramDraft = { kind: 'draft'; days: DraftDay[] } | { kind: 'noRoutine' };

/** In Date.getDay() order. */
const WEEKDAYS: Weekday[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
/** A product of two decimals can come out a hair over a whole number (0.15 × 20); a rank is never moved by that. */
const ROUNDING = 1e-9;

type Seen = { move: { exerciseId: string } | { ownName: string }; sessions: number; sets: number[]; reps: number[]; places: number[] };
type Day = DraftDay & { sessions: number; share: number; wants?: Weekday; first: number };

/** One spelling for a name written with other case or spaces. */
const same = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
/** The Monday of a session's week, on the phone's calendar. */
/** A week in milliseconds: two weeks' Mondays differ by a whole number of them, give or take a clock change's hour. */
const WEEK = 7 * 24 * 60 * 60 * 1000;
const weekOf = (at: Date) => new Date(at.getFullYear(), at.getMonth(), at.getDate() - ((at.getDay() + 6) % 7)).getTime();

/**
 * `choices`: the import's mapping, a file's name → its move (null or absent: none, so an own move by that name);
 * `leftOut`: the names the user chose to leave out of the import, left out here as well.
 */
export function draftProgram(sessions: FileSession[], choices: ReadonlyMap<string, string | null>, leftOut: ReadonlySet<string>): ProgramDraft {
  const p = importParams.draft;
  if (sessions.length === 0) return { kind: 'noRoutine' };
  const last = Math.max(...sessions.map((s) => s.startedAt.getTime()));
  const end = new Date(last);
  const from = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (p.weeks * 7 - 1)).getTime();
  // Each named routine of the window, its sessions oldest first, by its first spelling; the routines in the order first done.
  const routines = new Map<string, { name: string; done: FileSession[] }>();
  for (const session of [...sessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())) {
    const key = same(session.routine ?? '');
    if (session.startedAt.getTime() < from || key === '') continue;
    const routine = routines.get(key) ?? { name: session.routine ?? '', done: [] };
    routine.done.push(session);
    routines.set(key, routine);
  }

  // As many days as the routine was done a week, from the week of its first session to the week of its last. Each is on a
  // weekday it fell on in enough of the weeks it was done, the largest shares first; weekdays tied across that count, or too
  // few such weekdays, leave a day without one. Every day stands for the routine's sessions over its days.
  const candidates: Day[] = [];
  for (const { name, done } of routines.values()) {
    if (done.length < p.routineMinSessions) continue;
    const moves = movesOf(done, choices, leftOut);
    if (moves.length === 0) continue;
    const spanned = Math.round((weekOf(done[done.length - 1].startedAt) - weekOf(done[0].startedAt)) / WEEK) + 1;
    const count = Math.max(1, Math.round(done.length / spanned));
    const weeks = new Set(done.map((s) => weekOf(s.startedAt))).size;
    const onDay = new Map<Weekday, Set<number>>();
    for (const session of done) {
      const weekday = WEEKDAYS[session.startedAt.getDay()];
      onDay.set(weekday, (onDay.get(weekday) ?? new Set<number>()).add(weekOf(session.startedAt)));
    }
    const share = (weekday: Weekday) => (onDay.get(weekday)?.size ?? 0) / weeks;
    const regular = [...onDay.keys()].filter((weekday) => share(weekday) >= p.weekdayMinShare).sort((a, b) => share(b) - share(a));
    const placed = regular.length > count ? regular.filter((weekday) => share(weekday) > share(regular[count])) : regular;
    const day = { name: fit(name), moves, sessions: done.length / count, first: done[0].startedAt.getTime() };
    placed.forEach((weekday) => candidates.push({ ...day, share: share(weekday), wants: weekday }));
    for (let i = placed.length; i < count; i++) candidates.push({ ...day, share: 0 });
  }
  if (candidates.length === 0) return { kind: 'noRoutine' };

  // The days done most, as many as a program has; then each weekday to the one that kept to it most, the other without one.
  const byClaim = (a: Day, b: Day) => b.sessions - a.sessions || a.first - b.first;
  const kept = [...candidates].sort(byClaim).slice(0, workoutParams.programDaysMax);
  const taken = new Set<Weekday>();
  [...kept]
    .sort((a, b) => b.share - a.share || byClaim(a, b))
    .forEach((day) => {
      if (day.wants !== undefined && !taken.has(day.wants)) {
        taken.add(day.wants);
        day.weekday = day.wants;
      }
    });
  const order = (day: Day) => (day.weekday === undefined ? WEEKDAYS.length : (WEEKDAYS.indexOf(day.weekday) + WEEKDAYS.length - 1) % WEEKDAYS.length);
  const days = kept
    .sort((a, b) => order(a) - order(b) || a.first - b.first)
    .map(({ name, weekday, moves }) => (weekday === undefined ? { name, moves } : { name, weekday, moves }));
  return { kind: 'draft', days };
}

/** The moves of a routine: those worked in enough of its sessions, in the order they were usually done. */
function movesOf(done: FileSession[], choices: ReadonlyMap<string, string | null>, leftOut: ReadonlySet<string>): DraftMove[] {
  const p = importParams.draft;
  const seen = new Map<string, Seen>();
  for (const session of done) {
    // The moves of this session in the order first worked: a move's place is its index here.
    const here: string[] = [];
    for (const set of session.sets) {
      if (set.warmUp || leftOut.has(set.name)) continue;
      const id = choices.get(set.name);
      const move = typeof id === 'string' ? { exerciseId: id } : { ownName: set.name.trim() };
      const key = typeof id === 'string' ? `id ${id}` : `name ${same(set.name)}`;
      const counted = seen.get(key) ?? { move, sessions: 0, sets: [], reps: [], places: [] };
      if (!here.includes(key)) {
        here.push(key);
        counted.sessions++;
        counted.sets.push(0);
        counted.places.push(here.length - 1);
      }
      counted.sets[counted.sets.length - 1]++;
      counted.reps.push(set.reps);
      seen.set(key, counted);
    }
  }
  const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  return [...seen.values()]
    .filter((move) => move.sessions / done.length >= p.moveMinShare)
    .sort((a, b) => mean(a.places) - mean(b.places))
    .slice(0, workoutParams.programDayMovesMax)
    .map((move) => ({ ...move.move, sets: Math.min(lowerMiddle(move.sets), workoutParams.programMoveSetsMax), reps: repRange(move.reps) }));
}

/** The middle value; of two, the smaller. */
function lowerMiddle(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/**
 * Where the middle share of the reps fell (nearest rank), at least the span wide: opened at the top, so the reps seen
 * stay the bottom, and at the top of a set's reps at most.
 */
function repRange(reps: number[]): Schemas['RepRange'] {
  const p = importParams.draft;
  const sorted = [...reps].sort((a, b) => a - b);
  const rank = (share: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(share * sorted.length - ROUNDING) - 1))];
  const outside = (1 - p.repsMiddleShare) / 2;
  const min = rank(outside);
  const max = Math.min(Math.max(rank(1 - outside), min + p.repSpanMin), workoutParams.maxReps);
  return { min: Math.max(1, Math.min(min, max - p.repSpanMin)), max };
}

/** The routine's name as a day's name can be: cut to the limit (counted as the server counts it), whole characters only. */
function fit(name: string): string {
  let cut = '';
  for (const character of name) {
    if (cut.length + character.length > workoutParams.programDayNameMaxChars) break;
    cut += character;
  }
  return cut.trim();
}

/**
 * The draft as the user's own program (contract OwnProgram), once each move named only by the file is the own move made
 * for it (`own`: the file's name → its id). Null while one is not: such a move never goes in under a guess.
 */
export function ownProgram(days: DraftDay[], own: ReadonlyMap<string, string>): Schemas['OwnProgram'] | null {
  const program: Schemas['OwnProgram'] = { days: [] };
  for (const day of days) {
    const exercises: Schemas['OwnProgram']['days'][number]['exercises'] = [];
    for (const move of day.moves) {
      const exerciseId = 'exerciseId' in move ? move.exerciseId : own.get(move.ownName);
      if (exerciseId === undefined) return null;
      exercises.push({ exerciseId, sets: move.sets, reps: move.reps });
    }
    program.days.push(day.weekday === undefined ? { name: day.name, exercises } : { name: day.name, weekday: day.weekday, exercises });
  }
  return program;
}
