/**
 * The starting weights (ADR-072 #5, K-967): three moves, each a stepper that starts unset; the first step up sets an empty
 * bar, each step after it a pair of the smallest plates (onboarding.json › starting_weight_stepper), in the user's unit.
 * A move left unset is skipped. What goes to the server is each weight set for a move the built program has, in kg.
 */
import type { components } from '@/api/schema';
import { onboardingParams } from '@/onboarding/params';
import { stepWeight, weightsToSend } from '@/onboarding/weights';

type Program = components['schemas']['Program'];

const S = onboardingParams.startingWeightStepper;
const KG_PER_LB = 0.45359237;

describe('the stepper', () => {
  test('unset, the first step up is an empty bar; a step down does nothing', () => {
    expect(stepWeight(undefined, 1, 'METRIC')).toBe(S.start_kg);
    expect(stepWeight(undefined, -1, 'METRIC')).toBeUndefined();
  });

  test('then each step is a pair of the smallest plates, up and down', () => {
    expect(stepWeight(S.start_kg, 1, 'METRIC')).toBe(S.start_kg + S.step_kg);
    expect(stepWeight(S.start_kg + S.step_kg, -1, 'METRIC')).toBe(S.start_kg);
  });

  test('down from the empty bar: unset again (skipped), never a load under the bar', () => {
    expect(stepWeight(S.start_kg, -1, 'METRIC')).toBeUndefined();
    expect(stepWeight(stepWeight(undefined, 1, 'IMPERIAL'), -1, 'IMPERIAL')).toBeUndefined();
  });

  test('in lb: the bar and the steps are pounds, kept in kg as the server keeps it (2 decimals)', () => {
    const bar = stepWeight(undefined, 1, 'IMPERIAL')!;
    expect(bar).toBeCloseTo(S.start_lb * KG_PER_LB, 2);
    const next = stepWeight(bar, 1, 'IMPERIAL')!;
    expect(next).toBeCloseTo((S.start_lb + S.step_lb) * KG_PER_LB, 2);
    expect(Number.isInteger(Math.round(next * 100))).toBe(true);
  });
});

describe('what goes to the server', () => {
  const day = (ids: string[]): Program['days'][number] => ({
    id: crypto.randomUUID(),
    exercises: ids.map((exerciseId) => ({ exerciseId, baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 2 })),
  });
  const program = (ids: string[][]): Program => ({ id: crypto.randomUUID(), source: 'GENERATED', days: ids.map(day) });

  test('each weight set, in kg; a move left unset is not sent', () => {
    expect(weightsToSend({ squat: 100, bench_press: 80 }, program([['squat', 'lat_pulldown'], ['bench_press']]))).toEqual([
      { exerciseId: 'squat', kg: 100 },
      { exerciseId: 'bench_press', kg: 80 },
    ]);
  });

  test('a move the program does not have is left out: the server would refuse the whole list', () => {
    expect(weightsToSend({ squat: 100, romanian_deadlift: 90 }, program([['squat']]))).toEqual([{ exerciseId: 'squat', kg: 100 }]);
  });

  test('none set: nothing to send', () => {
    expect(weightsToSend({}, program([['squat']]))).toEqual([]);
  });
});
