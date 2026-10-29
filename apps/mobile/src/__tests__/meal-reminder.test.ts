/**
 * The meal reminder, the fourth kind (ADR-090 #2, K-1063): learned from the user's own meal times (the median of a slot's logs over the
 * window, at least a few logs), at most two a day, only for a slot still empty near its usual time, off with the rest and off on its own.
 */
import { t } from '@/copy';
import { type LoggedMeal, learnRhythm, mealMoments } from '@/notifications/mealRhythm';
import { notificationParams as P } from '@/notifications/params';
import { type PlanInput, type Reminder, type Schedule, planReminders } from '@/notifications/plan';
import { keepMealRhythm } from '@/notifications/keepMealRhythm';
import { type NotificationAccess, createReminders } from '@/notifications/reminders';

const now = new Date(2026, 9, 14, 10, 0); // a Wednesday, 10:00 local
const at = (daysAgo: number, hour: number, minute = 0) => new Date(2026, 9, 14 - daysAgo, hour, minute).toISOString();
const meal = (slot: LoggedMeal['slot'], daysAgo: number, hour: number, minute = 0): LoggedMeal => ({ slot, eatenAt: at(daysAgo, hour, minute) });

/** Lunch at about 12:30 on four days, dinner at 19:00 on three, breakfast twice (not a habit), a snack at 16:00 on five. */
const lived: LoggedMeal[] = [
  meal('LUNCH', 1, 12, 20),
  meal('LUNCH', 2, 12, 30),
  meal('LUNCH', 3, 12, 40),
  meal('LUNCH', 5, 13, 0),
  meal('DINNER', 1, 19),
  meal('DINNER', 2, 19, 10),
  meal('DINNER', 4, 18, 50),
  meal('BREAKFAST', 1, 8),
  meal('BREAKFAST', 2, 8, 30),
  ...[1, 2, 3, 4, 6].map((d) => meal('SNACK', d, 16)),
];

describe('learning the rhythm', () => {
  test('the median time of each slot, only for a slot with enough logs', () => {
    const rhythm = learnRhythm(lived, now);

    expect(P.mealMinLogs).toBe(3);
    expect(rhythm.slots.map((s) => s.slot)).toEqual(['SNACK', 'LUNCH', 'DINNER']);
    expect(rhythm.slots.find((s) => s.slot === 'LUNCH')).toEqual({ slot: 'LUNCH', minute: 12 * 60 + 35, logs: 4 });
    expect(rhythm.slots.find((s) => s.slot === 'DINNER')?.minute).toBe(19 * 60);
    expect(rhythm.slots.some((s) => s.slot === 'BREAKFAST')).toBe(false);
    expect(rhythm.day).toBe('2026-10-14');
  });

  test('a log from before the window does not count', () => {
    const old = [meal('LUNCH', 20, 12), meal('LUNCH', 21, 12), meal('LUNCH', 22, 12), meal('LUNCH', 1, 12)];

    expect(P.mealWindowDays).toBe(14);
    expect(learnRhythm(old, now).slots).toEqual([]);
  });

  test('today\'s logs are known, so a slot already logged is not asked about again', () => {
    const rhythm = learnRhythm([...lived, meal('LUNCH', 0, 9)], now);

    expect(rhythm.loggedToday).toEqual(['LUNCH']);
  });

  test('an unreadable time is left out, never a crash', () => {
    expect(learnRhythm([{ slot: 'LUNCH', eatenAt: 'soon' }], now).slots).toEqual([]);
  });
});

describe('the moments to remind', () => {
  test('at most two a day, the slots with the most logs, a little after their usual time, today and tomorrow', () => {
    const moments = mealMoments(learnRhythm(lived, now), now);

    expect(P.mealMaxPerDay).toBe(2);
    // Snack (5 logs) and lunch (4): dinner has fewer. Today 13:05 and 16:30, tomorrow the same, in the order they ring.
    expect(moments.map((m) => `${m.day} ${m.slot}`)).toEqual(['2026-10-14 LUNCH', '2026-10-14 SNACK', '2026-10-15 LUNCH', '2026-10-15 SNACK']);
    expect(moments.find((m) => m.slot === 'LUNCH')?.at).toEqual(new Date(2026, 9, 14, 12, 35 + P.mealAfterMinutes));
  });

  test('a slot still empty by the last open rings; one logged today is quiet today and rings tomorrow', () => {
    const moments = mealMoments(learnRhythm([...lived, meal('LUNCH', 0, 9)], now), now);

    expect(moments.map((m) => `${m.day} ${m.slot}`)).toEqual(['2026-10-14 SNACK', '2026-10-15 LUNCH', '2026-10-15 SNACK']);
  });

  test('a moment already past is not planned', () => {
    const late = new Date(2026, 9, 14, 14, 0);

    expect(mealMoments(learnRhythm(lived, late), late).map((m) => `${m.day} ${m.slot}`)).toEqual(['2026-10-14 SNACK', '2026-10-15 LUNCH', '2026-10-15 SNACK']);
  });

  test('facts from another day are not trusted for today\'s logged slots', () => {
    const yesterday = learnRhythm([...lived, meal('LUNCH', 1, 9)], new Date(2026, 9, 13, 20, 0));
    const moments = mealMoments({ ...yesterday, loggedToday: ['LUNCH', 'SNACK'] }, now);

    expect(moments.filter((m) => m.day === '2026-10-14').map((m) => m.slot)).toEqual(['LUNCH', 'SNACK']);
  });

  test('no rhythm, no moments', () => {
    expect(mealMoments(null, now)).toEqual([]);
    expect(mealMoments({ day: '2026-10-14', slots: [], loggedToday: [] }, now)).toEqual([]);
  });
});

describe('in the plan', () => {
  const schedule: Schedule = { trainingDays: ['MONDAY'], usualTrainingTime: '18:00', checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' };
  const base: PlanInput = { schedule, cue: null, lastOpened: now, now, muted: false, mutedUntil: null, restUntil: null, firstCall: 'weekly' };
  const meals = learnRhythm(lived, now);

  test('the fourth kind: planned by date, in the app\'s words, beside the other three', () => {
    const plan = planReminders({ ...base, meals });
    const meal = plan.filter((r) => r.kind === 'meal');

    expect(plan.map((r) => r.kind)).toEqual(expect.arrayContaining(['training', 'check_in', 'quiet', 'meal']));
    expect(meal).toHaveLength(4);
    expect(meal[0]).toMatchObject({ id: 'meal-2026-10-14-LUNCH', title: t('reminders.meal.title', { slot: t('food.slot.LUNCH') }), body: t('reminders.meal.body') });
    expect(new Set(plan.map((r) => r.id)).size).toBe(plan.length);
  });

  test('without a rhythm there is no meal reminder, and off on its own there is none either', () => {
    expect(planReminders(base).filter((r) => r.kind === 'meal')).toEqual([]);
    expect(planReminders({ ...base, meals, mealsOff: true }).filter((r) => r.kind === 'meal')).toEqual([]);
    expect(planReminders({ ...base, meals, mealsOff: true }).map((r) => r.kind)).toContain('training');
  });

  test('a declared state silences it with the rest, and waits for the state to end', () => {
    expect(planReminders({ ...base, meals, muted: true, mutedUntil: null })).toEqual([]);
    const during = planReminders({ ...base, meals, muted: true, mutedUntil: '2026-10-14' }).filter((r) => r.kind === 'meal');
    expect(during.map((r) => r.id)).toEqual(['meal-2026-10-15-LUNCH', 'meal-2026-10-15-SNACK']);
  });
});

describe('on the phone', () => {
  function memoryKv() {
    const items = new Map<string, string>();
    return {
      items,
      getItemAsync: async (key: string) => items.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void items.set(key, value),
      removeItemAsync: async (key: string) => items.delete(key),
    };
  }
  function phone(granted = true) {
    const device = { scheduled: [] as Reminder[], permission: { granted, canAskAgain: true } };
    const access: NotificationAccess = {
      permission: async () => device.permission,
      request: async () => device.permission,
      replace: async (reminders) => {
        device.scheduled = reminders;
      },
      clear: async () => {
        device.scheduled = [];
      },
    };
    return { device, access };
  }
  const meal = (r: Reminder[]) => r.filter((x) => x.kind === 'meal').map((x) => x.id);

  test('off until reminders are on; then the learned habits are scheduled; a logged slot goes quiet at once', async () => {
    const { device, access } = phone();
    const reminders = await createReminders({ kv: memoryKv(), access, now: () => now, report: jest.fn() });
    await reminders.keepMealRhythm(learnRhythm(lived, now));
    expect(device.scheduled).toEqual([]);

    await reminders.turnOn();
    expect(meal(device.scheduled)).toHaveLength(4);

    await reminders.keepMealRhythm(learnRhythm([...lived, meal2('SNACK', 0, 9)], now));
    expect(meal(device.scheduled)).toEqual(['meal-2026-10-14-LUNCH', 'meal-2026-10-15-LUNCH', 'meal-2026-10-15-SNACK']);
  });

  test('its own switch: off, the other kinds stay; on again, it comes back', async () => {
    const { device, access } = phone();
    const reminders = await createReminders({ kv: memoryKv(), access, now: () => now, report: jest.fn() });
    await reminders.keepSchedule({ trainingDays: ['MONDAY'], usualTrainingTime: '18:00', checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' });
    await reminders.keepMealRhythm(learnRhythm(lived, now));
    await reminders.turnOn();

    await reminders.setMeals(false);
    expect(reminders.current().mealsOff).toBe(true);
    expect(meal(device.scheduled)).toEqual([]);
    expect(device.scheduled.map((r) => r.kind)).toContain('training');

    await reminders.setMeals(true);
    expect(reminders.current().mealsOff).toBeUndefined();
    expect(meal(device.scheduled)).toHaveLength(4);
  });

  test('the check-in morning alone, or no iOS permission: no meal reminder', async () => {
    const alone = phone();
    const only = await createReminders({ kv: memoryKv(), access: alone.access, now: () => now, report: jest.fn() });
    await only.keepSchedule({ trainingDays: ['MONDAY'], usualTrainingTime: '18:00', checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' });
    await only.keepMealRhythm(learnRhythm(lived, now));
    await only.turnOn({ only: 'check_in' });
    expect(meal(alone.device.scheduled)).toEqual([]);

    const refused = phone(false);
    const silent = await createReminders({ kv: memoryKv(), access: refused.access, now: () => now, report: jest.fn() });
    await silent.keepMealRhythm(learnRhythm(lived, now));
    await silent.turnOn();
    expect(refused.device.scheduled).toEqual([]);
  });

  test('forgotten with the account: the rhythm and the switch go too', async () => {
    const kv = memoryKv();
    const { access } = phone();
    const reminders = await createReminders({ kv, access, now: () => now, report: jest.fn() });
    await reminders.keepMealRhythm(learnRhythm(lived, now));
    await reminders.setMeals(false);

    await reminders.forget();

    expect([...kv.items.keys()]).toEqual([]);
    expect(reminders.current()).toEqual({ enabled: false, cue: '' });
  });

  test('reading the meals: the last two weeks are asked for, kept when read, dropped without consent, unchanged when the read fails', async () => {
    const kept = jest.fn(async () => undefined);
    const get = jest.fn(async () => ({ data: lived, response: { status: 200 } }));
    await keepMealRhythm({ GET: get } as never, { keepMealRhythm: kept }, now, 0);
    expect(get).toHaveBeenCalledWith('/v1/meals', { params: { query: { from: '2026-10-01', to: '2026-10-14' } } });
    expect(kept).toHaveBeenCalledWith(expect.objectContaining({ day: '2026-10-14' }), 0);

    kept.mockClear();
    const noConsent = jest.fn(async () => ({ data: undefined, error: { code: 'CONSENT_REQUIRED' }, response: { status: 403 } }));
    await keepMealRhythm({ GET: noConsent } as never, { keepMealRhythm: kept }, now, 0);
    expect(kept).toHaveBeenCalledWith(null, 0);

    kept.mockClear();
    const offline = jest.fn(async () => {
      throw new Error('offline');
    });
    await keepMealRhythm({ GET: offline } as never, { keepMealRhythm: kept }, now, 0);
    expect(kept).not.toHaveBeenCalled();
  });
});

function meal2(slot: LoggedMeal['slot'], daysAgo: number, hour: number): LoggedMeal {
  return meal(slot, daysAgo, hour);
}
