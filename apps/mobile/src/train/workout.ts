/**
 * The workout on the phone (K-405, B §6.5: one tap per set). Built from the phone's own records (K-304) — the workout,
 * its sets and its finish are records like any other, so a workout started offline is found again after a restart, and
 * last time's sets are there without the network. Nothing here decides a load: the server's next target (K-217) is the
 * faint suggestion as it came; only what the user lifted in this session is carried to the next row.
 */
import type { components } from '@/api/schema';
import type { Outbound } from '@/sync/queue';
import type { LocalRecord } from '@/sync/store';

import { workoutParams } from './params';
import { noteOf } from './session';

type Schemas = components['schemas'];
type NewSet = Schemas['NewSet'];

export type ActiveWorkout = { clientId: string; startedAt: string; programDayId: string | null; sets: NewSet[] };

export type SetRow = {
  side: Schemas['Side'];
  /**
   * Shown faint; one tap logs it as it is. `loadKg` null: nothing to go on, the user types it; `reps` null likewise (a
   * move added to the session that was never done before: no range to start from — none is made up, K-416).
   */
  suggested: { loadKg: number | null; reps: number | null };
  /** The same row last time (same side, same position), if there was one. */
  last: NewSet | null;
  done: NewSet | null;
  /** Skipped in this session (K-972): no set, no catch-up; the next row is the one after. */
  skipped?: boolean;
};

/**
 * What was skipped of a planned move in this session (K-972, ADR-075 #5), kept on the phone only: a set skipped is no
 * set (none is sent), its row by side and set number; a move skipped has every set not done skipped.
 */
export type Skipped = { sets: { side: Schemas['Side']; set: number }[]; move: boolean };

export const NONE_SKIPPED: Skipped = { sets: [], move: false };

/**
 * `current`: the first row not done or skipped yet; null when every planned row is either. `open`: a move outside the
 * plan — its rows end in one open row, there is no count to reach (K-416). `skippedMove`: the move skipped (K-972).
 */
export type ExercisePlan = { exerciseId: string; rows: SetRow[]; current: number | null; open?: true; skippedMove?: true };

/** Records the server took or will take: a refused one is not part of what was done. */
const kept = (record: LocalRecord) => record.state !== 'REJECTED';

/** A workout's sets as kept on the phone, in the order they were done (a refused one is not part of it). */
export const setsOf = (records: LocalRecord[], workoutClientId: string) =>
  records
    .filter((r) => r.kind === 'set' && r.parentClientId === workoutClientId && kept(r))
    .sort((a, b) => a.seq - b.seq)
    .map((r) => r.body as NewSet);

/**
 * Whether a workout started at `startedAt` has been open longer than the server keeps one open
 * (unfinished_session_close_hours, K-961): by `now` it is closed there already, with no end known.
 */
export function openTooLong(startedAt: string, now: number): boolean {
  return Date.parse(startedAt) < now - workoutParams.unfinishedSessionCloseHours * 60 * 60 * 1000;
}

/**
 * The newest workout, while it has no finish, with its sets in the order they were done. Only the newest: an older one
 * left open (a double tap on Start) does not come back once the newest is finished or refused (K-405 review). A finish the server
 * refused does not count, so the workout can be finished again. Given `now`, a workout left open past the server's close
 * is retired (K-972): the server closed it, and it would hold the Train tab for good. Its records stay and sync as they are.
 */
export function activeWorkout(records: LocalRecord[], now?: number): ActiveWorkout | null {
  const finished = new Set(records.filter((r) => r.kind === 'finish' && kept(r)).map((r) => r.parentClientId));
  const open = records.filter((r) => r.kind === 'workout').sort((a, b) => b.seq - a.seq)[0];
  if (open === undefined || !kept(open) || finished.has(open.clientId)) return null;
  const body = open.body as Schemas['NewWorkout'];
  if (now !== undefined && openTooLong(body.startedAt, now)) return null;
  return { clientId: open.clientId, startedAt: body.startedAt, programDayId: body.programDayId ?? null, sets: setsOf(records, open.clientId) };
}

/** A workout as the phone keeps it, by its clientId (its program day), or null. */
export function workoutOf(records: LocalRecord[], clientId: string): Schemas['NewWorkout'] | null {
  const found = records.find((r) => r.kind === 'workout' && r.clientId === clientId);
  return found === undefined ? null : (found.body as Schemas['NewWorkout']);
}

/**
 * Whether a move was done before (ADR-075 Ek 8): the phone has sets of it from another workout (`last`), or the server has
 * its best set (`lastBestSet`, which a swapped-in move carries from its own table). A move with no history at all is at its
 * first session, where its weight is picked and found; one with a history starts from it.
 */
export function hasHistory(planned: Schemas['PlannedExercise'], last: NewSet[]): boolean {
  return last.length > 0 || planned.lastBestSet !== undefined;
}

/** The working sets of a move in the newest other workout that has it. */
export function lastTime(records: LocalRecord[], exerciseId: string, except: string): NewSet[] {
  const workouts = records.filter((r) => r.kind === 'workout' && r.clientId !== except && kept(r)).sort((a, b) => b.seq - a.seq);
  for (const workout of workouts) {
    const sets = setsOf(records, workout.clientId).filter((s) => s.exerciseId === exerciseId && s.setType === 'WORKING');
    if (sets.length > 0) return sets;
  }
  return [];
}

/**
 * A planned move as rows: this week's sets (the server's count — fewer in a deload week, K-217), per side for a
 * one-sided move (left, then right). A row suggests the load just lifted in this session, else the server's next load,
 * else last time's (the phone's own sets of the move, else the server's best set of it, `lastBestSet`); the server's next
 * reps, else last time's, else the bottom of the range. A bodyweight move's load is always 0; an added load
 * (BODYWEIGHT_PLUS_EXTERNAL) starts at 0, the body alone, where nothing else says. Working sets beyond the plan show as
 * more rows. A move with no history at all (never done: no phone sets of it, no `lastBestSet`; a move swapped in counts by
 * its own history, ADR-075 Ek 7, Ek 8) has no weight and no reps of its own to start from: the weight is picked, the range's
 * bottom for reps, and what was just lifted in this session still carries to the next row. A calibration step alone does not
 * make a move new: the server sends it with every move that has no target, an isolation move at each session.
 * The move is required: without the catalog the sides and the load model are unknown, and a guess is a set the server refuses.
 * A skipped set (K-972) is a row of its own, the sets done fill the others in order; a skipped move skips every row
 * not done.
 */
export function planExercise(
  planned: Schemas['PlannedExercise'],
  move: Schemas['Exercise'],
  last: NewSet[],
  done: NewSet[],
  skipped: Skipped = NONE_SKIPPED,
): ExercisePlan {
  const sides: Schemas['Side'][] = move.unilateral ? ['LEFT', 'RIGHT'] : ['BOTH'];
  const working = done.filter((s) => s.exerciseId === planned.exerciseId && s.setType === 'WORKING');
  const ofSide = (list: NewSet[], side: Schemas['Side']) => list.filter((s) => (s.side ?? 'BOTH') === side);
  const skips = (side: Schemas['Side']) => new Set(skipped.sets.filter((s) => s.side === side).map((s) => s.set));
  const count = Math.max(planned.sets, ...sides.map((side) => ofSide(working, side).length + skips(side).size));
  // Each side's sets done, in order, onto its rows that are not skipped.
  const filled = new Map(
    sides.map((side) => {
      const mine = ofSide(working, side);
      const skip = skips(side);
      let next = 0;
      return [side, Array.from({ length: count }, (_, i) => (skip.has(i) ? 'skipped' : (mine[next++] ?? null)))] as const;
    }),
  );
  const rows: SetRow[] = [];
  for (let i = 0; i < count; i++) {
    for (const side of sides) {
      const own = filled.get(side) ?? [];
      const lastRows = ofSide(last, side);
      const lifted = own.slice(0, i).filter((r): r is NewSet => r !== null && r !== 'skipped').at(-1)?.loadKg;
      // The phone's own sets of it; with none (a phone with nothing kept, a move swapped in), the server's best set of it.
      const lastLoad =
        lastRows[i]?.loadKg ?? lastRows.reduce<number | null>((top, s) => (top === null || s.loadKg > top ? s.loadKg : top), null) ?? planned.lastBestSet?.loadKg ?? null;
      const cell = own[i] ?? null;
      const doneSet = cell === 'skipped' ? null : cell;
      rows.push({
        side,
        suggested: {
          loadKg: move.load === 'BODYWEIGHT' ? 0 : (lifted ?? planned.nextLoadKg ?? lastLoad ?? (move.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 0 : null)),
          reps: planned.nextReps ?? lastRows[i]?.reps ?? planned.reps.min,
        },
        last: lastRows[i] ?? null,
        done: doneSet,
        skipped: cell === 'skipped' || (skipped.move && doneSet === null),
      });
    }
  }
  const current = rows.findIndex((row) => row.done === null && row.skipped !== true);
  return { exerciseId: planned.exerciseId, rows, current: current < 0 ? null : current, ...(skipped.move ? { skippedMove: true as const } : {}) };
}

/**
 * A move added to the session outside the plan (K-416): the work sets done, then one open row — as many as the user
 * does, there is no planned count. The open row suggests the load just lifted on its side in this session, else last
 * time's at that row, else last time's heaviest on that side, else the set just done on the other side (the right after
 * the left); the reps likewise; never done before, nothing (the user types it). A bodyweight move's load is 0, a one-sided
 * move has a row a side, as for a planned move. `closed` (K-973, ADR-075 Ek 8): a move swapped away from in this session keeps
 * its sets but has no open row and nothing left to do, so it is never the next move nor what holds the finish back.
 */
export function extraPlan(move: Schemas['Exercise'], last: NewSet[], done: NewSet[], closed = false): ExercisePlan {
  const sides: Schemas['Side'][] = move.unilateral ? ['LEFT', 'RIGHT'] : ['BOTH'];
  const working = done.filter((s) => s.exerciseId === move.id && s.setType === 'WORKING');
  const ofSide = (list: NewSet[], side: Schemas['Side']) => list.filter((s) => (s.side ?? 'BOTH') === side);
  const counts = sides.map((side) => ofSide(working, side).length);
  const doneCount = Math.max(...counts);
  // A round with a side still to do is the open one; with every side done, a new round opens.
  const rounds = closed ? doneCount : counts.every((count) => count === doneCount) ? doneCount + 1 : doneCount;
  const rows: SetRow[] = [];
  for (let i = 0; i < rounds; i++) {
    for (const side of sides) {
      const mine = ofSide(working, side);
      const lastRows = ofSide(last, side);
      const heaviest = lastRows.reduce<NewSet | null>((top, s) => (top === null || s.loadKg > top.loadKg ? s : top), null);
      const from = mine[Math.min(i, mine.length) - 1] ?? lastRows[i] ?? heaviest ?? working.at(-1);
      rows.push({
        side,
        suggested: { loadKg: move.load === 'BODYWEIGHT' ? 0 : (from?.loadKg ?? null), reps: from?.reps ?? null },
        last: lastRows[i] ?? null,
        done: mine[i] ?? null,
        skipped: false,
      });
    }
  }
  const current = rows.findIndex((row) => row.done === null);
  return { exerciseId: move.id, rows, current: closed || current < 0 ? null : current, open: true };
}

/**
 * The day's moves in today's session (K-964, ADR-073 Ek 3): the server's session of the day this week, when the week has
 * it — its exerciseIds in order (the short version's first moves, today's swaps in place), each the day's planned move
 * or the swap's own planned move standing in for one (no target, its own history); without it, the day as planned. The
 * phone picks no move: it applies the server's list. The session is the day's on `onDate` only (the session's own day:
 * its start's when under way, else today): a short version or a swap is for that day's session alone (ADR-073 Ek 3), and
 * a week cached offline from last week is not this one. K-995's Program.today is to replace the phone's day here.
 */
export function sessionMoves(day: Schemas['ProgramDay'], week: Schemas['WeekSession'][] | undefined, onDate: string): Schemas['PlannedExercise'][] {
  const session = week?.find((s) => s.programDayId === day.id && s.date === onDate);
  if (session === undefined) return day.exercises;
  const swapped = new Map((session.swaps ?? []).map((swap) => [swap.exercise.exerciseId, swap.exercise]));
  return session.exerciseIds.flatMap((id) => {
    const planned = swapped.get(id) ?? day.exercises.find((e) => e.exerciseId === id);
    return planned === undefined ? [] : [planned];
  });
}

/**
 * The finish to record (K-217: the moves whose form was not clean hold their load and reps — G6 K-31), with the time
 * paused (K-998), whole seconds, when there was any.
 */
export function finishRecord(workoutClientId: string, clientId: string, at: Date, unclean: string[], note?: string, pausedSeconds = 0): Outbound {
  const words = noteOf(note);
  const body = {
    endedAt: at.toISOString(),
    uncleanExerciseIds: [...new Set(unclean)],
    ...(words === null ? {} : { note: words }),
    ...(pausedSeconds > 0 ? { pausedSeconds } : {}),
  };
  return { kind: 'finish', clientId, workoutClientId, body };
}
