/**
 * The evening walk nudge (K-1216): a fifth kind of reminder, which ADR-090 fixed at four, so it is behind a parameter flag, OFF,
 * until the product owner decides. With the flag off nothing is kept and nothing is planned; on, one local notification, by date, for
 * today only, at the parameter's time, when enough steps are left at the last read.
 */
import { notificationParams as P } from '@/notifications/params';
import { planReminders, type PlanInput, type Reminder, type Schedule } from '@/notifications/plan';
import { type NotificationAccess, createReminders } from '@/notifications/reminders';

const schedule: Schedule = { trainingDays: ['MONDAY'], usualTrainingTime: '18:00', checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' };
const noon = new Date(2026, 10, 25, 12, 0);
const base: PlanInput = { schedule, cue: null, lastOpened: null, now: noon, muted: false, mutedUntil: null, restUntil: null, firstCall: 'weekly' };
const facts = { day: '2026-11-25', remaining: 4000, body: '4,000 left: Gym and back' };
const walkOf = (plan: Reminder[]) => plan.filter((r) => r.kind === 'walk');

test('the parameter flag is off, at 18:00, from 2,000 steps', () => {
  expect(P.walkNudgeEnabled).toBe(false);
  expect(P.walkNudgeTime).toBe('18:00');
  expect(P.walkNudgeMinRemaining).toBe(2000);
});

test('one nudge today at the time, carrying the line; nothing without facts', () => {
  const [nudge] = walkOf(planReminders({ ...base, walkNudge: facts }));
  expect(nudge.when).toEqual({ at: new Date(2026, 10, 25, 18, 0) });
  expect(nudge.body).toBe(facts.body);
  expect(walkOf(planReminders(base))).toEqual([]);
});

test('not when too few are left, when the time has passed, when the facts are from another day, or inside a state', () => {
  expect(walkOf(planReminders({ ...base, walkNudge: { ...facts, remaining: P.walkNudgeMinRemaining - 1 } }))).toEqual([]);
  expect(walkOf(planReminders({ ...base, now: new Date(2026, 10, 25, 18, 1), walkNudge: facts }))).toEqual([]);
  expect(walkOf(planReminders({ ...base, walkNudge: { ...facts, day: '2026-11-24' } }))).toEqual([]);
  expect(walkOf(planReminders({ ...base, muted: true, mutedUntil: '2026-11-26', walkNudge: facts }))).toEqual([]);
});

function memoryKv() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => items.delete(key),
  };
}
function device() {
  const state = { scheduled: [] as Reminder[] };
  const access: NotificationAccess = {
    permission: async () => ({ granted: true, canAskAgain: true }),
    request: async () => ({ granted: true, canAskAgain: true }),
    replace: async (reminders) => void (state.scheduled = reminders),
    clear: async () => void (state.scheduled = []),
  };
  return { state, access };
}

test('flag off (as shipped): keeping the facts changes nothing and plans nothing', async () => {
  const kv = memoryKv();
  const { state, access } = device();
  const reminders = await createReminders({ kv, access, now: () => noon, report: () => {} });
  await reminders.turnOn();
  await reminders.keepWalkNudge(facts);
  expect(walkOf(state.scheduled)).toEqual([]);
  expect([...kv.items.keys()].some((key) => key.includes('walk'))).toBe(false);
});

test('flag on: planned with the rest, replaced by the next read, gone when nothing is left; follows the reminders switch', async () => {
  const kv = memoryKv();
  const { state, access } = device();
  const reminders = await createReminders({ kv, access, now: () => noon, report: () => {}, walkNudge: true });
  await reminders.turnOn();
  await reminders.keepWalkNudge(facts);
  expect(walkOf(state.scheduled)).toHaveLength(1);
  await reminders.keepWalkNudge({ ...facts, remaining: 100 });
  expect(walkOf(state.scheduled)).toEqual([]);
  await reminders.keepWalkNudge(facts);
  await reminders.turnOff();
  expect(state.scheduled).toEqual([]);
  await reminders.forget();
  expect([...kv.items.keys()]).toEqual([]);
});
