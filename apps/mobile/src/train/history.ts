/**
 * A move's history and its records (K-415, ADR-033). The sessions are the server's list — the phone keeps a copy — joined
 * with what the phone has not sent yet, each workout once and each set once, by clientId; a record the server refused is
 * not part of them. Records are derived each time from work sets (the contract's SetType: effort and the estimated max
 * count only those), never stored: a set deleted takes its record with it.
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { localDay } from '@/today/today';

import { e1rm } from './summary';
import { setsOf } from './workout';

type Schemas = components['schemas'];
type NewSet = Schemas['NewSet'];

/** `note`: the session's, given at its finish (K-422). `serverId`: the server's workout, once it has it (editable, K-416). */
export type Session = { clientId: string; serverId?: string; startedAt: string; note?: string; sets: NewSet[] };
export type PersonalRecord =
  | { kind: 'heaviest'; loadKg: number; reps: number; on: string }
  | { kind: 'estimatedMax'; kg: number; on: string }
  | { kind: 'repsAt'; loadKg: number; reps: number; on: string }
  | { kind: 'mostReps'; reps: number; on: string };

/**
 * Every workout once, newest first: the server's, with the phone's own sets joined in; the phone's not yet sent. The
 * phone's own from before `fromDay` (the window the server was asked for) are left out: a new phone would not have them.
 */
export function sessionsOf(server: Schemas['Workout'][] | null, records: LocalRecord[], fromDay = ''): Session[] {
  const byId = new Map<string, Session>();
  for (const workout of server ?? []) {
    byId.set(workout.clientId, {
      clientId: workout.clientId,
      serverId: workout.id,
      startedAt: workout.startedAt,
      ...(workout.note === undefined ? {} : { note: workout.note }),
      sets: workout.sets.map(({ id: _, ...set }) => set),
    });
  }
  for (const record of records) {
    if (record.kind !== 'workout' || record.state === 'REJECTED') continue;
    if (localDay(new Date((record.body as Schemas['NewWorkout']).startedAt)) < fromDay) continue;
    const found = byId.get(record.clientId);
    const finish = records.find((r) => r.kind === 'finish' && r.parentClientId === record.clientId && r.state !== 'REJECTED');
    const phoneNote = (finish?.body as Schemas['WorkoutFinish'] | undefined)?.note;
    // A finish not sent yet is newer than the server's copy (a later finish with a note replaces the earlier one, K-422).
    const note = finish?.state === 'SYNCED' ? (found?.note ?? phoneNote) : (phoneNote ?? found?.note);
    const session = {
      ...(found ?? { clientId: record.clientId, startedAt: (record.body as Schemas['NewWorkout']).startedAt, sets: [] }),
      ...(note === undefined ? {} : { note }),
    };
    const known = new Set(session.sets.map((s) => s.clientId));
    byId.set(record.clientId, { ...session, sets: [...session.sets, ...setsOf(records, record.clientId).filter((s) => !known.has(s.clientId))] });
  }
  return [...byId.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** The sessions that have the move, newest first, with its sets only — warm-ups too: they are what was done. */
export function historyOf(sessions: Session[], exerciseId: string): Session[] {
  return sessions
    .map((session) => ({ ...session, sets: session.sets.filter((s) => s.exerciseId === exerciseId) }))
    .filter((session) => session.sets.length > 0);
}

/**
 * The move's records from its work sets (ADR-033 §3): a compound move with an external load its heaviest, its highest
 * estimated max and its most reps at each weight; an isolation move only the most reps at each weight (G6 K-33: no weight
 * tracking); a bodyweight move its most reps; a weighted one its heaviest added and its most reps with the body alone. A
 * tie keeps the first time it was done. Weights are compared as `shown` (the user's unit, as the screen writes them). No
 * volume record (B §6.4).
 */
export function recordsOf(move: Schemas['Exercise'], sessions: Session[], shown: (kg: number) => number = (kg) => kg): PersonalRecord[] {
  // Oldest first, so the first set to reach a value holds its record.
  const worked: Done[] = [...sessions]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .flatMap((session) =>
      session.sets.filter((s) => s.exerciseId === move.id && s.setType === 'WORKING').map((set) => ({ set, on: session.startedAt })),
    );
  if (move.load === 'BODYWEIGHT') return mostReps(worked);
  if (move.load === 'BODYWEIGHT_PLUS_EXTERNAL') {
    return [
      ...heaviest(
        worked.filter((d) => d.set.loadKg > 0),
        shown,
      ),
      ...mostReps(worked.filter((d) => d.set.loadKg === 0)),
    ];
  }
  if (move.kind === 'ISOLATION') return repsAt(worked, shown);
  return [...heaviest(worked, shown), ...estimatedMax(worked), ...repsAt(worked, shown)];
}

/** A work set and the day of its session. */
type Done = { set: NewSet; on: string };

/** The best by `better`; a tie keeps the first (the oldest, as `done` is ordered). */
function first(done: Done[], better: (a: Done, b: Done) => boolean): Done | null {
  let found: Done | null = null;
  for (const d of done) if (found === null || better(d, found)) found = d;
  return found;
}

/** Weights compare as the user sees them (`shown`): 62.5 and 62.51 kg are one weight in lb, 137.8. */
function heaviest(done: Done[], shown: (kg: number) => number): PersonalRecord[] {
  const top = first(done, (a, b) => {
    const [x, y] = [shown(a.set.loadKg), shown(b.set.loadKg)];
    return x > y || (x === y && a.set.reps > b.set.reps);
  });
  return top === null ? [] : [{ kind: 'heaviest', loadKg: top.set.loadKg, reps: top.set.reps, on: top.on }];
}

function mostReps(done: Done[]): PersonalRecord[] {
  const top = first(done, (a, b) => a.set.reps > b.set.reps);
  return top === null ? [] : [{ kind: 'mostReps', reps: top.set.reps, on: top.on }];
}

/** The most reps at each weight, heaviest weight first. */
function repsAt(done: Done[], shown: (kg: number) => number): PersonalRecord[] {
  const weights = [...new Set(done.map((d) => shown(d.set.loadKg)))].sort((a, b) => b - a);
  return weights.flatMap((weight) => {
    const top = first(
      done.filter((d) => shown(d.set.loadKg) === weight),
      (a, b) => a.set.reps > b.set.reps,
    );
    return top === null ? [] : [{ kind: 'repsAt' as const, loadKg: top.set.loadKg, reps: top.set.reps, on: top.on }];
  });
}

/** The engine's Epley (K-218), from a set with its RIR; none when no set gives one. */
function estimatedMax(done: Done[]): PersonalRecord[] {
  const scored = done.flatMap((d) => {
    const kg = e1rm(d.set.loadKg, d.set.reps, d.set.rir);
    return kg === null ? [] : [{ kg, on: d.on }];
  });
  let top = scored[0];
  for (const s of scored) if (s.kg > top.kg) top = s;
  return top === undefined ? [] : [{ kind: 'estimatedMax', kg: top.kg, on: top.on }];
}
