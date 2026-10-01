/**
 * A move's history and its records (K-415, ADR-033). The sessions are the server's list — the phone keeps a copy — joined
 * with what the phone has not sent yet, each workout once and each set once, by clientId; a record the server refused is
 * not part of them. Records are derived each time from work sets (the contract's SetType: effort and the estimated max
 * count only those), never stored: a set deleted takes its record with it.
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';

import { e1rm } from './summary';
import { setsOf } from './workout';

type Schemas = components['schemas'];
type NewSet = Schemas['NewSet'];

export type Session = { clientId: string; startedAt: string; sets: NewSet[] };
export type PersonalRecord =
  | { kind: 'heaviest'; loadKg: number; reps: number; on: string }
  | { kind: 'estimatedMax'; kg: number; on: string }
  | { kind: 'repsAt'; loadKg: number; reps: number; on: string }
  | { kind: 'mostReps'; reps: number; on: string };

/** Every workout once, newest first: the server's, with the phone's own sets joined in; the phone's not yet sent. */
export function sessionsOf(server: Schemas['Workout'][] | null, records: LocalRecord[]): Session[] {
  const byId = new Map<string, Session>();
  for (const workout of server ?? []) {
    byId.set(workout.clientId, { clientId: workout.clientId, startedAt: workout.startedAt, sets: workout.sets.map(({ id: _, ...set }) => set) });
  }
  for (const record of records) {
    if (record.kind !== 'workout' || record.state === 'REJECTED') continue;
    const found = byId.get(record.clientId);
    const session = found ?? { clientId: record.clientId, startedAt: (record.body as Schemas['NewWorkout']).startedAt, sets: [] };
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
 * tie keeps the first time it was done. No volume record (B §6.4).
 */
export function recordsOf(move: Schemas['Exercise'], sessions: Session[]): PersonalRecord[] {
  // Oldest first, so the first set to reach a value holds its record.
  const worked: Done[] = [...sessions]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .flatMap((session) =>
      session.sets.filter((s) => s.exerciseId === move.id && s.setType === 'WORKING').map((set) => ({ set, on: session.startedAt })),
    );
  if (move.load === 'BODYWEIGHT') return mostReps(worked);
  if (move.load === 'BODYWEIGHT_PLUS_EXTERNAL') {
    return [...heaviest(worked.filter((d) => d.set.loadKg > 0)), ...mostReps(worked.filter((d) => d.set.loadKg === 0))];
  }
  if (move.kind === 'ISOLATION') return repsAt(worked);
  return [...heaviest(worked), ...estimatedMax(worked), ...repsAt(worked)];
}

/** A work set and the day of its session. */
type Done = { set: NewSet; on: string };

/** The best by `better`; a tie keeps the first (the oldest, as `done` is ordered). */
function first(done: Done[], better: (a: Done, b: Done) => boolean): Done | null {
  let found: Done | null = null;
  for (const d of done) if (found === null || better(d, found)) found = d;
  return found;
}

function heaviest(done: Done[]): PersonalRecord[] {
  const top = first(done, (a, b) => a.set.loadKg > b.set.loadKg || (a.set.loadKg === b.set.loadKg && a.set.reps > b.set.reps));
  return top === null ? [] : [{ kind: 'heaviest', loadKg: top.set.loadKg, reps: top.set.reps, on: top.on }];
}

function mostReps(done: Done[]): PersonalRecord[] {
  const top = first(done, (a, b) => a.set.reps > b.set.reps);
  return top === null ? [] : [{ kind: 'mostReps', reps: top.set.reps, on: top.on }];
}

/** The most reps at each weight, heaviest weight first. */
function repsAt(done: Done[]): PersonalRecord[] {
  const loads = [...new Set(done.map((d) => d.set.loadKg))].sort((a, b) => b - a);
  return loads.flatMap((loadKg) => {
    const top = first(
      done.filter((d) => d.set.loadKg === loadKg),
      (a, b) => a.set.reps > b.set.reps,
    );
    return top === null ? [] : [{ kind: 'repsAt' as const, loadKg, reps: top.set.reps, on: top.on }];
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
