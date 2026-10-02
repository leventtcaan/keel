/**
 * The app's services, put together once (K-305): the session (keychain), the API client that signs and refreshes
 * through it (K-311), the record store and the queue that sends with that client (K-304). Everything the device gives —
 * database, keychain, fetch — is passed in, so this runs in tests on node:sqlite and a fake server.
 */
import { type ApiClient, createApiClient } from '@/api/client';
import { type ConsentState, createConsentState } from '@/consent/consentState';
import { withdrawConsent } from '@/consent/consents';
import { forgetSentActivityDays } from '@/health/activitySync';
import { type HealthWriteAccess, healthWriteUnavailable } from '@/health/health';
import { type HealthWriting, createHealthWriting } from '@/health/healthWrite';
import { notificationsUnavailable } from '@/notifications/notificationAccess';
import { type NotificationAccess, type Reminders, createReminders } from '@/notifications/reminders';
import { type ProfileStatus, createProfileStatus } from '@/onboarding/profileStatus';
import { type SessionManager, type SessionStorage, createSessionManager, refreshWithServer } from '@/session/session';
import { type AlertAccess, type RestAlert, alertsUnavailable, createRestAlert } from '@/train/restAlert';
import { type TrainingCache, createTrainingCache } from '@/train/trainData';
import { HEALTH_KINDS, type SyncProblem, type SyncQueue, createSyncQueue } from '@/sync/queue';
import { sendWithApi } from '@/sync/send';
import { type LocalRecord, type SqlDatabase, openRecordStore } from '@/sync/store';
import { type KeyValue, type UnitsPreference, createUnitsPreference } from '@/units/preference';

const WORKOUT_KINDS = ['workout', 'set', 'finish'];

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
  /** The phone's notifications (K-410); none where there are none (tests). */
  notifications?: NotificationAccess;
  /** One alert at a moment (the rest timer's, K-411); none where there are none (tests). */
  alerts?: AlertAccess;
  /** Writing to Apple Health (K-412); none where there is none (Expo Go, tests). */
  healthWrite?: HealthWriteAccess;
  now?: () => Date;
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
  deleteAccount(): Promise<void>;
  /**
   * Withdraws the health data consent, confirming that the server deletes what it covered (K-231), then forgets the
   * health entries on the phone too (ADR-030 #25). Throws by name when the server did not withdraw it; then nothing goes.
   */
  withdrawHealthData(): Promise<void>;
  /** Whether a consent is given, as the phone knows it — kept for offline health entries (K-402, ADR-030 #25). */
  consents: ConsentState;
  /** The program and the catalog, kept on the phone for offline training (K-405). */
  training: TrainingCache;
  /** The phone's workouts, their sets and their finishes, sent or not (K-405): the session is built from them. */
  workoutRecords(): Promise<LocalRecord[]>;
  /** The phone's meals, sent or not (K-407): today's list shows a meal saved offline at once. */
  mealRecords(): Promise<LocalRecord[]>;
  /** Forgets the phone's copy of a record the server no longer has (a meal corrected or deleted, K-407). */
  forgetRecord(clientId: string): Promise<void>;
  /** A problem, by name only (V3): the same reporter the queue uses. */
  report(problem: SyncProblem): void;
  /** The three reminder slots, scheduled on the phone (K-410). */
  reminders: Reminders;
  /** The rest timer's voice in the background (K-411). */
  restAlert: RestAlert;
  /** The two switches that write to Apple Health: finished sessions, weigh-ins typed in (K-412). */
  healthWriting: HealthWriting;
};

export async function createAppServices({
  baseUrl,
  storage,
  db,
  fetch,
  report,
  kv,
  locale,
  notifications = notificationsUnavailable,
  alerts = alertsUnavailable,
  healthWrite = healthWriteUnavailable,
  now = () => new Date(),
}: Deps): Promise<AppServices> {
  const session = createSessionManager({ storage, refresh: refreshWithServer({ baseUrl, fetch }) });
  const api = createApiClient({ baseUrl, accessToken: session.accessToken, refresh: session.refresh, fetch });
  const store = await openRecordStore(db);
  const queue = createSyncQueue({ store, send: sendWithApi(api), report });
  const units = await createUnitsPreference({ kv, api, locale });
  const reminders = await createReminders({ kv, access: notifications, now, report });
  const restAlert = createRestAlert({ access: alerts, report });
  const healthWriting = await createHealthWriting({ kv, access: healthWrite, report });
  const profile = await createProfileStatus({ kv, api, units, onProfile: (read) => reminders.keepSchedule(read.schedule) });
  const consents = createConsentState({ api, kv });
  // The program's week off reaches the reminders whenever the program is read (ADR-037 › 51b); they report their own failures.
  const training = createTrainingCache(kv, (program) => void reminders.keepRestUntil(program?.restUntil ?? null));
  // No session, nothing to know: a "done" kept here belongs to no one (a backup restored onto a new phone).
  if (!(await session.isSignedIn())) {
    await profile.forget();
    await reminders.forget(); // and reminders turned on, with someone's own sentence (K-410)
  }

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
    consents.forget().catch(reportError); // and what the phone knew of its consents
    forgetSentActivityDays(kv).catch(reportError); // and which Health days it sent (K-404)
    training.forget().catch(reportError); // and the program kept for offline training (K-405)
    reminders.forget().catch(reportError); // and the reminders: nothing scheduled for an account that left (K-410)
    void restAlert.stop(); // and a rest's alert (K-411; it reports its own failure)
    healthWriting.forget().catch(reportError); // and the Apple Health switches (K-412); what was written stays the user's
  });

  return {
    session,
    api,
    queue,
    units,
    profile,
    consents,
    training,
    report,
    reminders,
    restAlert,
    healthWriting,
    /**
     * Deletes the account on the server (202: every module removes its own data, AccountDeletionRequested). From that
     * answer on its tokens are refused, so the phone only forgets: the session, and with it the records and settings
     * (the listener above). A refusal keeps everything and throws by name.
     */
    deleteAccount: async () => {
      let status: number;
      try {
        status = (await api.DELETE('/v1/account')).response.status;
      } catch {
        throw Object.assign(new Error('account deletion: no answer'), { name: 'NoConnection' });
      }
      if (status !== 202) throw Object.assign(new Error(`account deletion failed with HTTP ${status}`), { name: 'DeletionFailed' });
      // The account is gone. A local step that fails now (a locked keychain) is not a failed deletion: it is reported, and
      // the phone forgets what it can — a token left in the keychain is refused at the next start, which clears it.
      await session.signOut().catch(reportError);
      await store.clear().catch(reportError);
    },
    withdrawHealthData: async () => {
      await withdrawConsent(api, 'HEALTH_DATA', true);
      await consents.remember('HEALTH_DATA', 'WITHDRAWN').catch(reportError);
      await forgetSentActivityDays(kv).catch(reportError); // the server deleted them: sent again once allowed again
      // Withdrawn and deleted on the server. A local delete that fails is reported, not a failed withdrawal: while the
      // consent stays withdrawn, whatever stays here is refused by the server (CONSENT_REQUIRED); it goes at sign-out.
      await store.forget(HEALTH_KINDS).catch(reportError);
    },
    pendingCount: store.pendingCount,
    workoutRecords: async () => (await store.all()).filter((record) => WORKOUT_KINDS.includes(record.kind)),
    mealRecords: async () => (await store.all()).filter((record) => record.kind === 'meal'),
    forgetRecord: store.forgetClient,
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
