/**
 * The trial reminder (K-707, ADR-058 › 105). Asked for by the user's tap ("Remind me before it ends"): iOS is asked then, and one
 * local notification is set `trial_reminder_days_before` days before the trial ends — time to decide, and to cancel before the
 * first charge. It is a billing notice, not one of the three reminder kinds (ADR-036): under its own id, like the rest timer's
 * (K-411), so rebuilding the reminders never touches it. When the trial is no longer a trial (renewed, cancelled, ended) it goes;
 * when the trial's end moves it moves; at sign-out it goes. Nothing leaves the phone. What is kept: the moment it is set for.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { NotificationPermission } from '@/notifications/reminders';
import type { AlertAccess } from '@/train/restAlert';
import type { KeyValue } from '@/units/preference';

import { subscriptionParams } from './params';
import { dayWords } from './words';

type Subscription = components['schemas']['Subscription'];
type Options = {
  kv: KeyValue;
  alerts: AlertAccess;
  /** iOS's permission sheet, shown on the user's tap (notificationAccess.request). */
  ask: () => Promise<NotificationPermission>;
  now: () => Date;
};

const ID = 'trial';
const KEY = 'subscription.trialReminder';
const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialReminder = ReturnType<typeof createTrialReminder>;

export function createTrialReminder({ kv, alerts, ask, now }: Options) {
  /** When the reminder for this trial would come; none when it is not a trial or the moment has passed. */
  const momentFor = (subscription: Subscription): Date | null => {
    if (subscription.status !== 'TRIAL' || subscription.accessUntil === undefined) return null;
    const at = new Date(new Date(subscription.accessUntil).getTime() - subscriptionParams.trialReminderDaysBefore * DAY_MS);
    return at.getTime() > now().getTime() ? at : null;
  };

  const set = async (at: Date, endsOn: string) => {
    await alerts.alertAt(ID, at, t('subscription.reminder.title', { date: dayWords(endsOn) }), t('subscription.reminder.body'));
    await kv.setItemAsync(KEY, at.toISOString());
  };

  const remove = async () => {
    await alerts.cancel(ID);
    await kv.removeItemAsync(KEY);
  };

  const when = async (): Promise<Date | null> => {
    const kept = await kv.getItemAsync(KEY);
    return kept === null ? null : new Date(kept);
  };

  return {
    when,

    /** The user's tap: iOS asked, the reminder set. 'too_late' when it would come after now (or this is not a trial). */
    remind: async (subscription: Subscription): Promise<'set' | 'refused' | 'too_late'> => {
      const at = momentFor(subscription);
      if (at === null || subscription.accessUntil === undefined) return 'too_late';
      if (!(await ask()).granted) return 'refused';
      await set(at, subscription.accessUntil);
      return 'set';
    },

    /** Each time the phone reads the subscription: a reminder asked for follows the trial, or goes with it. */
    keep: async (subscription: Subscription): Promise<void> => {
      const kept = await when();
      if (kept === null) return; // nothing asked for: a reminder is the user's choice
      const at = momentFor(subscription);
      if (at === null || subscription.accessUntil === undefined) return remove();
      if (at.getTime() !== kept.getTime()) await set(at, subscription.accessUntil);
    },

    /** Sign-out: the reminder belongs to the account; none asked for, nothing to cancel. */
    forget: async (): Promise<void> => {
      if ((await when()) !== null) await remove();
    },
  };
}
