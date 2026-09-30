/**
 * The sync queue (K-304, ADR-006, ADR-024): a record is saved on the phone first, then sent in the order it was made.
 * Sending twice is safe — the record carries its clientId, and the server answers a second send with the stored copy
 * (200) — so the queue never has to know whether a lost reply meant "stored" or "not stored": it just sends again.
 * The server's answer replaces the local copy (server wins). A refusal is kept and marked, never dropped, and does not
 * hold back the records behind it; a passing failure (offline, 401, 5xx…) stops the drain until the next trigger.
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
  | { kind: 'set'; workoutClientId: string; body: Schemas['NewSet'] };

/** The server's answer, reduced: 200/201 carry the stored record; an error carries the contract's code. */
export type SendResult = { status: number; id?: string; body?: unknown; errorCode?: string };

/** Sends one record; `parentServerId` is its parent's server id (a set's workout). Throws when the network fails. */
export type Send = (record: Outbound, parentServerId: string | null) => Promise<SendResult>;

type Store = Pick<RecordStore, 'insert' | 'nextPending' | 'find' | 'markSynced' | 'markRejected'>;

/** Worth trying again later: the session, the network or the server, not the record. */
function passing(status: number): boolean {
  return status === 401 || status === 408 || status === 429 || status >= 500;
}

function parentOf(record: Outbound): string | null {
  return record.kind === 'set' ? record.workoutClientId : null;
}

function toOutbound(row: LocalRecord): Outbound {
  // The row was written from an Outbound by `record` below; kind, parent and body go back together.
  return (row.kind === 'set'
    ? { kind: 'set', workoutClientId: row.parentClientId, body: row.body }
    : { kind: row.kind, body: row.body }) as Outbound;
}

export type SyncQueue = ReturnType<typeof createSyncQueue>;

export function createSyncQueue({ store, send }: { store: Store; send: Send }) {
  let running: Promise<void> | null = null;
  let again = false;

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
        result = await send(toOutbound(next), parentServerId);
      } catch {
        return; // no answer: offline, or the reply was lost — the same clientId goes again next time
      }
      if (result.status === 200 || result.status === 201) {
        await store.markSynced(next.clientId, result.id ?? null, result.body);
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
    if (running !== null) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        await sendAll();
      } while (again);
    })().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    /** Saves the record on the phone, then starts a drain without waiting for the network. */
    record: async (record: Outbound): Promise<void> => {
      const parent = parentOf(record);
      if (parent !== null && (await store.find(parent)) === null) {
        throw new Error(`${record.kind} recorded before the record it belongs to`);
      }
      await store.insert({ clientId: record.body.clientId, kind: record.kind, parentClientId: parent, body: record.body });
      void drain();
    },
    drain,
  };
}
