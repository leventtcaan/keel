/**
 * The app's services, put together once (K-305): the session (keychain), the API client that signs and refreshes
 * through it (K-311), the record store and the queue that sends with that client (K-304). Everything the device gives —
 * database, keychain, fetch — is passed in, so this runs in tests on node:sqlite and a fake server.
 */
import { type ApiClient, createApiClient } from '@/api/client';
import { type ProfileStatus, createProfileStatus } from '@/onboarding/profileStatus';
import { type SessionManager, type SessionStorage, createSessionManager, refreshWithServer } from '@/session/session';
import { type SyncProblem, type SyncQueue, createSyncQueue } from '@/sync/queue';
import { sendWithApi } from '@/sync/send';
import { type SqlDatabase, openRecordStore } from '@/sync/store';
import { type KeyValue, type UnitsPreference, createUnitsPreference } from '@/units/preference';

type Deps = {
  baseUrl: string;
  storage: SessionStorage;
  db: SqlDatabase;
  fetch?: (request: Request) => Promise<Response>;
  report: (problem: SyncProblem) => void;
  /** Small settings kept on the phone (expo-sqlite/kv-store). */
  kv: KeyValue;
  /** The device locale (BCP 47), for defaults before the user chooses. */
  locale: string;
};

export type AppServices = {
  session: SessionManager;
  api: ApiClient;
  queue: SyncQueue;
  units: UnitsPreference;
  /** Whether this account has finished onboarding (K-306). */
  profile: ProfileStatus;
  /** Records the server does not have yet; a sign-out drops them, so the screen warns first (K-309). */
  pendingCount(): Promise<number>;
  signOut(): Promise<void>;
};

export async function createAppServices({ baseUrl, storage, db, fetch, report, kv, locale }: Deps): Promise<AppServices> {
  const session = createSessionManager({ storage, refresh: refreshWithServer({ baseUrl, fetch }) });
  const api = createApiClient({ baseUrl, accessToken: session.accessToken, refresh: session.refresh, fetch });
  const store = await openRecordStore(db);
  const queue = createSyncQueue({ store, send: sendWithApi(api), report });
  const units = await createUnitsPreference({ kv, api, locale });
  const profile = await createProfileStatus({ kv, api, units });
  // No session, nothing to know: a "done" kept here belongs to no one (a backup restored onto a new phone).
  if (!(await session.isSignedIn())) await profile.forget();

  // Whatever ends the session — sign-out, or the server refusing the refresh token (expired, reused, the account
  // deleted: the phone cannot tell which) — the records go with it: they belong to the account that made them, and
  // the next person to sign in on this phone must not inherit them (contract: DELETE /v1/account).
  const reportError = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });
  session.subscribe((signedIn) => {
    if (signedIn) {
      // One read of the profile answers both: has this account finished onboarding (K-306), and its own unit choice
      // in place of the phone's guess (K-310). Offline, the kept answers stay and the screen offers to try again.
      profile.refresh().catch(() => undefined);
      return;
    }
    store.clear().catch(reportError);
    units.forget().catch(reportError); // the preference belongs to the account too
    profile.forget().catch(reportError); // and so does "onboarding done"
  });

  return {
    session,
    api,
    queue,
    units,
    profile,
    pendingCount: store.pendingCount,
    signOut: async () => {
      const refreshToken = await session.refreshToken();
      // The phone forgets first, so the user is signed out at once even on a slow network. The records are cleared
      // even if the keychain fails to (the error still surfaces).
      try {
        await session.signOut();
      } finally {
        await store.clear();
      }
      if (refreshToken === null) return;
      try {
        await api.POST('/v1/auth/sign-out', { body: { refreshToken } });
      } catch {
        // Offline: the phone no longer holds the token, so it cannot be used from here; it expires on the server
        // (60 days, ADR-025). Nothing else to do.
      }
    },
  };
}
