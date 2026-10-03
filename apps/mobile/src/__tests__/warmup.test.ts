/**
 * The warm-up calculator (K-417): coaching experience (G1 K-17) — at least one warm-up before each move, 3–4 before the day's first,
 * never near failure. The ramp (how heavy, how many reps) is the app's (no source gives one; data/parameters/workout.json,
 * awaiting a product decision): rounded to what the gym in use can make, else to the parameter's step.
 */
import type { components } from '@/api/schema';
import type { GymWeights } from '@/train/loadSteps';
import { warmupSets, warmups, warmupsDone } from '@/train/warmup';

type Schemas = components['schemas'];
const move = (id: string, equipment: Schemas['Equipment'], load: Schemas['Exercise']['load'] = 'EXTERNAL') =>
  ({ id, equipment, load, kind: 'COMPOUND', unilateral: false }) as Schemas['Exercise'];
const BENCH = move('bench_press', 'BARBELL');
const CURL = move('dumbbell_curl', 'DUMBBELL');
const PUSH_UP = move('push_up', 'BODYWEIGHT', 'BODYWEIGHT');
const GYM: GymWeights = { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25], dumbbellsKg: [4, 6, 8, 10, 12, 14, 16], stackStepKg: 5, machineStepsKg: {} };

test("the day's first move: three, lighter to heavier, fewer reps as they climb, each a load the gym makes", () => {
  expect(warmups(100, BENCH, true, GYM, 'METRIC')).toEqual([
    { loadKg: 50, reps: 8 },
    { loadKg: 70, reps: 5 },
    { loadKg: 85, reps: 3 },
  ]);
});

test('any other move: one', () => {
  expect(warmups(100, BENCH, false, GYM, 'METRIC')).toEqual([{ loadKg: 60, reps: 5 }]);
});

test("rounded to the gym's dumbbells", () => {
  // 60 % of 15 is 9: the 8 and the 10 are as near; a tie goes to the lighter.
  expect(warmups(15, CURL, false, GYM, 'METRIC')).toEqual([{ loadKg: 8, reps: 5 }]);
});

test('never below the bar; two warm-ups that round to the same load are one', () => {
  expect(warmups(30, BENCH, true, GYM, 'METRIC')).toEqual([
    { loadKg: 20, reps: 8 },
    { loadKg: 25, reps: 3 },
  ]);
});

test("without a gym, the parameter's step in the user's unit", () => {
  expect(warmups(100, BENCH, false, null, 'METRIC')).toEqual([{ loadKg: 60, reps: 5 }]);
  expect(warmups(83.3, BENCH, false, null, 'METRIC')).toEqual([{ loadKg: 50, reps: 5 }]);
  // 60 % of 135 lb is 81 lb → 80 lb, stored as the app stores a typed lb load.
  expect(warmups(61.23, BENCH, false, null, 'IMPERIAL')).toEqual([{ loadKg: 36.29, reps: 5 }]);
});

test("a gym that says nothing about the move's equipment: the parameter's step, as without a gym", () => {
  expect(warmups(100, move('leg_extension', 'MACHINE'), false, { ...GYM, stackStepKg: null }, 'METRIC')).toEqual([{ loadKg: 60, reps: 5 }]);
  expect(warmups(100, BENCH, false, { ...GYM, barKg: null }, 'METRIC')).toEqual([{ loadKg: 60, reps: 5 }]);
});

test('without a gym the bar is unknown: the ramp is not held above one', () => {
  expect(warmups(30, BENCH, true, null, 'METRIC')).toEqual([
    { loadKg: 15, reps: 8 },
    { loadKg: 20, reps: 5 },
    { loadKg: 25, reps: 3 },
  ]);
});

test('no lighter load than the work load in the gym: no warm-up (soru 43 — G1 K-17 asks for one)', () => {
  // 60 % of 4 kg is 2.4: the rack's lightest dumbbell is the 4.
  expect(warmups(4, CURL, false, GYM, 'METRIC')).toEqual([]);
});

test('a weighted bodyweight move warms up with the body alone even before its added load is known', () => {
  expect(warmups(null, move('dip', 'BODYWEIGHT', 'BODYWEIGHT_PLUS_EXTERNAL'), false, GYM, 'METRIC')).toEqual([{ loadKg: 0, reps: 5 }]);
});

test('a bodyweight move warms up with the body alone; no work load known, no warm-up', () => {
  expect(warmups(0, PUSH_UP, false, GYM, 'METRIC')).toEqual([{ loadKg: 0, reps: 5 }]);
  expect(warmups(0, PUSH_UP, true, GYM, 'METRIC')).toEqual([{ loadKg: 0, reps: 8 }]);
  expect(warmups(null, BENCH, true, GYM, 'METRIC')).toEqual([]);
});

test('the ramp has a load and a rep count for each warm-up the source asks for (G1 K-17: 3 first, 1 other)', () => {
  const { workoutParams } = jest.requireActual<typeof import('@/train/params')>('@/train/params');
  expect(workoutParams.warmup.first.fractions).toHaveLength(workoutParams.warmup.first.sets);
  expect(workoutParams.warmup.first.reps).toHaveLength(workoutParams.warmup.first.sets);
  expect(workoutParams.warmup.other.fractions).toHaveLength(workoutParams.warmup.other.sets);
  expect(workoutParams.warmup.other.reps).toHaveLength(workoutParams.warmup.other.sets);
  expect(workoutParams.warmup.first.sets).toBeGreaterThanOrEqual(3);
  expect(workoutParams.warmup.other.sets).toBeGreaterThanOrEqual(1);
});

describe('logging the warm-ups: one tap a warm-up, no RIR (G1 K-17: never near failure)', () => {
  const LUNGE = move('lunge', 'DUMBBELL');
  (LUNGE as { unilateral: boolean }).unilateral = true;
  const warm = (exerciseId: string, side?: Schemas['Side']): Schemas['NewSet'] => ({
    clientId: `w-${exerciseId}-${side ?? ''}`,
    exerciseId,
    setType: 'WARM_UP',
    loadKg: 10,
    reps: 5,
    ...(side === undefined ? {} : { side }),
  });
  const work: Schemas['NewSet'] = { clientId: 'k', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 100, reps: 5, rir: 1 };

  test("a warm-up is a set of its type, at its load and reps, without a RIR; a one-sided move's is both sides", () => {
    expect(warmupSets({ loadKg: 50, reps: 8 }, BENCH, [])).toEqual([{ exerciseId: 'bench_press', setType: 'WARM_UP', loadKg: 50, reps: 8 }]);
    expect(warmupSets({ loadKg: 6, reps: 5 }, LUNGE, [])).toEqual([
      { exerciseId: 'lunge', setType: 'WARM_UP', loadKg: 6, reps: 5, side: 'LEFT' },
      { exerciseId: 'lunge', setType: 'WARM_UP', loadKg: 6, reps: 5, side: 'RIGHT' },
    ]);
  });

  test("the warm-ups done are the move's own; a one-sided one is done when both sides are", () => {
    expect(warmupsDone([warm('bench_press'), warm('squat'), work], BENCH)).toBe(1);
    expect(warmupsDone([warm('lunge', 'LEFT')], LUNGE)).toBe(0);
    expect(warmupsDone([warm('lunge', 'LEFT'), warm('lunge', 'RIGHT')], LUNGE)).toBe(1);
  });

  test('a side that failed to save is the only one logged again', () => {
    expect(warmupSets({ loadKg: 6, reps: 5 }, LUNGE, [warm('lunge', 'LEFT')])).toEqual([
      { exerciseId: 'lunge', setType: 'WARM_UP', loadKg: 6, reps: 5, side: 'RIGHT' },
    ]);
  });
});
