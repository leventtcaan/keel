/**
 * What was skipped in the open session (K-972): kept with its workout, read back only for it; what cannot be read is no
 * skip (a skip is the user's word, never made up).
 */
import { createSessionSkips } from '@/train/skips';

const memory = () => {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => void items.delete(key),
  };
};
const BENCH = { sets: [{ side: 'BOTH' as const, set: 1 }], move: false };

test('kept with its workout and read back for it; another workout has none', async () => {
  const kv = memory();
  const skips = createSessionSkips(kv);
  await skips.keep('w1', { bench_press: BENCH });
  expect(await skips.read('w1')).toEqual({ bench_press: BENCH });
  expect(await skips.read('w2')).toEqual({});
  await skips.forget();
  expect(kv.items.size).toBe(0);
});

test('what cannot be read is nothing skipped: broken JSON, another shape, a move in the wrong shape left out', async () => {
  const kv = memory();
  const skips = createSessionSkips(kv);
  kv.items.set('train.skips', '{oops');
  expect(await skips.read('w1')).toEqual({});
  kv.items.set('train.skips', JSON.stringify({ workout: 'w1', skips: 'all' }));
  expect(await skips.read('w1')).toEqual({});
  kv.items.set('train.skips', JSON.stringify({ workout: 'w1', skips: { bench_press: BENCH, squat: { sets: [{ side: 'UP', set: -1 }], move: false }, row: { move: 'yes' } } }));
  expect(await skips.read('w1')).toEqual({ bench_press: BENCH });
});
