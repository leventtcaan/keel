/**
 * The sync queue (K-304, ADR-006, ADR-024): a record is saved on the phone first, then sent in the order it was made.
 * Sending twice is safe — the record carries its clientId, and the server answers a second send with the stored copy
 * (200) — so the queue never has to know whether a lost reply meant "stored" or "not stored": it just sends again.
 * The server's answer replaces the local copy (server wins). A refusal is kept and marked, never dropped, and does not
 * hold back the records behind it; a passing failure (no answer, 401, 5xx…) stops the drain until the next trigger.
 * Anything else — a bug, a broken store — is not taken for "offline": it surfaces, by name only (V3: records carry
 * health data, and error messages can quote it).
 */
import type { components } from '@/api/schema';

import type { LocalRecord, RecordStore } from './store';

type Schemas = components['schemas'];

/** What the phone records offline: every contract create that carries a clientId, except check-in answers (online). */
export type Outbound =
  | { kind: 'weighIn'; body: Schemas['NewWeighIn'] }
  | { kind: 'waist'; body: Schemas['NewWaistMeasurement'] }
  | { kind: 'bodyLook'; body: Schemas['NewBodyLook'] }
  | { kind: 'photoCheck'; body: Schemas['NewPhotoCheck'] }
  | { kind: 'meal'; body: Schemas['NewMeal'] }
  | { kind: 'workout'; body: Schemas['NewWorkout'] }
  // The cardio done at the end of a session (K-973, ADR-074 #6): minutes only, no active energy; training, not health data.
  | { kind: 'cardio'; body: Schemas['NewCardioSession'] }
  | { kind: 'set'; workoutClientId: string; body: Schemas['NewSet'] }
  | { kind: 'finish'; clientId: string; workoutClientId: string; body: Schemas['WorkoutFinish'] };

/**
 * The id the phone keeps a record under. A finish (K-405) has its own: its body is the contract's Finish, which has no
 * clientId — the server finds the workout by its id, and finishing again gives the same targets (K-217).
 */
export function recordClientId(record: Outbound): string {
  return record.kind === 'finish' ? record.clientId : record.body.clientId;
}

/**
 * The kinds that are health data, kept on the server only with the HEALTH_DATA consent (ADR-007): withdrawing it
 * deletes them there and here (K-231). A workout and its sets are training, not health data.
 */
export const HEALTH_KINDS = ['weighIn', 'waist', 'bodyLook', 'photoCheck', 'meal'] as const satisfies readonly Outbound['kind'][];

/** The server's answer, reduced: 200/201 carry the stored record; an error carries the contract's code. */
export type SendResult = { status: number; id?: string; body?: unknown; errorCode?: string };

/** The request got no answer the contract knows (offline, dropped, not JSON). The only error that means "try later". */
export class NoAnswer extends Error {
  override name = 'NoAnswer';
}

/** Sends one record; `parentServerId` is its parent's server id (a set's workout). Throws NoAnswer when nothing came back. */
export type Send = (record: Outbound, parentServerId: string | null) => Promise<SendResult>;

/** What went wrong, by name only: never the message, never the record (V3). */
export type SyncProblem = { name: string };

type Store = Pick<RecordStore, 'insert' | 'nextPending' | 'find' | 'markSynced' | 'markRejected' | 'rejected' | 'markAttempted'>;

/** Worth trying again later: the session, the network or the server, not the record. */
function passing(status: number): boolean {
  return status === 401 || status === 408 || status === 429 || status >= 500;
}

/** A set and a finish hang under their workout: sent after it, to its server id. */
function parentOf(record: Outbound): string | null {
  return record.kind === 'set' || record.kind === 'finish' ? record.workoutClientId : null;
}

function toOutbound(row: LocalRecord): Outbound {
  // The row was written from an Outbound by `record` below; kind, parent and body go back together.
  if (row.kind === 'set') return { kind: 'set', workoutClientId: row.parentClientId, body: row.body } as Outbound;
  if (row.kind === 'finish') return { kind: 'finish', clientId: row.clientId, workoutClientId: row.parentClientId, body: row.body } as Outbound;
  return { kind: row.kind, body: row.body } as Outbound;
}

export type SyncQueue = ReturnType<typeof createSyncQueue>;

type Options = { store: Store; send: Send; report: (problem: SyncProblem) => void };

export function createSyncQueue({ store, send, report }: Options) {
  let running: Promise<void> | null = null;
  let again = false;
  let holding = 0;
  let holders: Promise<unknown> = Promise.resolve();

  /** Sends until the queue is empty or a passing failure stops it. */
  async function sendAll(): Promise<void> {
    for (;;) {
      const next = await store.nextPending();
      if (next === null) return;

      let parentServerId: string | null = null;
      if (next.parentClientId !== null) {
        const parent = await store.find(next.parentClientId);
        // Older, so already sent or refused by now. Refused (or gone): the server cannot take this one either.
        if (parent === null || parent.state !== 'SYNCED') {
          await store.markRejected(next.clientId, 'PARENT_REJECTED');
          continue;
        }
        parentServerId = parent.serverId;
      }

      let result: SendResult;
      try {
        // Tried from here on: the server may have it whatever comes back, so its body no longer changes in place.
        await store.markAttempted(next.clientId);
        result = await send(toOutbound(next), parentServerId);
      } catch (error) {
        if (error instanceof NoAnswer) return; // offline, or the reply was lost: the same clientId goes again next time
        throw error;
      }
      if (result.status === 200 || result.status === 201) {
        if (result.id === undefined) {
          // Not the contract's answer (a proxy?). Not stored as synced — its children would have no server id. Sending
          // again is safe (ADR-024), so the record waits; the report makes it visible.
          report({ name: 'NO_STORED_RECORD' });
          return;
        }
        await store.markSynced(next.clientId, result.id, result.body);
      } else if (passing(result.status)) {
        return;
      } else {
        await store.markRejected(next.clientId, result.errorCode ?? `HTTP_${result.status}`);
      }
    }
  }

  /**
   * One drain at a time: a call while one runs joins it, and makes it go round once more before it ends — a record saved
   * just after the running drain found the queue empty is still sent, and a "back online" that lands while an offline
   * drain is stopping still gets its attempt.
   */
  function drain(): Promise<void> {
    // Held (exclusive): no send starts; the drain runs once the holder is done.
    if (holding > 0) {
      again = true;
      return Promise.resolve();
    }
    if (running !== null) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          again = false;
          await sendAll();
        } while (again);
      } finally {
        // In the same step as the last `again` check: no moment remains where a caller could join a drain that has
        // already decided to end. (A `.finally()` on the promise would run one microtask later.)
        running = null;
      }
    })();
    return running;
  }

  /** For callers that do not wait: a failure is reported, never an unhandled rejection. */
  function drainInBackground(): void {
    drain().catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
  }

  /**
   * Runs `work` with the queue held (K-972): it waits for a drain under way to end, and no send starts until `work` is
   * done — so a record's state and body cannot change under it. `sendPending` sends what waits now (offline, it stops
   * as a drain does). A drain asked for meanwhile runs after.
   */
  function exclusive<T>(work: (sendPending: () => Promise<void>) => Promise<T>): Promise<T> {
    // Holders take turns, in the order they asked (one failing does not stop the next).
    const turn = holders.then(async () => {
      while (running !== null) await running.catch(() => undefined);
      // Set in the same step as the last check: no drain can start in between.
      holding += 1;
      try {
        return await work(sendAll);
      } finally {
        holding -= 1;
        if (holding === 0 && again) drainInBackground();
      }
    });
    holders = turn.catch(() => undefined);
    return turn;
  }

  return {
    exclusive,
    /**
     * Saves the record on the phone, then starts a drain without waiting for the network. False: this clientId was
     * already saved, and the first copy stays.
     */
    record: async (record: Outbound): Promise<boolean> => {
      const parent = parentOf(record);
      if (parent !== null && (await store.find(parent)) === null) {
        throw new Error(`${record.kind} recorded before the record it belongs to`);
      }
      const stored = await store.insert({
        clientId: recordClientId(record),
        kind: record.kind,
        parentClientId: parent,
        body: record.body,
      });
      drainInBackground();
      return stored;
    },
    drain,
    drainInBackground,
    /** The records the server refused, for a screen to show — without their bodies. */
    rejected: () => store.rejected(),
  };
}
