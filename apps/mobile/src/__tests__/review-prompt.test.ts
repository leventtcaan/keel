/**
 * Asking for an App Store rating (K-1254, ADR-095): only Apple's own prompt, only after a finish with a new best, and only
 * once the person has used the app — at least three finished workouts, a week since first use, two weeks since the last
 * request, and never on a day the paywall was opened. Everything it remembers stays on the phone (kv). The thresholds are
 * data/parameters/review.json's (K2).
 */
import { createReviewPrompt, reviewParams } from '@/review/reviewPrompt';
import type { KeyValue } from '@/units/preference';

function memoryKv(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    removeItemAsync: async (key) => data.delete(key),
  };
}

const DAY = 24 * 60 * 60 * 1000;
const start = new Date(2026, 10, 1, 10, 0);

async function setup() {
  const kv = memoryKv();
  let now = start;
  const ask = jest.fn(async () => {});
  const prompt = await createReviewPrompt({ kv, now: () => now, ask });
  const at = (days: number) => {
    now = new Date(start.getTime() + days * DAY);
  };
  // Three finished workouts, the last one with a new best: the usual way to be asked.
  const finish = async (id: string) => prompt.noteFinish(id);
  return { kv, ask, prompt, at, finish };
}

test('the thresholds are the parameter file\'s', () => {
  expect(reviewParams).toEqual({ minFinishedWorkouts: 3, minDaysSinceFirstUse: 7, minDaysBetweenRequests: 14, promptDelayMs: 1500, writeReviewQuery: 'action=write-review' });
});

test('used for a week, three workouts finished, a new best: Apple\'s prompt is asked for once', async () => {
  const { ask, prompt, at, finish } = await setup();
  at(8);
  for (const id of ['w1', 'w2', 'w3']) await finish(id);
  expect(await prompt.maybeAsk({ newBest: true })).toBe(true);
  expect(ask).toHaveBeenCalledTimes(1);
});

test('no new best this session: not asked', async () => {
  const { ask, prompt, at, finish } = await setup();
  at(8);
  for (const id of ['w1', 'w2', 'w3']) await finish(id);
  expect(await prompt.maybeAsk({ newBest: false })).toBe(false);
  expect(ask).not.toHaveBeenCalled();
});

test('two finished workouts are not enough; the same workout seen twice counts once', async () => {
  const { ask, prompt, at, finish } = await setup();
  at(8);
  await finish('w1');
  await finish('w2');
  await finish('w2');
  expect(await prompt.maybeAsk({ newBest: true })).toBe(false);
  await finish('w3');
  expect(await prompt.maybeAsk({ newBest: true })).toBe(true);
  expect(ask).toHaveBeenCalledTimes(1);
});

test('in the first week of use: not asked, however many workouts', async () => {
  const { ask, prompt, at, finish } = await setup();
  at(6);
  for (const id of ['w1', 'w2', 'w3', 'w4']) await finish(id);
  expect(await prompt.maybeAsk({ newBest: true })).toBe(false);
  at(7);
  expect(await prompt.maybeAsk({ newBest: true })).toBe(true);
  expect(ask).toHaveBeenCalledTimes(1);
});

test('two weeks between two requests', async () => {
  const { ask, prompt, at, finish } = await setup();
  at(8);
  for (const id of ['w1', 'w2', 'w3']) await finish(id);
  expect(await prompt.maybeAsk({ newBest: true })).toBe(true);
  at(21);
  await finish('w4');
  expect(await prompt.maybeAsk({ newBest: true })).toBe(false);
  at(22);
  expect(await prompt.maybeAsk({ newBest: true })).toBe(true);
  expect(ask).toHaveBeenCalledTimes(2);
});

test('the paywall was opened today (a purchase is made there): not asked today, asked another day', async () => {
  const { ask, prompt, at, finish } = await setup();
  at(8);
  for (const id of ['w1', 'w2', 'w3']) await finish(id);
  await prompt.notePaywall();
  expect(await prompt.maybeAsk({ newBest: true })).toBe(false);
  at(9);
  expect(await prompt.maybeAsk({ newBest: true })).toBe(true);
  expect(ask).toHaveBeenCalledTimes(1);
});

test('first use is kept across launches: a new start does not reset the week', async () => {
  const { kv, at, finish } = await setup();
  at(8);
  for (const id of ['w1', 'w2', 'w3']) await finish(id);
  const ask = jest.fn(async () => {});
  const later = await createReviewPrompt({ kv, now: () => new Date(start.getTime() + 8 * DAY), ask });
  expect(await later.maybeAsk({ newBest: true })).toBe(true);
});

test('Apple\'s prompt cannot be asked (TestFlight, Expo Go): nothing is counted as asked', async () => {
  const kv = memoryKv();
  let now = start;
  const ask = jest.fn(async () => {
    throw Object.assign(new Error('x'), { name: 'ERR_STORE_REVIEW_FAILED' });
  });
  const prompt = await createReviewPrompt({ kv, now: () => now, ask });
  now = new Date(start.getTime() + 8 * DAY);
  for (const id of ['w1', 'w2', 'w3']) await prompt.noteFinish(id);
  expect(await prompt.maybeAsk({ newBest: true })).toBe(false);
  expect(ask).toHaveBeenCalledTimes(1);
});

test('what it keeps is counts and days only: no workout content, nothing sent anywhere', async () => {
  const { kv, prompt, at, finish } = await setup();
  at(8);
  for (const id of ['w1', 'w2', 'w3']) await finish(id);
  await prompt.maybeAsk({ newBest: true });
  for (const value of kv.data.values()) expect(value).toMatch(/^(\d+|\d{4}-\d{2}-\d{2}|w\d)$/);
});

test('sign-out forgets it all: the next person starts from their own first day', async () => {
  const { kv, prompt, at, finish } = await setup();
  at(8);
  for (const id of ['w1', 'w2', 'w3']) await finish(id);
  await prompt.maybeAsk({ newBest: true });
  await prompt.forget();
  expect([...kv.data.keys()].filter((key) => key.startsWith('review.'))).toEqual([]);
});
