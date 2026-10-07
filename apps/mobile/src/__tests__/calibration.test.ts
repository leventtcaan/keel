/**
 * First-session calibration on the phone (K-960, ADR-075 Ek 1): after a set with 2+ reps left on a move with no target,
 * the next set's load is the one just logged plus the server's calibrationStepKg, rounded to the gym with the shared load
 * steps (the warm-ups' path, K-417). The phone adds no rule: the step and when to offer it come from the server.
 */
import { calibrationNext } from '@/train/calibration';
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
  // Pairs of 5 only: 42.5 is not on the bar; the nearest heavier is 50.
  expect(calibrationNext(40, 2.5, gym({ barKg: 20, platesKg: [20, 10, 5] }), 'BARBELL', 'bench_press')).toBe(50);
});

test('a rack: the nearest heavier dumbbell; none past the top of the rack', () => {
  const rack = gym({ dumbbellsKg: [10, 12, 14, 16, 20] });
  expect(calibrationNext(12, 2.5, rack, 'DUMBBELL', 'dumbbell_curl')).toBe(14);
  expect(calibrationNext(16, 2.5, rack, 'DUMBBELL', 'dumbbell_curl')).toBe(20);
  expect(calibrationNext(20, 2.5, rack, 'DUMBBELL', 'dumbbell_curl')).toBeNull();
});

test("a machine by its own step; a gym that says nothing of the equipment keeps the server's step", () => {
  expect(calibrationNext(40, 2.5, gym({ machineStepsKg: { lat_pulldown: 5 } }), 'CABLE', 'lat_pulldown')).toBe(45);
  expect(calibrationNext(40, 2.5, gym({ dumbbellsKg: [10, 20] }), 'BARBELL', 'bench_press')).toBe(42.5);
});
