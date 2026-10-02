/**
 * The workout on the phone (K-405, B §6.5: one tap per set). Built from the phone's own records (K-304) — the workout,
 * its sets and its finish are records like any other, so a workout started offline is found again after a restart, and
 * last time's sets are there without the network. Nothing here decides a load: the server's next target (K-217) is the
 * faint suggestion as it came; only what the user lifted in this session is carried to the next row.
 */
import type { components } from '@/api/schema';
import type { Outbound } from '@/sync/queue';
import type { LocalRecord } from '@/sync/store';

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
};

/** `current`: the first row not done yet; null when every planned row is done. */
export type ExercisePlan = { exerciseId: string; rows: SetRow[]; current: number | null };

/** Records the server took or will take: a refused one is not part of what was done. */
const kept = (record: LocalRecord) => record.state !== 'REJECTED';

/** A workout's sets as kept on the phone, in the order they were done (a refused one is not part of it). */
export const setsOf = (records: LocalRecord[], workoutClientId: string) =>
  records
    .filter((r) => r.kind === 'set' && r.parentClientId === workoutClientId && kept(r))
    .sort((a, b) => a.seq - b.seq)
    .map((r) => r.body as NewSet);

/**
 * The newest workout, while it has no finish, with its sets in the order they were done. Only the newest: an older one
 * left open (a double tap on Start) does not come back once the newest is finished or refused (K-405 review). A finish the server
 * refused does not count, so the workout can be finished again.
 */
export function activeWorkout(records: LocalRecord[]): ActiveWorkout | null {
  const finished = new Set(records.filter((r) => r.kind === 'finish' && kept(r)).map((r) => r.parentClientId));
  const open = records.filter((r) => r.kind === 'workout').sort((a, b) => b.seq - a.seq)[0];
  if (open === undefined || !kept(open) || finished.has(open.clientId)) return null;
  const body = open.body as Schemas['NewWorkout'];
  return { clientId: open.clientId, startedAt: body.startedAt, programDayId: body.programDayId ?? null, sets: setsOf(records, open.clientId) };
}

/** A workout as the phone keeps it, by its clientId (its program day), or null. */
export function workoutOf(records: LocalRecord[], clientId: string): Schemas['NewWorkout'] | null {
  const found = records.find((r) => r.kind === 'workout' && r.clientId === clientId);
  return found === undefined ? null : (found.body as Schemas['NewWorkout']);
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
 * else last time's; the server's next reps, else last time's, else the bottom of the range. A bodyweight move's load is
 * always 0 (an added load belongs to BODYWEIGHT_PLUS_EXTERNAL). Working sets beyond the plan show as more rows. The move
 * is required: without the catalog the sides and the load model are unknown, and a guess is a set the server refuses.
 */
export function planExercise(planned: Schemas['PlannedExercise'], move: Schemas['Exercise'], last: NewSet[], done: NewSet[]): ExercisePlan {
  const sides: Schemas['Side'][] = move.unilateral ? ['LEFT', 'RIGHT'] : ['BOTH'];
  const working = done.filter((s) => s.exerciseId === planned.exerciseId && s.setType === 'WORKING');
  const ofSide = (list: NewSet[], side: Schemas['Side']) => list.filter((s) => (s.side ?? 'BOTH') === side);
  const doneCount = Math.max(...sides.map((side) => ofSide(working, side).length));
  const rows: SetRow[] = [];
  for (let i = 0; i < Math.max(planned.sets, doneCount); i++) {
    for (const side of sides) {
      const mine = ofSide(working, side);
      const lastRows = ofSide(last, side);
      const lifted = mine[Math.min(i, mine.length) - 1]?.loadKg;
      const lastLoad = lastRows[i]?.loadKg ?? lastRows.reduce<number | null>((top, s) => (top === null || s.loadKg > top ? s.loadKg : top), null);
      rows.push({
        side,
        suggested: {
          loadKg: move.load === 'BODYWEIGHT' ? 0 : (lifted ?? planned.nextLoadKg ?? lastLoad),
          reps: planned.nextReps ?? lastRows[i]?.reps ?? planned.reps.min,
        },
        last: lastRows[i] ?? null,
        done: mine[i] ?? null,
      });
    }
  }
  const current = rows.findIndex((row) => row.done === null);
  return { exerciseId: planned.exerciseId, rows, current: current < 0 ? null : current };
}

/**
 * A move added to the session outside the plan (K-416): the work sets done, then one open row — as many as the user
 * does, there is no planned count. The open row suggests the load just lifted in this session, else last time's at that
 * row, else last time's heaviest; the reps likewise; never done before, nothing (the user types it). A bodyweight move's
 * load is 0, a one-sided move has a row a side, as for a planned move.
 */
export function extraPlan(move: Schemas['Exercise'], last: NewSet[], done: NewSet[]): ExercisePlan {
  const sides: Schemas['Side'][] = move.unilateral ? ['LEFT', 'RIGHT'] : ['BOTH'];
  const working = done.filter((s) => s.exerciseId === move.id && s.setType === 'WORKING');
  const ofSide = (list: NewSet[], side: Schemas['Side']) => list.filter((s) => (s.side ?? 'BOTH') === side);
  const counts = sides.map((side) => ofSide(working, side).length);
  const doneCount = Math.max(...counts);
  // A round with a side still to do is the open one; with every side done, a new round opens.
  const rounds = counts.every((count) => count === doneCount) ? doneCount + 1 : doneCount;
  const rows: SetRow[] = [];
  for (let i = 0; i < rounds; i++) {
    for (const side of sides) {
      const mine = ofSide(working, side);
      const lastRows = ofSide(last, side);
      const heaviest = lastRows.reduce<NewSet | null>((top, s) => (top === null || s.loadKg > top.loadKg ? s : top), null);
      const from = mine[Math.min(i, mine.length) - 1] ?? lastRows[i] ?? heaviest;
      rows.push({
        side,
        suggested: { loadKg: move.load === 'BODYWEIGHT' ? 0 : (from?.loadKg ?? null), reps: from?.reps ?? null },
        last: lastRows[i] ?? null,
        done: mine[i] ?? null,
      });
    }
  }
  const current = rows.findIndex((row) => row.done === null);
  return { exerciseId: move.id, rows, current: current < 0 ? null : current };
}

/** The finish to record (K-217: the moves whose form was not clean hold their load and reps — G6 K-31). */
export function finishRecord(workoutClientId: string, clientId: string, at: Date, unclean: string[], note?: string): Outbound {
  const words = noteOf(note);
  const body = { endedAt: at.toISOString(), uncleanExerciseIds: [...new Set(unclean)], ...(words === null ? {} : { note: words }) };
  return { kind: 'finish', clientId, workoutClientId, body };
}
