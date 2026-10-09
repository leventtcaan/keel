/**
 * Pause and Resume (K-972, ADR-075 #5): the session's time stops while paused and goes on from where it stopped; kept on
 * the phone with its workout, so a session closed while paused is still paused when it is opened again.
 */
import { createSessionPause, NOT_PAUSED, pausedFor, toggle } from '@/train/pause';

const memory = () => {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => void items.delete(key),
  };
};

test('the time paused: what was paused before, and the pause under way up to now', () => {
  expect(pausedFor(NOT_PAUSED, 10_000)).toBe(0);
  expect(pausedFor({ pausedAt: 4_000, pausedMs: 0 }, 10_000)).toBe(6_000);
  expect(pausedFor({ pausedAt: null, pausedMs: 7_000 }, 10_000)).toBe(7_000);
  expect(pausedFor({ pausedAt: 8_000, pausedMs: 7_000 }, 10_000)).toBe(9_000);
});

test('pausing starts a pause now; resuming adds it to what was paused before', () => {
  const paused = toggle(NOT_PAUSED, 1_000);
  expect(paused).toEqual({ pausedAt: 1_000, pausedMs: 0 });
  const resumed = toggle(paused, 61_000);
  expect(resumed).toEqual({ pausedAt: null, pausedMs: 60_000 });
  expect(toggle(resumed, 70_000)).toEqual({ pausedAt: 70_000, pausedMs: 60_000 });
});

test("kept with its workout: read back for it, nothing for another workout or nothing kept", async () => {
  const kv = memory();
  const pause = createSessionPause(kv);
  expect(await pause.read('w1')).toEqual(NOT_PAUSED);
  await pause.keep('w1', { pausedAt: 5_000, pausedMs: 1_000 });
  expect(await pause.read('w1')).toEqual({ pausedAt: 5_000, pausedMs: 1_000 });
  expect(await pause.read('w2')).toEqual(NOT_PAUSED);
  await pause.forget();
  expect(await pause.read('w1')).toEqual(NOT_PAUSED);
  expect(kv.items.size).toBe(0);
});

test('something unreadable kept is no pause', async () => {
  const kv = memory();
  kv.items.set('train.pause', '{not json');
  expect(await createSessionPause(kv).read('w1')).toEqual(NOT_PAUSED);
  kv.items.set('train.pause', JSON.stringify({ workout: 'w1', pausedAt: 'soon', pausedMs: -3 }));
  expect(await createSessionPause(kv).read('w1')).toEqual(NOT_PAUSED);
});
