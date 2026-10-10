/**
 * First-session calibration on the phone (K-960, ADR-075 Ek 1): after a set with 2+ reps left on a move with no target,
 * the next set's load is the one just logged plus the server's calibrationStepKg, rounded to the gym with the shared load
 * steps (the warm-ups' path, K-417). The phone adds no rule: the step and when to offer it come from the server.
 */
import type { components } from '@/api/schema';
import { calibrationNext, calibrationRead, lighterOffer } from '@/train/calibration';
import type { GymWeights } from '@/train/loadSteps';

const gym = (g: Partial<GymWeights>): GymWeights => ({
  barKg: null,
  platesKg: [],
  dumbbellsKg: [],
  stackStepKg: null,
  machineStepsKg: {},
  ...g,
});

test('without a gym the next set is the load logged plus the step', () => {
  expect(calibrationNext(40, 2.5, null, 'BARBELL', 'bench_press')).toBe(42.5);
  expect(calibrationNext(100, 5, null, 'BARBELL', 'squat')).toBe(105);
});

test('a barbell: the nearest load the plates make', () => {
  const plates = gym({ barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25] });
  expect(calibrationNext(40, 2.5, plates, 'BARBELL', 'bench_press')).toBe(42.5);
});

test('a rack: the nearest heavier dumbbell within a step; none past the top of the rack', () => {
  const rack = gym({ dumbbellsKg: [10, 12, 14, 16, 20] });
  expect(calibrationNext(12, 2.5, rack, 'DUMBBELL', 'dumbbell_curl')).toBe(14);
  expect(calibrationNext(20, 2.5, rack, 'DUMBBELL', 'dumbbell_curl')).toBeNull();
});

test("never more than one step away, as the server's heavierLoadKg: a sparse rack (16 → 20, step 2.5) offers nothing", () => {
  expect(calibrationNext(16, 2.5, gym({ dumbbellsKg: [10, 12, 14, 16, 20] }), 'DUMBBELL', 'dumbbell_curl')).toBeNull();
  // The heaviest inside the step, as the server's within: 10, 11, 13 on a 2.5 step from 10 is 11 (13 is nearer 12.5, but past it).
  expect(calibrationNext(10, 2.5, gym({ dumbbellsKg: [10, 11, 13] }), 'DUMBBELL', 'dumbbell_curl')).toBe(11);
  // Pairs of 5 only: the bar goes 40 → 50, four steps of 2.5.
  expect(calibrationNext(40, 2.5, gym({ barKg: 20, platesKg: [20, 10, 5] }), 'BARBELL', 'bench_press')).toBeNull();
  // A lower-body step of 5 is one pair of 2.5s: within the step.
  expect(calibrationNext(60, 5, gym({ barKg: 20, platesKg: [20, 10, 5, 2.5] }), 'BARBELL', 'squat')).toBe(65);
});

test("a machine by its own step; a gym that says nothing of the equipment keeps the server's step", () => {
  expect(calibrationNext(40, 5, gym({ machineStepsKg: { leg_extension: 5 } }), 'MACHINE', 'leg_extension')).toBe(45);
  // A stack by 5 on an upper-body step of 2.5: nothing within the step, as the server's table says.
  expect(calibrationNext(40, 2.5, gym({ machineStepsKg: { lat_pulldown: 5 } }), 'CABLE', 'lat_pulldown')).toBeNull();
  expect(calibrationNext(40, 2.5, gym({ dumbbellsKg: [10, 20] }), 'BARBELL', 'bench_press')).toBe(42.5);
});

// K-973 (ADR-075 #3, Ek 1, Ek 8): what the first sets of a move with no target say. The phone only picks: a set with 2+ reps
// left and a heavier load the gym makes within the server's step offers it; anything else in range says the weight is found.
describe('the first session of a move: the weight found, or a heavier one offered', () => {
  const NO_TARGET: components['schemas']['PlannedExercise'] = {
    exerciseId: 'bench_press',
    baseSets: 3,
    sets: 3,
    reps: { min: 6, max: 10 },
    targetRir: 1,
    calibrationStepKg: 2.5,
  };
  const BENCH = { id: 'bench_press', load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false } as components['schemas']['Exercise'];
  const done = (loadKg: number, reps: number, rir: number): components['schemas']['NewSet'] => ({
    clientId: 'c',
    exerciseId: 'bench_press',
    setType: 'WORKING',
    loadKg,
    reps,
    rir,
  });

  test('2+ reps left: the next set offered one step heavier, as the gym makes it', () => {
    expect(calibrationRead(NO_TARGET, BENCH, null, done(40, 8, 2), false)).toEqual({ kind: 'light', nextKg: 42.5 });
    const rack = gym({ barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25] });
    expect(calibrationRead(NO_TARGET, BENCH, rack, done(40, 8, 2), false)).toEqual({ kind: 'light', nextKg: 42.5 });
  });

  test('0 or 1 reps left: the weight is found', () => {
    expect(calibrationRead(NO_TARGET, BENCH, null, done(40, 8, 1), false)).toEqual({ kind: 'found', kg: 40 });
    expect(calibrationRead(NO_TARGET, BENCH, null, done(40, 6, 0), false)).toEqual({ kind: 'found', kg: 40 });
  });

  test('2+ left but the gym makes nothing heavier inside the step: found, no offer', () => {
    expect(calibrationRead(NO_TARGET, BENCH, gym({ barKg: 20, platesKg: [20, 10, 5] }), done(40, 8, 2), false)).toEqual({ kind: 'found', kg: 40 });
  });

  test('no calibration step from the server: nothing to offer, found', () => {
    const { calibrationStepKg: _step, ...noStep } = NO_TARGET;
    expect(calibrationRead(noStep, BENCH, null, done(40, 8, 2), false)).toEqual({ kind: 'found', kg: 40 });
  });

  test('a move with a target is not calibrated: no word, whatever the reps left', () => {
    expect(calibrationRead({ ...NO_TARGET, nextLoadKg: 62.5 }, BENCH, null, done(62.5, 8, 2), false)).toBeNull();
  });

  test("reps under the range's bottom find nothing yet; no set, nothing", () => {
    expect(calibrationRead(NO_TARGET, BENCH, null, done(40, 5, 1), false)).toBeNull();
    expect(calibrationRead(NO_TARGET, BENCH, null, null, false)).toBeNull();
  });

  test('the bodyweight alone has no weight to find', () => {
    expect(calibrationRead(NO_TARGET, { ...BENCH, load: 'BODYWEIGHT' }, null, done(0, 8, 1), false)).toBeNull();
  });

  // The server sends a calibration step with every move that has no target, an isolation move at each session; the first
  // session is the calibration (ADR-075 Ek 8), a move done before already has its weight.
  test('a move with a history is past its calibration: no word, whatever the reps left', () => {
    expect(calibrationRead(NO_TARGET, BENCH, null, done(40, 8, 1), true)).toBeNull();
    expect(calibrationRead(NO_TARGET, BENCH, null, done(40, 8, 2), true)).toBeNull();
  });

  test('an added load of 0 is the body alone, not a weight found; heavier is still offered', () => {
    const vest = { ...BENCH, load: 'BODYWEIGHT_PLUS_EXTERNAL' } as components['schemas']['Exercise'];
    expect(calibrationRead(NO_TARGET, vest, null, done(0, 8, 1), false)).toBeNull();
    expect(calibrationRead(NO_TARGET, vest, null, done(0, 8, 2), false)).toEqual({ kind: 'light', nextKg: 2.5 });
    expect(calibrationRead(NO_TARGET, vest, null, done(10, 8, 1), false)).toEqual({ kind: 'found', kg: 10 });
  });

  test('"Too heavy?": the server\'s lighter load, only when it is lighter than the one shown', () => {
    const table = { ...NO_TARGET, lighterLoadKg: 60 };
    expect(lighterOffer(table, 62.5)).toBe(60);
    expect(lighterOffer(table, 60)).toBeNull();
    expect(lighterOffer(table, 57.5)).toBeNull();
    expect(lighterOffer(table, null)).toBeNull();
    expect(lighterOffer(NO_TARGET, 62.5)).toBeNull(); // the server had none (the bottom of the rack, no load to start from)
  });
});
