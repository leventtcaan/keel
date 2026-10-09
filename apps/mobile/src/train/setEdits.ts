/**
 * A set done in the session, corrected or deleted (K-972), on the phone's records and the server's, never two versions
 * of one set (review). A record whose send was never tried changes in its place. Once a send was tried, the server
 * may have it (its answer lost, or the send still on its way), so its body never changes in place:
 *   1. the queue is held (no send starts), and what waits is sent first, so the set has its server id;
 *   2. the corrected set is saved as a new record (not sent yet: the queue is held);
 *   3. the old set is deleted on the server (gone already counts as done);
 *   4. only then is the old record forgotten, and the new one takes its place in the order (its number stays).
 * If step 3 fails, the new record goes and the old one stays as it was: nothing is lost, nothing is doubled. Offline
 * (the set still waiting after step 1), it fails with NoAnswer and nothing changes.
 */
import type { components } from '@/api/schema';
import { NoAnswer, type SyncQueue } from '@/sync/queue';
import type { LocalRecord, RecordStore } from '@/sync/store';

type NewSet = components['schemas']['NewSet'];

type Options = {
  store: Pick<RecordStore, 'find' | 'insert' | 'replacePending' | 'forgetPending' | 'forgetClient' | 'moveTo'>;
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
      const inPlace = next === null ? await store.forgetPending(clientId) : await store.replacePending(clientId, { ...next, clientId });
      if (inPlace) return old;
      await sendPending();
      const sent = await store.find(clientId);
      const workout = await store.find(old.parentClientId);
      if (sent === null || sent.state !== 'SYNCED' || sent.serverId === null || workout?.serverId == null) throw new NoAnswer('the set is not on the server yet');
      const replacement = next === null ? null : newClientId();
      if (replacement !== null && next !== null) {
        await store.insert({ clientId: replacement, kind: 'set', parentClientId: old.parentClientId, body: { ...next, clientId: replacement } });
      }
      try {
        await deleteOnServer(workout.serverId, sent.serverId);
      } catch (error) {
        if (replacement !== null) await store.forgetClient(replacement);
        throw error;
      }
      await store.forgetClient(clientId);
      if (replacement !== null) await store.moveTo(replacement, old.seq);
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
