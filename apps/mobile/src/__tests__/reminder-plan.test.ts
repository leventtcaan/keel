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

test('no usual time (onboarding no longer asks, ADR-072 #4): the training reminder goes by the default one, the check-in stays (K-1060)', () => {
  const { usualTrainingTime: _none, ...withoutTime } = schedule;
  const plan = planReminders({ ...base, schedule: withoutTime });
  expect(P.defaultTrainingTime).toBe('18:00');
  // Thirty minutes before the default 18:00, on each training day: a new user gets the reminder the settings promise.
  expect(plan.filter((r) => r.kind === 'training').map((r) => r.when)).toEqual([
    { weekday: 2, hour: 17, minute: 30 },
    { weekday: 5, hour: 17, minute: 30 },
  ]);
  expect(plan.filter((r) => r.kind === 'check_in')).toHaveLength(1);
});

test('a time the user gave wins over the default', () => {
  const evening = planReminders({ ...base, schedule: { ...schedule, usualTrainingTime: '07:00' } }).filter((r) => r.kind === 'training');
  expect(evening.map((r) => r.when)).toEqual([
    { weekday: 2, hour: 6, minute: 30 },
    { weekday: 5, hour: 6, minute: 30 },
  ]);
});

describe('the training days are the PROGRAM\'s (ADR-090 Ek 1)', () => {
  test("the program's weekdays plan the training reminders, whatever older list the profile's schedule still holds", () => {
    // The profile says Monday and Thursday (what onboarding wrote); the program was changed in Edit to Tuesday, Wednesday and Saturday.
    const training = planReminders({ ...base, programDays: ['TUESDAY', 'WEDNESDAY', 'SATURDAY'] }).filter((r) => r.kind === 'training');
    expect(training.map((r) => r.when)).toEqual([
      { weekday: 3, hour: 17, minute: 30 },
      { weekday: 4, hour: 17, minute: 30 },
      { weekday: 7, hour: 17, minute: 30 },
    ]);
  });

  test('seven days: a reminder for each', () => {
    const week = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
    expect(planReminders({ ...base, programDays: [...week] }).filter((r) => r.kind === 'training')).toHaveLength(7);
  });

  test("the program not read yet, or with no day on a weekday: the profile's days stand in", () => {
    for (const programDays of [undefined, null, [] as Schedule['trainingDays']]) {
      const training = planReminders({ ...base, programDays }).filter((r) => r.kind === 'training');
      expect(training.map((r) => r.when)).toEqual([
        { weekday: 2, hour: 17, minute: 30 },
        { weekday: 5, hour: 17, minute: 30 },
      ]);
    }
  });

  test("the check-in morning stays the schedule's own", () => {
    const checkIn = planReminders({ ...base, programDays: ['TUESDAY'] }).filter((r) => r.kind === 'check_in');
    expect(checkIn.map((r) => r.when)).toEqual([{ weekday: 2, hour: 9, minute: 0 }]);
  });
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

describe('the weigh-in line on the training reminder (ADR-089 Ek 2, K-1058)', () => {
  // Wednesday 7 Oct 2026, noon. The block runs Tuesday 6 Oct to the check-in Monday 12 Oct; training is Mon and Thu at 18:00.
  const wednesday = new Date(2026, 9, 7, 12, 0);
  const block = { from: '2026-10-06', to: '2026-10-12', weighed: 2, needed: 4, short: false };
  const plan = (extra: Partial<PlanInput> = {}) => planReminders({ ...base, now: wednesday, lastOpened: wednesday, weighInWeek: block, ...extra });
  const training = (extra: Partial<PlanInput> = {}) => plan(extra).filter((r) => r.kind === 'training');
  const line = (count: number) => t(count === 1 ? 'reminders.training.weighIns.one' : 'reminders.training.weighIns.other', { count, day: 'Monday' });

  test("behind and still reachable: Thursday's reminder says how many more before the call, after its usual words", () => {
    const thursday = training().find((r) => r.id === 'training-2026-10-08');
    expect(thursday?.when).toEqual({ at: new Date(2026, 9, 8, 17, 30) });
    expect(thursday?.body).toBe(`${t('reminders.training.body')}\n${line(2)}`);
    expect(line(2)).toBe("2 more weigh-ins before Monday's call.");
  });

  test('the line follows the user\'s own sentence, and the singular says "1 more weigh-in"', () => {
    const own = training({ cue: 'After work, straight to the gym', weighInWeek: { ...block, weighed: 3 } }).find((r) => r.id === 'training-2026-10-08');
    expect(own?.body).toBe(`After work, straight to the gym\n${line(1)}`);
    expect(line(1)).toBe("1 more weigh-in before Monday's call.");
  });

  test("only the block's training days before the check-in day carry it; the check-in day's own and later weeks' reminders do not", () => {
    const withLine = training().filter((r) => r.body.includes('\n'));
    expect(withLine.map((r) => r.id)).toEqual(['training-2026-10-08']);
    // The days after are still planned, by date, and say only their usual words.
    const monday = training().find((r) => r.id === 'training-2026-10-12');
    expect(monday?.body).toBe(t('reminders.training.body'));
  });

  test('the training days stay what they were: the same moments, by date for the two weeks ahead (a weekly reminder cannot carry a line for one week)', () => {
    expect(training().map((r) => r.when)).toEqual([
      { at: new Date(2026, 9, 8, 17, 30) },
      { at: new Date(2026, 9, 12, 17, 30) },
      { at: new Date(2026, 9, 15, 17, 30) },
      { at: new Date(2026, 9, 19, 17, 30) },
    ]);
    expect(training({ weighInWeek: null }).every((r) => 'weekday' in r.when)).toBe(true); // weekly again once there is no line
  });

  test('enough: no line, the weekly reminders as before', () => {
    expect(training({ weighInWeek: { ...block, weighed: 4 } })).toEqual(training({ weighInWeek: null }));
  });

  test('a short week (the server gave a date the calls start): no line', () => {
    expect(training({ weighInWeek: { ...block, weighed: 1, short: true } })).toEqual(training({ weighInWeek: null }));
  });

  test('no weighInWeek (a call has read the scale): no line, nothing changes', () => {
    expect(plan({ weighInWeek: null })).toEqual(plan({ weighInWeek: undefined }));
    expect(training({ weighInWeek: null }).every((r) => !r.body.includes('weigh-in'))).toBe(true);
  });

  test('not reachable any more on that day: no line (Sunday with 4 to go and only Sunday and Monday left)', () => {
    const sunday = { ...schedule, trainingDays: ['SUNDAY' as const] };
    const saturday = new Date(2026, 9, 10, 12, 0);
    expect(planReminders({ ...base, schedule: sunday, now: saturday, lastOpened: saturday, weighInWeek: { ...block, weighed: 0 } }).filter((r) => r.kind === 'training')).toEqual(
      planReminders({ ...base, schedule: sunday, now: saturday, lastOpened: saturday, weighInWeek: null }).filter((r) => r.kind === 'training'),
    );
    // With 3 of 4 the same Sunday is reachable: Sunday and Monday are two mornings for one.
    const reachable = planReminders({ ...base, schedule: sunday, now: saturday, lastOpened: saturday, weighInWeek: { ...block, weighed: 3 } });
    expect(reachable.find((r) => r.id === 'training-2026-10-11')?.body).toBe(`${t('reminders.training.body')}\n${line(1)}`);
  });

  test('after the check-in day (the block is over): no line', () => {
    const tuesday = new Date(2026, 9, 13, 12, 0);
    expect(planReminders({ ...base, now: tuesday, lastOpened: tuesday, weighInWeek: block }).filter((r) => r.kind === 'training')).toEqual(
      planReminders({ ...base, now: tuesday, lastOpened: tuesday, weighInWeek: null }).filter((r) => r.kind === 'training'),
    );
  });

  test("a training day already past today (its reminder time gone): no line, and no reminder in the past", () => {
    const thursdayNight = new Date(2026, 9, 8, 20, 0);
    const list = planReminders({ ...base, now: thursdayNight, lastOpened: thursdayNight, weighInWeek: block }).filter((r) => r.kind === 'training');
    expect(list.map((r) => r.id)).not.toContain('training-2026-10-08');
    expect(list.filter((r) => r.body.includes('\n'))).toEqual([]);
  });

  test('no usual time (the default one, K-1060): the training days carry the line as with a time the user gave', () => {
    const { usualTrainingTime: _none, ...withoutTime } = schedule;
    expect(plan({ schedule: withoutTime }).filter((r) => r.kind === 'training').map((r) => r.body)).toEqual(
      plan({}).filter((r) => r.kind === 'training').map((r) => r.body),
    );
  });

  test('the training reminders off (reminders off): nothing is planned at all; so no line', () => {
    expect(planReminders({ ...base, schedule: null, now: wednesday, lastOpened: null, weighInWeek: null }).filter((r) => r.kind === 'training')).toEqual([]);
  });

  test('a week off or a state on that day: that day has no training reminder, so no line', () => {
    expect(training({ restUntil: '2026-10-09' }).filter((r) => r.body.includes('\n'))).toEqual([]);
    expect(training({ muted: true, mutedUntil: '2026-10-09' }).filter((r) => r.body.includes('\n'))).toEqual([]);
  });

  test('no first call at all (no health data consent): the line is not added', () => {
    expect(training({ firstCall: 'off' })).toEqual(training({ firstCall: 'off', weighInWeek: null }));
  });

  test('check-in and quiet reminders are untouched, and no fourth kind is ever planned (ADR-036)', () => {
    const kinds = new Set(plan().map((r) => r.kind));
    expect([...kinds].sort()).toEqual(['check_in', 'quiet', 'training']);
    expect(plan().filter((r) => r.kind !== 'training')).toEqual(planReminders({ ...base, now: wednesday, lastOpened: wednesday, weighInWeek: null }).filter((r) => r.kind !== 'training'));
  });

  test('no blame and nothing to make up (U7)', () => {
    for (const count of [1, 2, 4]) expect(line(count)).not.toMatch(/make up|catch up|missed|failed|should|only|behind/i);
  });
});
