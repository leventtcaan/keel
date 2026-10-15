/**
 * The weights "Ease back in" names (K-981, prototype #return): the server's own targets, said for the first two loaded
 * compound moves of the program. The phone works out no weight: it reads `nextLoadKg`, which the server already shows a
 * step lighter after a long break (`Program.backAfterBreak`, K-531).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { easeExamples } from '@/return/examples';
import type { Move } from '@/train/trainData';

type Schemas = components['schemas'];

const planned = (exerciseId: string, nextLoadKg?: number): Schemas['PlannedExercise'] => ({
  exerciseId,
  baseSets: 3,
  sets: 3,
  reps: { min: 6, max: 10 },
  targetRir: 1,
  ...(nextLoadKg === undefined ? {} : { nextLoadKg }),
});
const move = (id: string, kind: Move['kind'], load: Move['load'] = 'EXTERNAL'): Move => ({
  id,
  nameKey: `exercises.${id}.name`,
  kind,
  muscles: [],
  alternatives: [],
  load,
  equipment: 'BARBELL',
  unilateral: false,
  setupFields: [],
});
const MOVES = new Map<string, Move>([
  ['squat', move('squat', 'COMPOUND')],
  ['bench_press', move('bench_press', 'COMPOUND')],
  ['deadlift', move('deadlift', 'COMPOUND')],
  ['lateral_raise', move('lateral_raise', 'ISOLATION')],
  ['pull_up', move('pull_up', 'COMPOUND', 'BODYWEIGHT')],
]);
const program = (exercises: Schemas['PlannedExercise'][][], backAfterBreak = true): Schemas['Program'] => ({
  id: 'p',
  source: 'GENERATED',
  ...(backAfterBreak ? { backAfterBreak } : {}),
  days: exercises.map((list, i) => ({ id: `d${i}`, nameKey: 'programDays.upper_a.name', weekday: 'MONDAY', exercises: list })),
});

test('the first two loaded compound moves, in the program order, with the server\'s targets', () => {
  const p = program([[planned('lateral_raise', 8), planned('squat', 95), planned('bench_press', 70), planned('deadlift', 120)]]);
  expect(easeExamples(p, MOVES, 'METRIC')).toBe(
    `${t('exercises.squat.name')} ${t('units.kg', { value: 95 })}, ${t('exercises.bench_press.name')} ${t('units.kg', { value: 70 })}`,
  );
});

test('in the unit the user keeps', () => {
  const p = program([[planned('squat', 100)]]);
  expect(easeExamples(p, MOVES, 'IMPERIAL')).toContain(t('units.lb', { value: 220.5 }));
});

test('a move without a target yet, or without a weight to name, is passed over; one move is enough', () => {
  const p = program([[planned('pull_up', 5), planned('squat'), planned('bench_press', 70)]]);
  expect(easeExamples(p, MOVES, 'METRIC')).toBe(`${t('exercises.bench_press.name')} ${t('units.kg', { value: 70 })}`);
});

test('the same move on two days is named once', () => {
  const p = program([[planned('squat', 95)], [planned('squat', 95), planned('bench_press', 70)]]);
  expect(easeExamples(p, MOVES, 'METRIC')?.split(', ')).toHaveLength(2);
});

test('nothing to name: no line, never a made-up weight', () => {
  expect(easeExamples(program([[planned('lateral_raise', 8)]]), MOVES, 'METRIC')).toBeNull();
  expect(easeExamples(program([[planned('squat')]]), MOVES, 'METRIC')).toBeNull();
});

test('only where the program shows the lighter targets (backAfterBreak): otherwise its targets are not a step lighter', () => {
  expect(easeExamples(program([[planned('squat', 95)]], false), MOVES, 'METRIC')).toBeNull();
});
