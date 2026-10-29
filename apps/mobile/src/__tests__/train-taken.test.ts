/**
 * Taken, in the workout (ADR-090 Ek 2, K-1064; G1 K-77): what a busy move can be done as instead (other equipment than the
 * taken one, a few, one of each kind of equipment, the ones done before first) and "Do it later" (the end of today's order).
 */
import type { components } from '@/api/schema';
import { createSessionSwaps } from '@/train/sessionSwaps';
import { orderBehind, pushBehind, takenChoices } from '@/train/taken';

type Planned = components['schemas']['PlannedExercise'];
type Equipment = components['schemas']['Equipment'];

const EQUIPMENT: Record<string, Equipment> = {
  lat_pulldown: 'CABLE',
  close_grip_lat_pulldown: 'CABLE',
  seated_row: 'CABLE',
  pull_up: 'BODYWEIGHT',
  barbell_row: 'BARBELL',
  chest_supported_row: 'MACHINE',
  one_arm_dumbbell_row: 'DUMBBELL',
  t_bar_row: 'PLATE_LOADED',
  bench_press: 'BARBELL',
};
const equipmentOf = (id: string): Equipment | undefined => EQUIPMENT[id];
const known = (id: string) => id in EQUIPMENT;

const PULLDOWN: Planned = {
  exerciseId: 'lat_pulldown',
  baseSets: 3,
  sets: 3,
  reps: { min: 8, max: 12 },
  targetRir: 1,
  swapOptions: ['pull_up', 'close_grip_lat_pulldown', 'barbell_row', 'chest_supported_row', 'one_arm_dumbbell_row', 'seated_row', 't_bar_row'],
  swapTables: [
    { exerciseId: 'pull_up' },
    { exerciseId: 'close_grip_lat_pulldown' },
    { exerciseId: 'barbell_row' },
    { exerciseId: 'chest_supported_row' },
    { exerciseId: 'one_arm_dumbbell_row', lastBestSet: { loadKg: 24, reps: 10, rir: 1 } },
    { exerciseId: 'seated_row' },
    { exerciseId: 't_bar_row' },
  ],
};
const choose = (current = 'lat_pulldown', inSession: string[] = ['lat_pulldown'], max = 3) =>
  takenChoices({ base: PULLDOWN, current, inSession: new Set(inSession), known, equipmentOf, max });

describe('what a taken move can be done as', () => {
  test('never the same equipment as the taken one: no other cable move for a taken cable machine', () => {
    const ids = choose().map((c) => c.id);
    expect(ids).not.toContain('close_grip_lat_pulldown');
    expect(ids).not.toContain('seated_row');
    expect(choose().every((c) => equipmentOf(c.id) !== 'CABLE')).toBe(true);
  });

  test('a few, one of each kind of equipment, the ones done before first, then the server order', () => {
    // Done before: one_arm_dumbbell_row (the table has its best set). Then the server's order: pull_up, barbell_row.
    expect(choose().map((c) => c.id)).toEqual(['one_arm_dumbbell_row', 'pull_up', 'barbell_row']);
    expect(choose().map((c) => c.done)).toEqual([true, false, false]);
  });

  test('at most the parameter, and none when the session has them all', () => {
    expect(choose('lat_pulldown', ['lat_pulldown'], 2)).toHaveLength(2);
    expect(choose('lat_pulldown', ['lat_pulldown', 'pull_up', 'barbell_row', 'chest_supported_row', 'one_arm_dumbbell_row', 't_bar_row'], 3)).toEqual([]);
  });

  test('two moves on the same equipment are one offer', () => {
    const twin: Planned = { ...PULLDOWN, swapOptions: ['barbell_row', 'bench_press', 'pull_up'], swapTables: undefined };
    const ids = takenChoices({ base: twin, current: 'lat_pulldown', inSession: new Set(['lat_pulldown']), known, equipmentOf, max: 3 }).map((c) => c.id);
    expect(ids).toEqual(['barbell_row', 'pull_up']);
  });

  test('a move already swapped in that is taken in turn: the planned move\'s options, not itself, not the planned move back', () => {
    const ids = choose('pull_up', ['pull_up']).map((c) => c.id);
    expect(ids).not.toContain('pull_up');
    expect(ids).not.toContain('lat_pulldown');
    // Pull-ups are bodyweight: the cable machines are back among the options.
    expect(ids.some((id) => equipmentOf(id) === 'CABLE')).toBe(true);
  });

  test('a move taken after another one that was swapped away from: the equipment of both is left out', () => {
    // The pulldown was taken, a chest-supported row stands in its place and is taken in turn: no cable (the pulldown's) and no machine.
    const ids = takenChoices({ base: PULLDOWN, current: 'chest_supported_row', inSession: new Set(['chest_supported_row']), known, equipmentOf, max: 3, taken: ['lat_pulldown'] }).map((c) => c.id);
    expect(ids).toEqual(['one_arm_dumbbell_row', 'pull_up', 'barbell_row']);
    expect(ids.map(equipmentOf)).not.toContain('CABLE');
    expect(ids.map(equipmentOf)).not.toContain('MACHINE');
  });

  test('moves the phone does not know are not offered, nor a move the session already has', () => {
    const some = takenChoices({
      base: PULLDOWN,
      current: 'lat_pulldown',
      inSession: new Set(['lat_pulldown', 'pull_up']),
      known: (id) => id !== 'barbell_row',
      equipmentOf,
      max: 3,
    });
    expect(some.map((c) => c.id)).toEqual(['one_arm_dumbbell_row', 'chest_supported_row', 't_bar_row']);
  });

  test('a taken move whose equipment the catalog does not say: nothing is left out for it', () => {
    const ids = takenChoices({
      base: PULLDOWN,
      current: 'lat_pulldown',
      inSession: new Set(['lat_pulldown']),
      known,
      equipmentOf: (id) => (id === 'lat_pulldown' ? undefined : EQUIPMENT[id]),
      max: 3,
    });
    expect(ids.map((c) => c.id)).toEqual(['one_arm_dumbbell_row', 'pull_up', 'close_grip_lat_pulldown']);
  });
});

describe('do it later', () => {
  const day = ['a', 'b', 'c', 'd'].map((exerciseId) => ({ exerciseId }));
  const key = (m: { exerciseId: string }) => m.exerciseId;

  test('the move goes to the end of today, the others keep their order', () => {
    expect(orderBehind(day, key, ['b']).map(key)).toEqual(['a', 'c', 'd', 'b']);
  });

  test('two moves put behind keep the order they were put in; one put behind twice is last', () => {
    expect(orderBehind(day, key, ['b', 'a']).map(key)).toEqual(['c', 'd', 'b', 'a']);
    expect(pushBehind(['b', 'a'], 'b')).toEqual(['a', 'b']);
  });

  test('a move that is no longer in the plan is ignored', () => {
    expect(orderBehind(day, key, ['zzz', 'a']).map(key)).toEqual(['b', 'c', 'd', 'a']);
  });
});

describe('kept with the workout', () => {
  const memory = () => {
    const items = new Map<string, string>();
    return {
      getItemAsync: async (k: string) => items.get(k) ?? null,
      setItemAsync: async (k: string, value: string) => void items.set(k, value),
      removeItemAsync: async (k: string) => void items.delete(k),
    };
  };

  test('the order and the taken moves are read back for their workout only; the swaps are as they were', async () => {
    const swaps = createSessionSwaps(memory());
    await swaps.keep('w1', { lat_pulldown: 'pull_up' }, ['lat_pulldown'], { behind: ['bench_press'], taken: ['lat_pulldown'] });
    expect(await swaps.readBehind('w1')).toEqual(['bench_press']);
    expect(await swaps.readTaken('w1')).toEqual(['lat_pulldown']);
    expect(await swaps.read('w1')).toEqual({ lat_pulldown: 'pull_up' });
    expect(await swaps.readLeft('w1')).toEqual(['lat_pulldown']);
    expect(await swaps.readBehind('w2')).toEqual([]);
    expect(await swaps.readTaken('w2')).toEqual([]);
  });

  test('an older record without them reads as none', async () => {
    const swaps = createSessionSwaps(memory());
    await swaps.keep('w1', {});
    expect(await swaps.readBehind('w1')).toEqual([]);
    expect(await swaps.readTaken('w1')).toEqual([]);
  });
});
