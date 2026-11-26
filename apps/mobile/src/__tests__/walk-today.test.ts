/**
 * "Add to plan" on the coach's walk card (K-1236, ADR-092 Ek 2 #2): today's evening walk reminder alone. It is the walk nudge
 * (K-1216) for this one day, whatever the user's own switch says; the switch, the plan, the targets and the call are not touched.
 * It tells the card why it could not: the reminders are off or not allowed, the time has passed, or too few steps are left.
 */
import { notificationParams as P } from '@/notifications/params';
import type { Reminder } from '@/notifications/plan';
import { type NotificationAccess, createReminders } from '@/notifications/reminders';

const noon = new Date(2026, 10, 25, 12, 0);
const facts = { day: '2026-11-25', remaining: 4000, body: '4,000 steps left today. Gym and back is about 30 minutes of walking.' };
const walkOf = (plan: Reminder[]) => plan.filter((r) => r.kind === 'walk');

function memoryKv() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => items.delete(key),
  };
}
function device(granted = true) {
  const state = { scheduled: [] as Reminder[] };
  const access: NotificationAccess = {
    permission: async () => ({ granted, canAskAgain: true }),
    request: async () => ({ granted, canAskAgain: true }),
    replace: async (reminders) => void (state.scheduled = reminders),
    clear: async () => void (state.scheduled = []),
  };
  return { state, access };
}
async function setUp({ at = noon, on = true, granted = true, walkNudge = true } = {}) {
  const kv = memoryKv();
  const { state, access } = device(granted);
  let now = at;
  const reminders = await createReminders({ kv, access, now: () => now, report: () => {}, walkNudge });
  if (on) await reminders.turnOn();
  return { kv, state, reminders, later: (moment: Date) => void (now = moment) };
}

test("today's walk: what Today last read, for today only; none from another day, nor with the kind removed", async () => {
  const { reminders } = await setUp();
  expect(await reminders.walkToday()).toBeNull();
  await reminders.keepWalkNudge(facts);
  expect(await reminders.walkToday()).toEqual({ ...facts, at: '18:00', planned: false });
  await reminders.keepWalkNudge({ ...facts, day: '2026-11-24' });
  expect(await reminders.walkToday()).toBeNull();
  const removed = await setUp({ walkNudge: false });
  await removed.reminders.keepWalkNudge(facts);
  expect(await removed.reminders.walkToday()).toBeNull();
});

test('"Add to plan" plans the one evening walk for today, with the user switch left off', async () => {
  const { state, reminders } = await setUp();
  await reminders.keepWalkNudge(facts);
  expect(walkOf(state.scheduled)).toEqual([]);
  expect(await reminders.planWalkToday()).toBe('set');
  const [walk] = walkOf(state.scheduled);
  expect(walk.when).toEqual({ at: new Date(2026, 10, 25, 18, 0) });
  expect(walk.body).toBe(facts.body);
  expect(reminders.current().walkOn).toBeUndefined();
  expect(await reminders.walkToday()).toEqual({ ...facts, at: P.walkNudgeTime, planned: true });
});

test('it is for today only: tomorrow nothing is planned until the switch or a new "Add to plan" says so', async () => {
  const { state, reminders, later } = await setUp();
  await reminders.keepWalkNudge(facts);
  await reminders.planWalkToday();
  later(new Date(2026, 10, 26, 9, 0));
  await reminders.keepWalkNudge({ ...facts, day: '2026-11-26' });
  expect(walkOf(state.scheduled)).toEqual([]);
  expect((await reminders.walkToday())?.planned).toBe(false);
});

test.each([
  ['the reminders are off', { on: false }, 'off'],
  ['notifications are not allowed', { granted: false }, 'off'],
  ['the time has passed', { at: new Date(2026, 10, 25, 18, 0) }, 'late'],
] as const)('not planned when %s: the card is told so', async (_, options, said) => {
  const { state, reminders } = await setUp(options);
  await reminders.keepWalkNudge(facts);
  expect(await reminders.planWalkToday()).toBe(said);
  expect(walkOf(state.scheduled)).toEqual([]);
});

test('too few steps left, or nothing read today: nothing to plan', async () => {
  const { reminders } = await setUp();
  expect(await reminders.planWalkToday()).toBe('none');
  await reminders.keepWalkNudge({ ...facts, remaining: P.walkNudgeMinRemaining - 1 });
  expect(await reminders.planWalkToday()).toBe('none');
});

test('forgotten with the account', async () => {
  const { kv, reminders } = await setUp();
  await reminders.keepWalkNudge(facts);
  await reminders.planWalkToday();
  await reminders.forget();
  expect([...kv.items.keys()]).toEqual([]);
});
