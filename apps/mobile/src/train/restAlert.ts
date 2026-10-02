/**
 * The rest timer in the background (K-411): the screen's timer counts from a timestamp, so it is right again whenever
 * the app comes back; what the background needs is a voice. When a rest starts, one notification is set for the band's
 * lower end (G1 K-49: 2-3 minutes); a new rest moves it, the end of the session takes it away. It is a timer the user
 * started, not a reminder: outside the three reminder kinds (ADR-036), under its own id, so rebuilding the reminders
 * never touches it. Only where iOS already allows notifications — iOS is never asked mid-set (Settings asks, K-410).
 * While the app is in front iOS does not show it (no foreground handler): the screen's timer is there.
 */
import { t } from '@/copy';
import type { NotificationPermission } from '@/notifications/reminders';

import { workoutParams } from './params';
import { restText } from './session';

const ID = 'rest';

/**
 * What the rest alert needs of the phone's notifications — and no more: there is no way to ask iOS here, so a set can
 * never bring up the permission sheet.
 */
export type AlertAccess = {
  permission(): Promise<NotificationPermission>;
  /** One notification at a moment under this id; the same id replaces it. */
  alertAt(id: string, at: Date, title: string, body: string): Promise<void>;
  cancel(id: string): Promise<void>;
};

/** Where there are no notifications (tests, a build without the module): never allowed, nothing set. */
export const alertsUnavailable: AlertAccess = {
  permission: async () => ({ granted: false, canAskAgain: false }),
  alertAt: async () => undefined,
  cancel: async () => undefined,
};

type Options = {
  access: AlertAccess;
  /** By name only (V3). A failure never holds up the set that started the rest. */
  report: (problem: { name: string }) => void;
};

export type RestAlert = ReturnType<typeof createRestAlert>;

export function createRestAlert({ access, report }: Options) {
  const reportError = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });
  return {
    /** A rest began at `since` (ms): "rest's up" at the band's lower end, replacing any rest alert before it. */
    start: async (since: number): Promise<void> => {
      try {
        if (!(await access.permission()).granted) return;
        const at = new Date(since + workoutParams.restSecondsMin * 1000);
        const min = restText(workoutParams.restSecondsMin);
        await access.alertAt(ID, at, t('workout.rest.alert.title'), t('workout.rest.alert.body', { min }));
      } catch (error) {
        reportError(error);
      }
    },
    /** The session ended or was left: no voice for a rest that is over. */
    stop: async (): Promise<void> => {
      await access.cancel(ID).catch(reportError);
    },
  };
}
