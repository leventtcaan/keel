/**
 * A move swapped inside the open session (K-972, ADR-073 #6, ADR-075 #5): for this workout only, never sent (the server
 * refuses a swap for today once the workout has started), kept on the phone with the workout it belongs to; what cannot
 * be read is no swap (a swap is the user's word, never made up).
 */
import type { components } from '@/api/schema';
import { applySwaps, createSessionSwaps, swapChoices } from '@/train/sessionSwaps';

type Planned = components['schemas']['PlannedExercise'];

const memory = () => {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void items.set(key, value),
    removeItemAsync: async (key: string) => void items.delete(key),
  };
};

const BENCH: Planned = {
  id: '3f6c1c6e-9a52-4d0e-8d38-0c3f2b9b7a11',
  exerciseId: 'bench_press',
  baseSets: 3,
  sets: 2,
  reps: { min: 6, max: 10 },
  targetRir: 1,
  nextLoadKg: 62.5,
  nextReps: 6,
  lighterLoadKg: 60,
  heavierLoadKg: 65,
  calibrationStepKg: 2.5,
  lastBestSet: { loadKg: 60, reps: 8, rir: 1 },
  nextLoadAtTopKg: 65,
  rackEnds: true,
  swapOptions: ['dumbbell_bench_press', 'incline_bench_press', 'push_up'],
};
const ROW: Planned = { exerciseId: 'barbell_row', baseSets: 3, sets: 3, reps: { min: 8, max: 12 }, targetRir: 1, swapOptions: [] };

describe('kept with its workout', () => {
  test('read back for it; another workout has none; forgotten', async () => {
    const kv = memory();
    const swaps = createSessionSwaps(kv);
    await swaps.keep('w1', { bench_press: 'dumbbell_bench_press' });
    expect(await swaps.read('w1')).toEqual({ bench_press: 'dumbbell_bench_press' });
    expect(await swaps.read('w2')).toEqual({});
    expect(kv.items.has('train.swaps')).toBe(true);
    await swaps.forget();
    expect(kv.items.size).toBe(0);
    expect(await swaps.read('w1')).toEqual({});
  });

  test('what cannot be read is nothing swapped: broken JSON, another shape, an entry in the wrong shape left out', async () => {
    const kv = memory();
    const swaps = createSessionSwaps(kv);
    kv.items.set('train.swaps', '{oops');
    expect(await swaps.read('w1')).toEqual({});
    kv.items.set('train.swaps', JSON.stringify({ workout: 'w1', swaps: 'all' }));
    expect(await swaps.read('w1')).toEqual({});
    kv.items.set('train.swaps', JSON.stringify({ workout: 'w1', swaps: { bench_press: 'dumbbell_bench_press', squat: 3, row: '' } }));
    expect(await swaps.read('w1')).toEqual({ bench_press: 'dumbbell_bench_press' });
  });
});

describe("the session's moves with the swaps applied", () => {
  test('a swapped move is the new move on the planned one: same sets, range and aim, and no target of its own', () => {
    const [swapped, untouched] = applySwaps([BENCH, ROW], { bench_press: 'dumbbell_bench_press' });
    expect(swapped).toEqual({ exerciseId: 'dumbbell_bench_press', baseSets: 3, sets: 2, reps: { min: 6, max: 10 }, targetRir: 1 });
    expect(untouched).toBe(ROW);
  });

  test('nothing swapped, or a swap of a move the day has not: the day as it is', () => {
    expect(applySwaps([BENCH, ROW], {})).toEqual([BENCH, ROW]);
    expect(applySwaps([BENCH, ROW], { squat: 'leg_press' })).toEqual([BENCH, ROW]);
  });
});

describe('what a move can be swapped for', () => {
  const known = () => true;

  test("the server's options for the planned move, not the ones the session already has", () => {
    expect(swapChoices(BENCH, 'bench_press', new Set(['bench_press', 'barbell_row', 'incline_bench_press']), known)).toEqual([
      'dumbbell_bench_press',
      'push_up',
    ]);
  });

  test('swapped already: the planned move first (back), the move it is now left out, the session still excluded', () => {
    expect(swapChoices(BENCH, 'dumbbell_bench_press', new Set(['dumbbell_bench_press', 'bench_press', 'barbell_row']), known)).toEqual([
      'bench_press',
      'incline_bench_press',
      'push_up',
    ]);
  });

  test('a move the phone has no catalog entry for is not offered: a set of it would be refused', () => {
    expect(swapChoices(BENCH, 'bench_press', new Set(['bench_press']), (id) => id !== 'push_up')).toEqual(['dumbbell_bench_press', 'incline_bench_press']);
  });

  test("a move with no options (the user's own) offers none", () => {
    expect(swapChoices(ROW, 'barbell_row', new Set(['barbell_row']), known)).toEqual([]);
  });
});
