/**
 * The reminder's day and hour, and the paywall's line, are the parameter file's (K2) — not numbers of their own: with other
 * values, the reminder moves and the line says so.
 */
import { createTrialReminder } from '@/subscription/trialReminder';
import { paywallWords } from '@/subscription/words';

import { memoryKv } from './support/profileServer';

jest.mock('@/subscription/params', () => ({ subscriptionParams: { confirmAttempts: 1, confirmIntervalMs: 1, trialReminderDaysBefore: 3, trialReminderHour: 18 } }));

test('three days before, at 18:00 on the phone', async () => {
  const set: Date[] = [];
  const reminder = createTrialReminder({
    kv: memoryKv(),
    alerts: { permission: async () => ({ granted: true, canAskAgain: false }), alertAt: async (_id, at) => void set.push(at), cancel: async () => {} },
    ask: async () => ({ granted: true, canAskAgain: false }),
    now: () => new Date('2026-10-04T12:00:00Z'),
  });
  await reminder.remind({ active: true, appUserId: 'x', status: 'TRIAL', accessUntil: '2026-10-11T12:00:00Z' });
  const expected = new Date('2026-10-11T12:00:00Z');
  expected.setDate(expected.getDate() - 3);
  expected.setHours(18, 0, 0, 0);
  expect(set).toEqual([expected]);
});

test("the paywall's line says the parameter's days", () => {
  const words = paywallWords({ id: 'a', period: 'annual', price: '$59.99', pricePerMonth: null, trial: { count: 7, unit: 'day' } });
  expect(words.terms).toContain("3 days before it ends: a reminder on this phone, if you'd like one.");
});
