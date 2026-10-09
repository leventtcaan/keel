/**
 * A set done in the session, corrected or deleted (K-972), on the phone's records and the server's, never two versions
 * of one set (review). A record whose send was never tried changes in its place. Once a send was tried, the server
 * may have it (its answer lost, or the send still on its way), so its body never changes in place:
 *   1. the queue is held (no send starts, other holders wait their turn), and what waits is sent first, so the set has
 *      its server id;
 *   2. the old set is deleted on the server (gone already counts as done);
 *   3. then, in one step, the old record becomes the corrected one (new clientId, never sent, the same place) or goes.
 * If step 2 fails, nothing changed. Killed between 2 and 3, the correction is lost but there are never two copies.
 * Offline (the set still waiting after step 1), it fails with NoAnswer and nothing changes. A set the server refused
 * fails as Refused.
 */
import type { components } from '@/api/schema';
import { NoAnswer, type SyncQueue } from '@/sync/queue';
import type { LocalRecord, RecordStore } from '@/sync/store';

type NewSet = components['schemas']['NewSet'];

type Options = {
  store: Pick<RecordStore, 'find' | 'insert' | 'replacePending' | 'forgetPending' | 'forgetClient' | 'moveTo' | 'replaceWith'>;
  queue: Pick<SyncQueue, 'exclusive'>;
  /** DELETE /v1/workouts/{id}/sets/{setId}: resolves once the server has it no more; throws otherwise. */
  deleteOnServer: (workoutServerId: string, setServerId: string) => Promise<void>;
  newClientId: () => string;
};

export type SetEdits = ReturnType<typeof createSetEdits>;

export function createSetEdits({ store, queue, deleteOnServer, newClientId }: Options) {
  /** Steps 1-4 above, the queue held; `next` null deletes. The set as it was, for Undo. */
  const change = (clientId: string, next: NewSet | null): Promise<LocalRecord | null> =>
    queue.exclusive(async (sendPending) => {
      const old = await store.find(clientId);
      if (old === null || old.parentClientId === null) return null;
      const refused = () => Object.assign(new Error('the server refused this set'), { name: 'Refused' });
      if (old.state === 'REJECTED') throw refused();
      const inPlace = next === null ? await store.forgetPending(clientId) : await store.replacePending(clientId, { ...next, clientId });
      if (inPlace) return old;
      await sendPending();
      const sent = await store.find(clientId);
      const workout = await store.find(old.parentClientId);
      if (sent?.state === 'REJECTED') throw refused();
      if (sent === null || sent.state !== 'SYNCED' || sent.serverId === null || workout?.serverId == null) throw new NoAnswer('the set is not on the server yet');
      await deleteOnServer(workout.serverId, sent.serverId);
      if (next === null) await store.forgetClient(clientId);
      else {
        const replacement = newClientId();
        await store.replaceWith(clientId, { clientId: replacement, body: { ...next, clientId: replacement } });
      }
      return old;
    });

  /** A set deleted, back in its place (Undo): a new record of it, its number kept. */
  const restore = (gone: LocalRecord): Promise<void> =>
    queue.exclusive(async () => {
      const clientId = newClientId();
      await store.insert({ clientId, kind: 'set', parentClientId: gone.parentClientId, body: { ...(gone.body as NewSet), clientId } });
      // Its old place is free: the old record is gone.
      if ((await store.find(gone.clientId)) === null) await store.moveTo(clientId, gone.seq);
    });

  return { change, restore };
}
