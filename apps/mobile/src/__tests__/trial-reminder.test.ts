/**
 * The trial reminder (K-707, ADR-058 › 105): asked for by the user, set on this phone `trial_reminder_days_before` days before the
 * trial ends — a billing notice under its own id, outside the three reminder kinds (ADR-036), so rebuilding the reminders never
 * touches it. iOS is asked on the user's tap. When the trial is no longer a trial (it renewed, it was cancelled) the reminder
 * goes; it moves with the trial's end; it goes at sign-out. Nothing leaves the phone.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { NotificationPermission } from '@/notifications/reminders';
import { subscriptionParams } from '@/subscription/params';
import { createTrialReminder } from '@/subscription/trialReminder';

import { memoryKv } from './support/profileServer';

type Subscription = components['schemas']['Subscription'];
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const NOW = new Date('2026-10-04T12:00:00Z');
const ENDS = '2026-10-11T12:00:00Z';
const TRIAL: Subscription = { active: true, appUserId: ID, status: 'TRIAL', accessUntil: ENDS };
/** The phone's own calendar day `trial_reminder_days_before` days before the end, at `trial_reminder_hour` local time. */
const at = (ends: string) => {
  const day = new Date(ends);
  day.setDate(day.getDate() - subscriptionParams.trialReminderDaysBefore);
  day.setHours(subscriptionParams.trialReminderHour, 0, 0, 0);
  return day;
};
const DAY = 24 * 60 * 60 * 1000;

function setup(granted = true, allowedLater = granted) {
  const set: { id: string; at: Date; title: string; body: string }[] = [];
  const cancelled: string[] = [];
  const asked: string[] = [];
  const alerts = {
    permission: async (): Promise<NotificationPermission> => ({ granted: allowedLater, canAskAgain: false }),
    alertAt: async (id: string, when: Date, title: string, body: string) => void set.push({ id, at: when, title, body }),
    cancel: async (id: string) => void cancelled.push(id),
  };
  const ask = async (): Promise<NotificationPermission> => (asked.push('ask'), { granted, canAskAgain: false });
  const kv = memoryKv();
  const reminder = createTrialReminder({ kv, alerts, ask, now: () => NOW });
  return { reminder, set, cancelled, asked, kv };
}

test('asked for: iOS is asked, and one notification is set the parameter’s days before the trial ends, under its own id', async () => {
  const { reminder, set, asked } = setup();
  expect(await reminder.remind(TRIAL)).toBe('set');
  expect(asked).toEqual(['ask']);
  expect(set).toHaveLength(1);
  expect(set[0].id).toBe('trial');
  expect(set[0].at).toEqual(at(ENDS));
  expect(set[0].title).toBe(t('subscription.reminder.title', { date: 'Oct 11, 2026' }));
  expect(set[0].body).toBe(t('subscription.reminder.body'));
  expect(await reminder.when()).toEqual(at(ENDS));
});

test('iOS says no: nothing is set and nothing is promised', async () => {
  const { reminder, set } = setup(false);
  expect(await reminder.remind(TRIAL)).toBe('refused');
  expect(set).toEqual([]);
  expect(await reminder.when()).toBeNull();
});

test('a trial ending sooner than the reminder would come: too late — iOS is not even asked', async () => {
  const { reminder, set, asked } = setup();
  const soon = { ...TRIAL, accessUntil: new Date(NOW.getTime() + DAY).toISOString() };
  expect(await reminder.remind(soon)).toBe('too_late');
  expect(asked).toEqual([]);
  expect(set).toEqual([]);
});

test('not a trial: there is nothing to remind of', async () => {
  const { reminder, set } = setup();
  expect(await reminder.remind({ ...TRIAL, status: 'ACTIVE' })).toBe('too_late');
  expect(set).toEqual([]);
});

test.each(['ACTIVE', 'CANCELLED', 'EXPIRED'] as const)('the trial became %s: the reminder goes', async (status) => {
  const { reminder, cancelled } = setup();
  await reminder.remind(TRIAL);
  await reminder.keep({ ...TRIAL, status });
  expect(cancelled).toEqual(['trial']);
  expect(await reminder.when()).toBeNull();
});

test('the trial’s end moved: the reminder moves with it; unchanged, it is left alone', async () => {
  const { reminder, set } = setup();
  await reminder.remind(TRIAL);
  await reminder.keep(TRIAL);
  expect(set).toHaveLength(1);
  const later = '2026-10-12T12:00:00Z';
  await reminder.keep({ ...TRIAL, accessUntil: later });
  expect(set).toHaveLength(2);
  expect(set[1].at).toEqual(at(later));
  expect(await reminder.when()).toEqual(at(later));
});

test('nothing asked for: keeping the subscription sets nothing (a reminder is the user’s choice)', async () => {
  const { reminder, set, cancelled } = setup();
  await reminder.keep(TRIAL);
  expect(set).toEqual([]);
  expect(cancelled).toEqual([]);
});

test('at a set hour of the phone’s day — never at the hour the trial happened to start (a 01:30 purchase would ring at 01:30)', async () => {
  const { reminder, set } = setup();
  await reminder.remind({ ...TRIAL, accessUntil: '2026-10-11T01:30:00Z' });
  expect(set[0].at.getHours()).toBe(subscriptionParams.trialReminderHour);
  expect(set[0].at.getMinutes()).toBe(0);
});

test('whether the reminder can still come: for the offer to show only when it can', () => {
  const { reminder } = setup();
  expect(reminder.canRemind(TRIAL)).toBe(true);
  expect(reminder.canRemind({ ...TRIAL, accessUntil: new Date(NOW.getTime() + DAY).toISOString() })).toBe(false);
  expect(reminder.canRemind({ ...TRIAL, status: 'ACTIVE' })).toBe(false);
});

test('the trial’s end moved inside the reminder’s window: the reminder goes (it would ring late or never)', async () => {
  const { reminder, cancelled } = setup();
  await reminder.remind(TRIAL);
  await reminder.keep({ ...TRIAL, accessUntil: new Date(NOW.getTime() + DAY).toISOString() });
  expect(cancelled).toEqual(['trial']);
  expect(await reminder.when()).toBeNull();
});

test('notifications turned off in iOS since: the reminder goes, so nothing is promised that iOS will not deliver', async () => {
  const { reminder, cancelled } = setup(true, false);
  await reminder.remind(TRIAL);
  await reminder.keep(TRIAL);
  expect(cancelled).toEqual(['trial']);
  expect(await reminder.when()).toBeNull();
});

test('a reminder that could not be scheduled is not kept as set', async () => {
  const { reminder, kv } = setup();
  const failing = createTrialReminder({
    kv,
    alerts: { permission: async () => ({ granted: true, canAskAgain: false }), alertAt: async () => Promise.reject(new Error('x')), cancel: async () => {} },
    ask: async () => ({ granted: true, canAskAgain: false }),
    now: () => NOW,
  });
  await expect(failing.remind(TRIAL)).rejects.toThrow();
  expect(await reminder.when()).toBeNull();
});

test('sign-out with no reminder asked for cancels nothing', async () => {
  const { reminder, cancelled } = setup();
  await reminder.forget();
  expect(cancelled).toEqual([]);
});

test('sign-out: the reminder goes', async () => {
  const { reminder, cancelled } = setup();
  await reminder.remind(TRIAL);
  await reminder.forget();
  expect(cancelled).toEqual(['trial']);
  expect(await reminder.when()).toBeNull();
});

test('the reminder never says what it would cost or blames: its words', () => {
  expect(t('subscription.reminder.body')).not.toMatch(/\$|lose|miss/i);
});
