/**
 * A move swapped inside the open session (K-972, ADR-073 #6, ADR-075 #5): for this workout only, never sent (the server
 * refuses a swap for today once the workout has started), kept on the phone with the workout it belongs to; what cannot
 * be read is no swap (a swap is the user's word, never made up).
 */
import type { components } from '@/api/schema';
import { applySwaps, createSessionSwaps, swapChoices, validSwaps } from '@/train/sessionSwaps';

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
    const [swapped, untouched] = applySwaps([BENCH, ROW], { bench_press: 'dumbbell_bench_press' }, () => true);
    expect(swapped).toEqual({ exerciseId: 'dumbbell_bench_press', baseSets: 3, sets: 2, reps: { min: 6, max: 10 }, targetRir: 1 });
    expect(untouched).toBe(ROW);
  });

  test('nothing swapped, or a swap of a move the day has not: the day as it is', () => {
    expect(applySwaps([BENCH, ROW], {}, () => true)).toEqual([BENCH, ROW]);
    expect(applySwaps([BENCH, ROW], { squat: 'leg_press' }, () => true)).toEqual([BENCH, ROW]);
  });
});

// K-973 (ADR-075 Ek 7, Ek 8): the server's table for each option (swapTables, the order of swapOptions) goes to the move that
// stands in: its own best set, the lighter and heavier loads, the calibration step. It still has no target to beat.
describe("the new move carries the server's table for it", () => {
  const TABLES = [
    { exerciseId: 'dumbbell_bench_press', lastBestSet: { loadKg: 30, reps: 10, rir: 1 }, lighterLoadKg: 27.5, heavierLoadKg: 32.5, calibrationStepKg: 2.5 },
    { exerciseId: 'incline_bench_press', calibrationStepKg: 2.5 },
    { exerciseId: 'push_up' },
  ];
  const WITH_TABLES = { ...BENCH, swapTables: TABLES } as Planned;

  test('the option\'s row: its best set and the loads around it, with the sets, range and aim of the planned move', () => {
    const [swapped] = applySwaps([WITH_TABLES, ROW], { bench_press: 'dumbbell_bench_press' }, () => true);
    expect(swapped).toEqual({
      exerciseId: 'dumbbell_bench_press',
      baseSets: 3,
      sets: 2,
      reps: { min: 6, max: 10 },
      targetRir: 1,
      lastBestSet: { loadKg: 30, reps: 10, rir: 1 },
      lighterLoadKg: 27.5,
      heavierLoadKg: 32.5,
      calibrationStepKg: 2.5,
    });
    expect(swapped).not.toHaveProperty('nextLoadKg');
    expect(swapped).not.toHaveProperty('nextReps');
  });

  test('each option its own row, by position', () => {
    const [swapped] = applySwaps([WITH_TABLES, ROW], { bench_press: 'incline_bench_press' }, () => true);
    expect(swapped).toEqual({ exerciseId: 'incline_bench_press', baseSets: 3, sets: 2, reps: { min: 6, max: 10 }, targetRir: 1, calibrationStepKg: 2.5 });
  });

  test("a row that is not the option's (out of step with swapOptions) is not used: the move starts bare", () => {
    const crossed = { ...BENCH, swapTables: [...TABLES].reverse() } as Planned;
    const [swapped] = applySwaps([crossed, ROW], { bench_press: 'dumbbell_bench_press' }, () => true);
    expect(swapped).toEqual({ exerciseId: 'dumbbell_bench_press', baseSets: 3, sets: 2, reps: { min: 6, max: 10 }, targetRir: 1 });
    const short = { ...BENCH, swapTables: [TABLES[0]] } as Planned;
    expect(applySwaps([short, ROW], { bench_press: 'push_up' }, () => true)[0]).toEqual({
      exerciseId: 'push_up',
      baseSets: 3,
      sets: 2,
      reps: { min: 6, max: 10 },
      targetRir: 1,
    });
  });
});

// K-973 (ADR-075 Ek 7 "Bilinen sınır", Ek 8): the moves swapped away from are kept with the swaps, under the same key, so a
// session opened again does not take them back into the superset.
describe('the moves swapped away from, kept with the swaps', () => {
  test('read back for the workout; none for another, nothing kept or what cannot be read; forgotten with the swaps', async () => {
    const kv = memory();
    const swaps = createSessionSwaps(kv);
    await swaps.keep('w1', { bench_press: 'dumbbell_bench_press' }, ['bench_press']);
    expect(await swaps.readLeft('w1')).toEqual(['bench_press']);
    expect(await swaps.read('w1')).toEqual({ bench_press: 'dumbbell_bench_press' });
    expect(await swaps.readLeft('w2')).toEqual([]);
    expect([...kv.items.keys()]).toEqual(['train.swaps']); // the same key: the data inventory does not change
    kv.items.set('train.swaps', JSON.stringify({ workout: 'w1', swaps: {}, left: ['bench_press', 3, ''] }));
    expect(await swaps.readLeft('w1')).toEqual(['bench_press']);
    kv.items.set('train.swaps', JSON.stringify({ workout: 'w1', swaps: {} }));
    expect(await swaps.readLeft('w1')).toEqual([]); // kept before this change: none left
    kv.items.set('train.swaps', '{oops');
    expect(await swaps.readLeft('w1')).toEqual([]);
    await swaps.keep('w1', {}, ['bench_press']);
    await swaps.forget();
    expect(await swaps.readLeft('w1')).toEqual([]);
  });
});

describe('a swap kept is checked against the plan again before it is applied', () => {
  const known = () => true;

  test("a move the server's list for the planned move does not hold is no swap", () => {
    expect(validSwaps([BENCH, ROW], { bench_press: 'barbell_squat' }, known)).toEqual({});
    expect(applySwaps([BENCH, ROW], { bench_press: 'barbell_squat' }, known)).toEqual([BENCH, ROW]);
    expect(validSwaps([BENCH, ROW], { bench_press: 'push_up' }, known)).toEqual({ bench_press: 'push_up' });
  });

  test('a move the phone has no catalog entry for is no swap: a set of it would be refused', () => {
    expect(validSwaps([BENCH, ROW], { bench_press: 'push_up' }, (id) => id !== 'push_up')).toEqual({});
  });

  test('a move that is another of the day\'s planned moves is no swap: it would be there twice', () => {
    const rowOptions = { ...ROW, swapOptions: ['bench_press'] };
    expect(validSwaps([BENCH, rowOptions], { barbell_row: 'bench_press' }, known)).toEqual({});
  });

  test('a move swapped for itself is no swap', () => {
    expect(validSwaps([BENCH, ROW], { bench_press: 'bench_press' }, known)).toEqual({});
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
