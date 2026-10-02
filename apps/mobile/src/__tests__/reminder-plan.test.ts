/**
 * The three reminder slots (K-410, arastirma/ham/I1-onboarding-aliskanlik.md F4): before training in the user's own
 * words, the check-in morning, and one message after a quiet week. Nothing else is ever planned.
 */
import { t } from '@/copy';
import { notificationParams as P } from '@/notifications/params';
import { type PlanInput, type Schedule, planReminders } from '@/notifications/plan';

const schedule: Schedule = {
  trainingDays: ['MONDAY', 'THURSDAY'],
  usualTrainingTime: '18:00',
  checkInDay: 'MONDAY',
  timeZone: 'Europe/Istanbul',
};
const now = new Date(2026, 9, 2, 12, 0); // a Friday, local time
const base: PlanInput = { schedule, cue: null, lastOpened: now, now, muted: false };

test('a training day gets one reminder, the lead before the usual time, on the phone\'s calendar (1 = Sunday)', () => {
  const training = planReminders(base).filter((r) => r.kind === 'training');
  expect(P.trainingLeadMinutes).toBe(30);
  expect(training.map((r) => r.when)).toEqual([
    { weekday: 2, hour: 17, minute: 30 },
    { weekday: 5, hour: 17, minute: 30 },
  ]);
  expect(new Set(training.map((r) => r.id)).size).toBe(2);
});

test('a lead that crosses midnight lands on the day before — Sunday before Monday', () => {
  const early = planReminders({ ...base, schedule: { ...schedule, trainingDays: ['MONDAY'], usualTrainingTime: '00:10' } });
  expect(early.find((r) => r.kind === 'training')?.when).toEqual({ weekday: 1, hour: 23, minute: 40 });
  const saturday = planReminders({ ...base, schedule: { ...schedule, trainingDays: ['SUNDAY'], usualTrainingTime: '00:00' } });
  expect(saturday.find((r) => r.kind === 'training')?.when).toEqual({ weekday: 7, hour: 23, minute: 30 });
});

test('the training reminder speaks in the user\'s own sentence; without one, a plain line', () => {
  const own = planReminders({ ...base, cue: '  After work, straight to the gym  ' }).find((r) => r.kind === 'training');
  expect(own?.title).toBe(t('reminders.training.title', { minutes: P.trainingLeadMinutes }));
  expect(own?.body).toBe('After work, straight to the gym');
  expect(planReminders({ ...base, cue: '   ' }).find((r) => r.kind === 'training')?.body).toBe(t('reminders.training.body'));
  expect(planReminders(base).find((r) => r.kind === 'training')?.body).toBe(t('reminders.training.body'));
});

test('no usual time, no training reminder — the check-in stays', () => {
  const { usualTrainingTime: _none, ...withoutTime } = schedule;
  const plan = planReminders({ ...base, schedule: withoutTime });
  expect(plan.filter((r) => r.kind === 'training')).toEqual([]);
  expect(plan.filter((r) => r.kind === 'check_in')).toHaveLength(1);
});

test('the check-in reminder: once a week, the check-in day, in the morning', () => {
  const checkIn = planReminders({ ...base, schedule: { ...schedule, checkInDay: 'TUESDAY' } }).filter((r) => r.kind === 'check_in');
  expect(P.checkInTime).toBe('09:00');
  expect(checkIn).toEqual([
    { id: expect.any(String), kind: 'check_in', when: { weekday: 3, hour: 9, minute: 0 }, title: t('reminders.checkIn.title'), body: t('reminders.checkIn.body') },
  ]);
});

test('the quiet reminder: once, a quiet spell after the app was last opened, at the same time of day', () => {
  const lastOpened = new Date(2026, 9, 1, 21, 15);
  const quiet = planReminders({ ...base, lastOpened }).filter((r) => r.kind === 'quiet');
  expect(P.quietDays).toBe(7);
  expect(quiet).toEqual([
    { id: expect.any(String), kind: 'quiet', when: { at: new Date(2026, 9, 8, 21, 15) }, title: t('reminders.quiet.title'), body: t('reminders.quiet.body') },
  ]);
});

test('a quiet spell already past is not planned again: one message per spell', () => {
  const lastOpened = new Date(2026, 8, 20, 9, 0); // twelve days before now: its message was due five days ago
  expect(planReminders({ ...base, lastOpened }).filter((r) => r.kind === 'quiet')).toEqual([]);
  expect(planReminders({ ...base, lastOpened: null }).filter((r) => r.kind === 'quiet')).toEqual([]);
});

test('before there is a schedule (onboarding not done), only the quiet message can be planned', () => {
  expect(planReminders({ ...base, schedule: null }).map((r) => r.kind)).toEqual(['quiet']);
});

test('a declared state mutes everything (K-516 feeds it)', () => {
  expect(planReminders({ ...base, muted: true })).toEqual([]);
});

test('three kinds and never more than one a day plus two: the week\'s count stays inside iOS\'s 64 pending', () => {
  const every: Schedule = { ...schedule, trainingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] };
  const plan = planReminders({ ...base, schedule: every });
  expect(new Set(plan.map((r) => r.kind))).toEqual(new Set(['training', 'check_in', 'quiet']));
  expect(plan).toHaveLength(9);
  expect(new Set(plan.map((r) => r.id)).size).toBe(9);
});
