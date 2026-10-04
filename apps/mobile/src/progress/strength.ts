/**
 * The strength line (K-604, prototype 4.4): a compound lift's estimated 1RM week by week. Progress is judged over the
 * evaluation window (3 months, G1 K-25) and decisions read a short one (the last weeks, 03 §5): the line spans the first
 * and marks the second apart, so a flat week is not read as a setback. The estimate is K-218's — the engine's Epley,
 * mirrored in summary.ts (MobileParameterMirrorTests): nothing here estimates on its own. Read from the move's history
 * (ADR-033: the server's list kept on the phone, joined with what is not sent yet).
 */
import type { components } from '@/api/schema';
import type { Session } from '@/train/history';
import { workoutParams } from '@/train/params';
import { e1rm } from '@/train/summary';
import type { Move } from '@/train/trainData';
import { localDay } from '@/today/today';

type NewSet = components['schemas']['NewSet'];

/**
 * One week of a lift: its best estimated 1RM (kg); `easier` when its top set was the last point's weight for the same
 * reps with more reps in reserve — the same work got easier, which a flat line would hide (prototype 4.4's ring).
 */
export type StrengthPoint = { week: string; kg: number; easier: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

/** A calendar day `days` on (or back), read as a date only: no time zone or clock change moves it. */
function plusDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The Monday of a day's week (the check-in's week, K-501). */
export function weekOf(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // Sunday 0
  return plusDays(day, -((weekday + 6) % 7));
}

/**
 * The line's first day: the first Monday inside the evaluation window (evaluation_window_days days, today included).
 * Every week on the line is whole — a week counted from its Friday would be called the week's best, and start low.
 */
export function windowFrom(today: string): string {
  const first = plusDays(today, -(workoutParams.evaluationWindowDays - 1));
  const monday = weekOf(first);
  return monday === first ? first : plusDays(monday, 7);
}

/** The decision window's first Monday: effort_call_window_weeks weeks, this one included. */
export function callFrom(today: string): string {
  return plusDays(weekOf(today), -7 * (workoutParams.effortCallWindowWeeks - 1));
}

/** The sets of a lift K-218 can estimate, by week, oldest week first: work sets only, inside the evaluation window. */
function estimableByWeek(moveId: string, sessions: Session[], today: string): [string, NewSet[]][] {
  const from = windowFrom(today);
  const weeks = new Map<string, NewSet[]>();
  for (const session of sessions) {
    const day = localDay(new Date(session.startedAt));
    if (day < from || day > today) continue;
    const sets = session.sets.filter((s) => s.exerciseId === moveId && s.setType === 'WORKING' && e1rm(s.loadKg, s.reps, s.rir) !== null);
    if (sets.length === 0) continue;
    const week = weekOf(day);
    weeks.set(week, [...(weeks.get(week) ?? []), ...sets]);
  }
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** A week's top set: its heaviest (as the user sees weights), then its most reps, then the fewest left in the tank. */
function topSet(sets: NewSet[], shown: (kg: number) => number): NewSet {
  return [...sets].sort((a, b) => shown(b.loadKg) - shown(a.loadKg) || b.reps - a.reps || (a.rir ?? 0) - (b.rir ?? 0))[0];
}

/**
 * The lift's weeks inside the evaluation window, oldest first; a week with no set K-218 can estimate (no RIR, past the
 * reps to failure Epley holds for) has no point. Weights compare as `shown` (the user's unit, as the screen writes them).
 */
export function strengthPoints(moveId: string, sessions: Session[], today: string, shown: (kg: number) => number = (kg) => kg): StrengthPoint[] {
  let last: NewSet | null = null;
  return estimableByWeek(moveId, sessions, today).map(([week, sets]) => {
    const kg = Math.max(...sets.map((s) => e1rm(s.loadKg, s.reps, s.rir) ?? -Infinity));
    const top = topSet(sets, shown);
    // Every set here has its RIR (no estimate without one).
    const easier = last !== null && shown(top.loadKg) === shown(last.loadKg) && top.reps === last.reps && (top.rir ?? 0) > (last.rir ?? 0);
    last = top;
    return { week, kg, easier };
  });
}

/**
 * The lifts the chart can draw, the most weeks first (a tie by id, so the order holds): compound lifts with an outside
 * load (G6 K-33: an isolation move is not tracked by its weight; a weighted bodyweight move's estimate adds the
 * bodyweight, which the phone does not read — ADR-033) that have at least one point. A move not in the catalog read is
 * left out: its load model is unknown.
 */
export function strengthMoves(moves: ReadonlyMap<string, Move>, sessions: Session[], today: string): string[] {
  const ids = new Set(sessions.flatMap((s) => s.sets.map((set) => set.exerciseId)));
  return [...ids]
    .filter((id) => {
      const move = moves.get(id);
      return move !== undefined && move.kind === 'COMPOUND' && move.load === 'EXTERNAL';
    })
    .map((id) => [id, estimableByWeek(id, sessions, today).length] as const)
    .filter(([, weeks]) => weeks > 0)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([id]) => id);
}
