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
import { type ProjectionSwitch, createProjectionSwitch } from '@/projection/projection';
import { type ProjectionAccess, createProjectionAccess } from '@/projection/scoff';
import { type SessionManager, type SessionStorage, createSessionManager, refreshWithServer } from '@/session/session';
import { type StateService, createStateService } from '@/state/stateService';
import { type SubscriptionGate, createSubscriptionGate } from '@/subscription/gate';
import type { LegalLink } from '@/subscription/links';
import { type TrialReminder, createTrialReminder } from '@/subscription/trialReminder';
import { type SubscriptionStore, storeUnavailable } from '@/subscription/store';
import { localDay } from '@/today/today';
import { type Opens, createOpens } from '@/today/opens';
import { type AlertAccess, type RestAlert, alertsUnavailable, createRestAlert } from '@/train/restAlert';
import type { Figure } from '@/train/demo';
import { type TrainingCache, createTrainingCache } from '@/train/trainData';
import { type PhotoFiles, type PhotoLibrary, createPhotoLibrary, noPhotoFiles } from '@/photos/library';
import { HEALTH_KINDS, type SyncProblem, type SyncQueue, createSyncQueue } from '@/sync/queue';
import { sendWithApi } from '@/sync/send';
import { type LocalRecord, type SqlDatabase, openRecordStore } from '@/sync/store';
import { type KeyValue, type UnitsPreference, createUnitsPreference } from '@/units/preference';

const WORKOUT_KINDS = ['workout', 'set', 'finish'];
/** The profile's sex, kept for the muscle map's figure (ADR-037 › 49): it belongs to the account. */
const FIGURE = 'profile.figure';

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
  /** The progress photos' folder on the phone (K-614, photoFiles.ts); none where there is none (tests). */
  photoFiles?: PhotoFiles;
  /** The App Store through RevenueCat (K-702, revenueCat.ts); none where there is none (Expo Go, tests). */
  purchases?: SubscriptionStore;
  /** The Terms of Use and Privacy Policy set in the build (links.ts): without both nothing is sold, and the gate stays open. */
  links?: LegalLink[];
  now?: () => Date;
};

/** Whose the progress photos on this phone are: the SHA-256 of the account's Apple user id (ADR-055 › 101). */
const PHOTO_OWNER = 'photos.owner';

export type AppServices = {
  session: SessionManager;
  api: ApiClient;
  queue: SyncQueue;
  units: UnitsPreference;
  /**
   * The SCOFF gate's result for the shape projection (K-607, ADR-050), on this phone only. At sign-out "unavailable" stays
   * (signing out must not re-open the gate) and "clear" goes (the next person is asked).
   */
  projection: ProjectionAccess;
  /** The shape projection's switch and what it last showed (K-606): off unless turned on; forgotten at sign-out. */
  projectionSwitch: ProjectionSwitch;
  /** Whether this account has finished onboarding (K-306). */
  profile: ProfileStatus;
  /** Records the server does not have yet; a sign-out drops them, so the screen warns first (K-309). */
  pendingCount(): Promise<number>;
  signOut(): Promise<void>;
  /**
   * After a sign-in (ADR-055 › 101): `owner` is the account's Apple user id as its SHA-256. The progress photos on this
   * phone belong to the owner kept; another account signing in has them deleted first. None kept (photos from before
   * K-617, or none at all): this account becomes the owner. Rejects when another account's photos cannot be deleted —
   * the owner kept stays, and the sign-in keeps no session (appleSignIn.ts: fail closed).
   */
  claimPhotos(owner: string): Promise<void>;
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
  /** The muscle map's figure: the profile's sex as last read (ADR-037 › 49); not known, the one drawn until now. */
  bodyFigure(): Promise<Figure>;
  /** The three reminder slots, scheduled on the phone (K-410). */
  reminders: Reminders;
  /** The rest timer's voice in the background (K-411). */
  restAlert: RestAlert;
  /** The two switches that write to Apple Health: finished sessions, weigh-ins typed in (K-412). */
  healthWriting: HealthWriting;
  /** What the user declared (K-518): kept on the phone for the reminders. */
  state: StateService;
  /** The days the app was opened, on the phone only (K-521, ADR-041 #66). */
  opens: Opens;
  /** Progress photos, on this phone only (K-614, V1). */
  photos: PhotoLibrary;
  /** The App Store's side of the subscription (K-702); whether it is on is the server's answer (GET /v1/subscription). */
  purchases: SubscriptionStore;
  /** After onboarding, an account that never subscribed meets the paywall first (K-706, ADR-058 › 107). */
  gate: SubscriptionGate;
  /** The trial reminder the user asked for (K-707): a billing notice under its own id, on this phone only. */
  trialReminder: TrialReminder;
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
  photoFiles = noPhotoFiles,
  purchases = storeUnavailable,
  links = [],
  now = () => new Date(),
}: Deps): Promise<AppServices> {
  const session = createSessionManager({ storage, refresh: refreshWithServer({ baseUrl, fetch }) });
  const api = createApiClient({ baseUrl, accessToken: session.accessToken, refresh: session.refresh, fetch });
  const store = await openRecordStore(db);
  const queue = createSyncQueue({ store, send: sendWithApi(api), report });
  const units = await createUnitsPreference({ kv, api, locale });
  const projection = await createProjectionAccess({ kv, locale });
  const projectionSwitch = await createProjectionSwitch({ kv, access: projection });
  const reportName = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });
  // A state the user declared quiets the reminders while it is in force (K-518, ADR-036 #7); each change plans again.
  const state = createStateService({ api, kv, now, onChange: () => void reminders.refresh() });
  const opens = createOpens({ kv, today: () => localDay(now()) });
  const reminders = await createReminders({ kv, access: notifications, now, report, muted: () => state.inForce(),
    mutedUntil: () => state.until() });
  const restAlert = createRestAlert({ access: alerts, report });
  const healthWriting = await createHealthWriting({ kv, access: healthWrite, report });
  const profile = await createProfileStatus({
    kv,
    api,
    units,
    onProfile: async (read) => {
      await kv.setItemAsync(FIGURE, read.sex === 'FEMALE' ? 'female' : 'male').catch(reportName);
      await reminders.keepSchedule(read.schedule);
    },
  });
  const consents = createConsentState({ api, kv });
  // The program's week off reaches the reminders whenever the program is read (ADR-037 › 51b); they report their own failures.
  const training = createTrainingCache(kv, (program) => void reminders.keepRestUntil(program?.restUntil ?? null));
  const photos = createPhotoLibrary(photoFiles);
  // iOS is asked only on the user's tap ("Remind me before it ends"), through the reminders' own access.
  const trialReminder = createTrialReminder({ kv, alerts, ask: () => notifications.request(), now });
  // Each answer the gate reads (every start, every sign-in) lets the trial reminder follow it: a trial cancelled anywhere —
  // in Apple's sheet, in iOS Settings — loses its reminder at the next start (K-707 review).
  const gate = await createSubscriptionGate({ kv, api, purchases, links, report, onRead: (read) => void trialReminder.keep(read).catch(reportName) });
  // Signed in already at the app's start: the kept answer routes at once, this one corrects it — and with nothing kept and no
  // answer (offline), the cold start opens the gate rather than lock the app with nothing to lift it (K-706).
  if (await session.isSignedIn()) void gate.refresh({ openWithoutAnswer: true });
  // No session, nothing to know: a "done" kept here belongs to no one (a backup restored onto a new phone).
  if (!(await session.isSignedIn())) {
    await profile.forget();
    await reminders.forget(); // and reminders turned on, with someone's own sentence (K-410)
    await kv.removeItemAsync(FIGURE); // and the profile's sex (ADR-037 › 49)
    await projectionSwitch.forget(); // and the projection's switch and what it showed (K-606)
    // Not the progress photos (ADR-055 › 101): the only copy, and the person may be the same one coming back; whose they
    // are is settled at the next sign-in (claimPhotos).
  }

  // Whatever ends the session — sign-out, or the server refusing the refresh token (expired, reused, the account
  // deleted: the phone cannot tell which) — the records go with it: they belong to the account that made them, and
  // the next person to sign in on this phone must not inherit them (contract: DELETE /v1/account).
  const reportError = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });
  // The user's sign-out and the account's deletion: the photos and whose they were. A folder that cannot be deleted is
  // reported by name; the sign-out is still done.
  const forgetPhotos = async () => {
    await photos.forget().catch(reportError);
    await kv.removeItemAsync(PHOTO_OWNER).catch(reportError);
  };
  session.subscribe((signedIn) => {
    if (signedIn) {
      // One read of the profile answers both: has this account finished onboarding (K-306), and its own unit choice
      // in place of the phone's guess (K-310). Offline, the kept answers stay and the screen offers to try again.
      profile.refresh().catch(() => undefined);
      void gate.refresh(); // and whether this account meets the paywall first (K-706); it reports its own failures
      return;
    }
    store.clear().catch(reportError);
    units.forget().catch(reportError); // the preference belongs to the account too
    profile.forget().catch(reportError); // and so does "onboarding done"
    consents.forget().catch(reportError); // and what the phone knew of its consents
    forgetSentActivityDays(kv).catch(reportError); // and which Health days it sent (K-404)
    training.forget().catch(reportError); // and the program kept for offline training (K-405)
    reminders.forget().catch(reportError); // and the reminders: nothing scheduled for an account that left (K-410)
    state.forget().catch(reportError); // and a state declared: sickness and pain are health data (K-518)
    opens.forget().catch(reportError); // and the days the app was opened (K-521)
    projection.signedOut().catch(reportError); // and a SCOFF "clear" — never an "unavailable" (K-607, ADR-050)
    projectionSwitch.forget().catch(reportError); // and the projection's switch and what it showed (K-606)
    kv.removeItemAsync(FIGURE).catch(reportError); // and the profile's sex (ADR-037 › 49)
    void restAlert.stop(); // and a rest's alert (K-411; it reports its own failure)
    healthWriting.forget().catch(reportError); // and the Apple Health switches (K-412); what was written stays the user's
    trialReminder.forget().catch(reportError); // and the trial reminder: the account's, not the next person's (K-707)
    gate.forget().catch(reportError); // and whether this account met the paywall: the next one is asked afresh (K-706)
    purchases.forget().catch(reportError); // and the App Store's account: the next person's purchases are not this account's (K-702)
    // Not the progress photos (ADR-055 › 101): a refused refresh token (60 days away) would take the only copy, Day 1 too.
    // The user's sign-out and the account's deletion delete them (below); another account signing in does (claimPhotos).
  });

  return {
    session,
    api,
    queue,
    units,
    projection,
    projectionSwitch,
    profile,
    consents,
    training,
    report,
    reminders,
    state,
    opens,
    photos,
    purchases,
    gate,
    trialReminder,
    bodyFigure: async () => ((await kv.getItemAsync(FIGURE)) === 'female' ? 'female' : 'male'),
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
      await forgetPhotos(); // the account is gone: its photos too (K-614)
    },
    withdrawHealthData: async () => {
      await withdrawConsent(api, 'HEALTH_DATA', true);
      await consents.remember('HEALTH_DATA', 'WITHDRAWN').catch(reportError);
      await forgetSentActivityDays(kv).catch(reportError); // the server deleted them: sent again once allowed again
      // A state declared went with them on the server (ADR-038): the reminders plan without it.
      await state.forget().then(() => reminders.refresh()).catch(reportError);
      // Withdrawn and deleted on the server. A local delete that fails is reported, not a failed withdrawal: while the
      // consent stays withdrawn, whatever stays here is refused by the server (CONSENT_REQUIRED); it goes at sign-out.
      await store.forget(HEALTH_KINDS).catch(reportError);
    },
    pendingCount: store.pendingCount,
    workoutRecords: async () => (await store.all()).filter((record) => WORKOUT_KINDS.includes(record.kind)),
    mealRecords: async () => (await store.all()).filter((record) => record.kind === 'meal'),
    forgetRecord: store.forgetClient,
    claimPhotos: async (owner: string) => {
      const kept = await kv.getItemAsync(PHOTO_OWNER);
      if (kept !== null && kept !== owner) await photos.forget();
      await kv.setItemAsync(PHOTO_OWNER, owner);
    },
    signOut: async () => {
      const refreshToken = await session.refreshToken();
      // The phone forgets first, so the user is signed out at once even on a slow network. The records are cleared
      // even if the keychain fails to (the error still surfaces).
      try {
        await session.signOut();
      } finally {
        try {
          await store.clear();
        } finally {
          // The user signed out: their progress photos go with them (K-614; Settings says so first), and so does the
          // owner — even if the records could not be cleared.
          await forgetPhotos();
        }
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
