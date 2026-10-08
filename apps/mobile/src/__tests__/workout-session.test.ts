/**
 * The session's words and the set it logs (K-405): a set as the user reads it in their unit, the rest time, each move's
 * place in the session, and the set body the queue sends — the row's side, a bodyweight move's 0, the RIR picked.
 */
import type { components } from '@/api/schema';
import { workoutParams } from '@/train/params';
import { buildSet, clockText, exerciseStatus, parseEntry, restText, rirChoice, setText, stepLoad, stepReps } from '@/train/session';
import type { ExercisePlan } from '@/train/workout';

type Schemas = components['schemas'];
const bench = { id: 'bench_press', unilateral: false, load: 'EXTERNAL' } as Schemas['Exercise'];
const dip = { id: 'dip', unilateral: false, load: 'BODYWEIGHT_PLUS_EXTERNAL' } as Schemas['Exercise'];
const pushUp = { id: 'push_up', unilateral: false, load: 'BODYWEIGHT' } as Schemas['Exercise'];
const row = { id: 'one_arm_dumbbell_row', unilateral: true, load: 'EXTERNAL' } as Schemas['Exercise'];

test("a set in the user's unit: a load, an added load with its plus, or the body", () => {
  expect(setText({ loadKg: 60, reps: 8 }, bench, 'METRIC')).toBe('60 kg × 8');
  expect(setText({ loadKg: 61.23, reps: 8 }, bench, 'IMPERIAL')).toBe('135 lb × 8');
  expect(setText({ loadKg: 10, reps: 6 }, dip, 'METRIC')).toBe('+10 kg × 6');
  expect(setText({ loadKg: 0, reps: 15 }, pushUp, 'METRIC')).toBe('Bodyweight × 15');
  // A weighted move done with nothing added (its warm-up, a set without the belt) is the body alone, not "+0 kg".
  expect(setText({ loadKg: 0, reps: 5 }, dip, 'IMPERIAL')).toBe('Bodyweight × 5');
});

test('rest time as minutes and seconds', () => {
  expect(restText(0)).toBe('0:00');
  expect(restText(84)).toBe('1:24');
  expect(restText(600)).toBe('10:00');
});

test("a move's place: the sets planned, the set under way, or all done", () => {
  const plan = (done: number, count = 3): ExercisePlan => ({
    exerciseId: 'bench_press',
    rows: Array.from({ length: count }, (_, i) => ({
      side: 'BOTH',
      suggested: { loadKg: 60, reps: 8 },
      last: null,
      done: i < done ? { clientId: `s${i}`, exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps: 8 } : null,
    })),
    current: done < count ? done : null,
  });
  expect(exerciseStatus(plan(0))).toBe('3 sets');
  expect(exerciseStatus(plan(1))).toBe('Set 2 of 3');
  expect(exerciseStatus(plan(3))).toBe('All sets done');
  expect(exerciseStatus(plan(0, 1))).toBe('1 set');
});

test("a one-sided move's place counts sets, not sides: its two rows are one set (K-971: the dots say it)", () => {
  const sided = (done: number): ExercisePlan => ({
    exerciseId: 'one_arm_dumbbell_row',
    rows: (['LEFT', 'RIGHT', 'LEFT', 'RIGHT'] as const).map((side, i) => ({
      side,
      suggested: { loadKg: 20, reps: 10 },
      last: null,
      done: i < done ? { clientId: `s${i}`, exerciseId: 'one_arm_dumbbell_row', setType: 'WORKING', loadKg: 20, reps: 10, side } : null,
    })),
    current: done < 4 ? done : null,
  });
  expect(exerciseStatus(sided(0))).toBe('2 sets');
  expect(exerciseStatus(sided(1))).toBe('Set 1 of 2'); // the right side of the first set
  expect(exerciseStatus(sided(2))).toBe('Set 2 of 2');
});

test("what the user typed, in kg as the server keeps it; a bodyweight move's load is always 0", () => {
  expect(parseEntry('62.5', '6', bench, 'METRIC')).toEqual({ loadKg: 62.5, reps: 6 });
  expect(parseEntry('135', '8', bench, 'IMPERIAL')).toEqual({ loadKg: 61.23, reps: 8 });
  expect(parseEntry('anything', '15', pushUp, 'METRIC')).toEqual({ loadKg: 0, reps: 15 });
  expect(parseEntry('', '6', bench, 'METRIC')).toBeNull();
  expect(parseEntry('60', '0', bench, 'METRIC')).toBeNull();
  expect(parseEntry('60', '6.5', bench, 'METRIC')).toBeNull();
  expect(parseEntry('60', '101', bench, 'METRIC')).toBeNull();
  expect(parseEntry('1001', '6', bench, 'METRIC')).toBeNull();
});

test("an untouched suggestion is logged as the server's kg, not as its rounded lb read back", () => {
  // 62.5 kg shows as 137.8 lb; 137.8 lb read back is 62.51 kg. Logged unchanged, the set is the 62.5 the server set.
  expect(parseEntry('137.8', '6', bench, 'IMPERIAL', 62.5)).toEqual({ loadKg: 62.5, reps: 6 });
  expect(parseEntry('140', '6', bench, 'IMPERIAL', 62.5)).toEqual({ loadKg: 63.5, reps: 6 });
  expect(parseEntry('62.5', '6', bench, 'METRIC', 62.5)).toEqual({ loadKg: 62.5, reps: 6 });
});

test("the set the queue sends: a working set with the row's side and the RIR picked", () => {
  expect(buildSet('c1', bench, 'BOTH', { loadKg: 60, reps: 8 }, 1)).toEqual({
    clientId: 'c1',
    exerciseId: 'bench_press',
    setType: 'WORKING',
    loadKg: 60,
    reps: 8,
    rir: 1,
    side: 'BOTH',
  });
  expect(buildSet('c2', row, 'LEFT', { loadKg: 20, reps: 12 }, 3)).toMatchObject({ side: 'LEFT', rir: 3 });
});

test('the RIR picker is 0, 1 and 2+; an older set logged as 3 or more shows as 2+ (K-960, ADR-075 #2)', () => {
  expect(workoutParams.rirChoices).toEqual([0, 1, 2]);
  expect([0, 1, 2, 3, 5].map(rirChoice)).toEqual([0, 1, 2, 2, 2]);
});

test('a set with a note keeps the words without their outer spaces; only spaces is no note (K-422)', () => {
  expect(buildSet('c3', bench, 'BOTH', { loadKg: 60, reps: 8 }, 1, '  grip slipped \n')).toMatchObject({ note: 'grip slipped' });
  expect(buildSet('c4', bench, 'BOTH', { loadKg: 60, reps: 8 }, 1, '   ')).not.toHaveProperty('note');
  expect(buildSet('c5', bench, 'BOTH', { loadKg: 60, reps: 8 }, 1)).not.toHaveProperty('note');
});

test('the session clock: minutes and seconds, and hours once past one', () => {
  expect(clockText(0)).toBe('0:00');
  expect(clockText(725)).toBe('12:05');
  expect(clockText(3600)).toBe('1:00:00');
  expect(clockText(3725)).toBe('1:02:05');
});

describe("the weight stepper's step (K-971): a pair of the smallest plates, the gym's own loads where it has them", () => {
  const barbell = { ...bench, equipment: 'BARBELL' } as Schemas['Exercise'];
  const stack = { id: 'leg_extension', unilateral: false, load: 'EXTERNAL', equipment: 'MACHINE' } as Schemas['Exercise'];
  const GYM = { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25], dumbbellsKg: [], stackStepKg: 5, machineStepsKg: {} };

  test('without a gym: the step in the user unit, never under nothing', () => {
    expect(stepLoad(62.5, 1, bench, undefined, 'METRIC')).toBe(65);
    expect(stepLoad(62.5, -1, bench, undefined, 'METRIC')).toBe(60);
    expect(stepLoad(1, -1, bench, undefined, 'METRIC')).toBe(0);
    expect(stepLoad(0, -1, bench, undefined, 'METRIC')).toBeNull();
    expect(stepLoad(null, 1, bench, undefined, 'METRIC')).toBe(workoutParams.loadStep.kg);
    expect(stepLoad(61.23, 1, bench, undefined, 'IMPERIAL')).toBe(63.5); // 135 lb and 5 lb: 140 lb
  });

  test('at the gym: within one step where it makes a load there, else the next it makes', () => {
    expect(stepLoad(100, 1, barbell, GYM, 'METRIC')).toBe(102.5);
    expect(stepLoad(100, -1, barbell, GYM, 'METRIC')).toBe(97.5);
    expect(stepLoad(50, 1, stack, GYM, 'METRIC')).toBe(55); // a 5 kg stack: nothing within 2.5
    expect(stepLoad(50, -1, stack, GYM, 'METRIC')).toBe(45);
    expect(stepLoad(null, 1, barbell, GYM, 'METRIC')).toBe(20); // nothing yet: the empty bar
    expect(stepLoad(20, -1, barbell, GYM, 'METRIC')).toBeNull(); // nothing under the bar
  });

  test('a gym that says nothing of this equipment: the plain step', () => {
    expect(stepLoad(20, 1, { ...bench, equipment: 'DUMBBELL' } as Schemas['Exercise'], GYM, 'METRIC')).toBe(22.5);
  });
});

test('the reps stepper: one at a time, from one to the most a set takes', () => {
  expect(stepReps('6', 1)).toBe(7);
  expect(stepReps('6', -1)).toBe(5);
  expect(stepReps('1', -1)).toBeNull();
  expect(stepReps('', 1)).toBe(1);
  expect(stepReps(String(workoutParams.maxReps), 1)).toBeNull();
});
