/**
 * Taking back a record the user made and the phone may have sent (K-980, ADR-074 Ek 2, ADR-024): a weigh-in, a cardio
 * session. The queue is held while it is decided, so no send starts meanwhile. A record never sent goes at once. One the
 * server may have is deleted there first, by the server's id, and forgotten here only once the server no longer has it —
 * together with a copy still waiting to be sent, which would write the row again under a new id (the delete is for good,
 * the same clientId stores again). A delete that is refused or gets no answer changes nothing: the user can try again.
 */
import type { SyncQueue } from './queue';
import type { RecordStore } from './store';

/**
 * taken: gone from the server and from the phone (404 counts: already gone) · conflict: the server refuses (409) ·
 * offline: nothing was changed, because the server could not be asked (or its answer was not a word the contract knows).
 */
export type TakeBackResult = 'taken' | 'conflict' | 'offline';

export type TakeBack = ReturnType<typeof createTakeBack>;

type Deps = { store: Pick<RecordStore, 'find' | 'forgetClient'>; queue: Pick<SyncQueue, 'exclusive'> };

/**
 * `remove` deletes the record on the server by its id and answers the HTTP status (it throws when nothing came back).
 * `knownServerId`: the server's id when the phone knows it from elsewhere (the day's read), for a record still waiting here.
 */
export function createTakeBack({ store, queue }: Deps) {
  return (clientId: string, remove: (serverId: string) => Promise<number>, knownServerId?: string): Promise<TakeBackResult> =>
    queue.exclusive(async (sendPending) => {
      let row = await store.find(clientId);
      // Never tried: the server cannot have it, and nothing is known to be there to delete.
      if (row !== null && row.state === 'PENDING' && row.attempted !== true && knownServerId === undefined) {
        await store.forgetClient(clientId);
        return 'taken';
      }
      // Tried, no answer yet: send now, so the server's id is known (offline, this stops and the row stays waiting).
      if (row !== null && row.state === 'PENDING' && knownServerId === undefined) {
        await sendPending();
        row = await store.find(clientId);
      }
      const serverId = knownServerId ?? (row !== null && row.state === 'SYNCED' ? row.serverId : null);
      if (serverId === null) {
        // Refused by the server, or not here at all: there is nothing of it on the server. Still waiting: not known.
        if (row !== null && row.state === 'PENDING') return 'offline';
        await store.forgetClient(clientId);
        return 'taken';
      }
      let status: number;
      try {
        status = await remove(serverId);
      } catch {
        return 'offline';
      }
      if (status === 204 || status === 404) {
        await store.forgetClient(clientId);
        return 'taken';
      }
      return status === 409 ? 'conflict' : 'offline';
    });
}
