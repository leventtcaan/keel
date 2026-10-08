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
const base: PlanInput = { schedule, cue: null, lastOpened: now, now, muted: false, mutedUntil: null, restUntil: null, firstCall: 'weekly' };

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

describe('a week off (ADR-037 › 51b): no training reminder until it ends; after it, they come back by date', () => {
  // now: Friday 2 Oct 2026, 12:00. Training days Monday and Thursday at 18:00 → reminders at 17:30.
  const off = (restUntil: string) => planReminders({ ...base, restUntil });

  test('no weekly training reminder while the week off is on', () => {
    expect(off('2026-10-05').filter((r) => r.kind === 'training' && 'weekday' in r.when)).toEqual([]);
  });

  test('the training days after it, by date, for the weeks the parameter gives — the first the day after it ends', () => {
    const dated = off('2026-10-05').filter((r) => r.kind === 'training');
    expect(P.restResumeWeeks).toBe(2);
    expect(dated.map((r) => r.when)).toEqual([
      { at: new Date(2026, 9, 8, 17, 30) }, // Thursday 8 Oct
      { at: new Date(2026, 9, 12, 17, 30) }, // Monday 12 Oct
      { at: new Date(2026, 9, 15, 17, 30) }, // Thursday 15 Oct
      { at: new Date(2026, 9, 19, 17, 30) }, // Monday 19 Oct: the 14th day after it
    ]);
    expect(new Set(dated.map((r) => r.id)).size).toBe(dated.length);
  });

  test('a lead that crosses midnight takes the evening before — still after the week off', () => {
    const early = planReminders({ ...base, schedule: { ...schedule, trainingDays: ['MONDAY'], usualTrainingTime: '00:10' }, restUntil: '2026-10-05' });
    expect(early.filter((r) => r.kind === 'training').map((r) => r.when)).toEqual([
      { at: new Date(2026, 9, 11, 23, 40) }, // Sunday evening before Monday 12 Oct
      { at: new Date(2026, 9, 18, 23, 40) }, // and before Monday 19 Oct
    ]);
  });

  test('the check-in and the quiet message do not change', () => {
    expect(off('2026-10-05').filter((r) => r.kind !== 'training')).toEqual(planReminders(base).filter((r) => r.kind !== 'training'));
  });

  test('a week off already over: weekly as before', () => {
    expect(off('2026-10-01')).toEqual(planReminders(base));
  });

  test('a reminder that would fall before now (the lead crossing back into tonight, already past) is not set', () => {
    const late = new Date(2026, 9, 2, 23, 50); // Friday, its last day, late
    const saturdayEarly = { ...schedule, trainingDays: ['SATURDAY' as const], usualTrainingTime: '00:10' };
    const plan = planReminders({ ...base, now: late, lastOpened: late, schedule: saturdayEarly, restUntil: '2026-10-02' });
    expect(plan.filter((r) => r.kind === 'training').map((r) => r.when)).toEqual([
      { at: new Date(2026, 9, 9, 23, 40) }, // not Friday 23:40 (past); the next Saturday's
    ]);
  });

  test('today is its last day: still off today', () => {
    expect(off('2026-10-02').filter((r) => r.kind === 'training' && 'weekday' in r.when)).toEqual([]);
  });
});

describe('a state with a last day (K-518, ADR-038): nothing until it ends, then by date — no open needed', () => {
  // now: Friday 2 Oct 2026, 12:00. Training Monday and Thursday at 18:00, check-in Monday 09:00. Sick until Tue 6 Oct.
  const quiet = (mutedUntil: string, extra: Partial<PlanInput> = {}) => planReminders({ ...base, muted: true, mutedUntil, ...extra });

  test('nothing weekly while it lasts', () => {
    expect(quiet('2026-10-06').filter((r) => 'weekday' in r.when)).toEqual([]);
  });

  test('the training days after it, by date, as after a week off', () => {
    expect(quiet('2026-10-06').filter((r) => r.kind === 'training').map((r) => r.when)).toEqual([
      { at: new Date(2026, 9, 8, 17, 30) }, // Thursday 8 Oct
      { at: new Date(2026, 9, 12, 17, 30) },
      { at: new Date(2026, 9, 15, 17, 30) },
      { at: new Date(2026, 9, 19, 17, 30) }, // the 13th day after it
    ]);
  });

  test('the check-in mornings after it, by date: Monday 5 Oct is inside it, Monday 12 Oct is the first', () => {
    expect(quiet('2026-10-06').filter((r) => r.kind === 'check_in').map((r) => r.when)).toEqual([
      { at: new Date(2026, 9, 12, 9, 0) },
      { at: new Date(2026, 9, 19, 9, 0) },
    ]);
  });

  test('the quiet message only if it falls after it', () => {
    // Opened Friday 2 Oct: due Friday 9 Oct — after a state ending 6 Oct, inside one ending 10 Oct.
    expect(quiet('2026-10-06').filter((r) => r.kind === 'quiet').map((r) => r.when)).toEqual([{ at: new Date(2026, 9, 9, 12, 0) }]);
    expect(quiet('2026-10-10').filter((r) => r.kind === 'quiet')).toEqual([]);
  });

  test('without a last day: nothing at all, as before', () => {
    expect(planReminders({ ...base, muted: true })).toEqual([]);
  });

  test('a week off ending later than the state: the training days come back after the later of the two', () => {
    const dated = quiet('2026-10-06', { restUntil: '2026-10-09' }).filter((r) => r.kind === 'training');
    expect(dated[0].when).toEqual({ at: new Date(2026, 9, 12, 17, 30) });
  });
});

describe('the first call (K-992, ADR-077 Ek 2): no check-in morning before the server\'s first call day', () => {
  // Onboarding finished Monday 5 Oct 2026 at 08:30; the server's first call is Monday 12 Oct (never the day it finished).
  const monday = new Date(2026, 9, 5, 8, 30);
  const first = (firstCall: PlanInput['firstCall'], extra: Partial<PlanInput> = {}) =>
    planReminders({ ...base, now: monday, lastOpened: monday, firstCall, ...extra }).filter((r) => r.kind === 'check_in');

  test('finished on a Monday morning: the first check-in reminder is the next Monday, not today at 09:00', () => {
    expect(first({ on: '2026-10-12' }).map((r) => r.when)).toEqual([
      { at: new Date(2026, 9, 12, 9, 0) },
      { at: new Date(2026, 9, 19, 9, 0) }, // by date for the weeks the parameter gives; the next open turns it weekly
    ]);
  });

  test('its day come (the check-in open, the call not made yet): weekly again', () => {
    expect(first({ on: '2026-10-05' }).map((r) => r.when)).toEqual([{ weekday: 2, hour: 9, minute: 0 }]);
  });

  test('the first call made, or the first weeks over: weekly every check-in day', () => {
    expect(first('weekly').map((r) => r.when)).toEqual([{ weekday: 2, hour: 9, minute: 0 }]);
  });

  test('no first call at all (no health data consent, no calls): no check-in reminder; training and quiet stay', () => {
    expect(first('off')).toEqual([]);
    expect(planReminders({ ...base, firstCall: 'off' }).map((r) => r.kind)).toEqual(['training', 'training', 'quiet']);
  });

  test('a state lasting past the first call day: the check-in mornings after the later of the two', () => {
    expect(first({ on: '2026-10-12' }, { muted: true, mutedUntil: '2026-10-13' }).map((r) => r.when)).toEqual([
      { at: new Date(2026, 9, 19, 9, 0) }, // Monday 12 Oct is inside the state
      { at: new Date(2026, 9, 26, 9, 0) },
    ]);
  });
});
