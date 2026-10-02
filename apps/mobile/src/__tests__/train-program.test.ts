/**
 * The program as the Train tab shows it (K-405, K-217): the calls of the deload ladder in force — a week off, a lighter
 * week, the weights held — and each planned move with this week's sets and the server's next target, in the user's unit.
 * Nothing is computed here: the server's numbers, in words.
 */
import type { components } from '@/api/schema';
import { dayName, exerciseName, nextLine, programNotes, repsLine, setsLine } from '@/train/program';
import type { Move } from '@/train/trainData';

type Schemas = components['schemas'];

const program = (extra: Partial<Schemas['Program']> = {}): Schemas['Program'] => ({ id: 'p', source: 'GENERATED', days: [], ...extra });
const bench: Schemas['PlannedExercise'] = { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 };

test('no call in force, no note', () => {
  expect(programNotes(program())).toEqual([]);
});

test('a week off, a lighter week and held weights each say until or since when, in the order they matter', () => {
  const notes = programNotes(program({ restUntil: '2026-10-04', deload: { setsFactor: 0.5, until: '2026-10-11' }, loadHeldSince: '2026-09-21' }));
  expect(notes).toEqual([
    'A week off training, until Oct 4.',
    'A lighter week, until Oct 11: fewer sets, the same weights.',
    'Weights held since Sep 21: reach the top of the range before adding weight.',
  ]);
});

test("a day's name: the copy of a generated day, the user's own text for their own", () => {
  expect(dayName({ id: 'a', nameKey: 'upper_a', weekday: 'MONDAY', exercises: [] })).toBe('Upper A');
  expect(dayName({ id: 'b', name: 'Push', exercises: [] })).toBe('Push');
});

test("a move's name from the catalog's copy", () => {
  expect(exerciseName('bench_press')).toBe('Bench press');
});

test("this week's sets; a lighter week says how many of the program's", () => {
  expect(setsLine(bench)).toBe('3 sets');
  expect(setsLine({ ...bench, sets: 2 })).toBe('2 of 3 sets');
  expect(setsLine({ ...bench, baseSets: 1, sets: 1 })).toBe('1 set');
  expect(repsLine(bench)).toBe('6–10 reps');
});

test("the server's next target in the user's unit; none until there is one", () => {
  expect(nextLine({ ...bench, nextLoadKg: 62.5, nextReps: 6 }, 'METRIC', 'EXTERNAL')).toBe('Next 62.5 kg × 6');
  expect(nextLine({ ...bench, nextLoadKg: 61.23, nextReps: 6 }, 'IMPERIAL', 'EXTERNAL')).toBe('Next 135 lb × 6');
  expect(nextLine({ ...bench, nextLoadKg: 10, nextReps: 8 }, 'METRIC', 'BODYWEIGHT_PLUS_EXTERNAL')).toBe('Next +10 kg × 8');
  expect(nextLine(bench, 'METRIC', 'EXTERNAL')).toBeNull();
  // A bodyweight move has no weight to aim for: its reps.
  expect(nextLine({ ...bench, nextLoadKg: 0, nextReps: 9 }, 'METRIC', 'BODYWEIGHT')).toBe('Next 9 reps');
});

test("the user's own move by the name they gave; a move unknown everywhere by its id", () => {
  const own = new Map([['custom:1', { id: 'custom:1', nameKey: '', name: 'Landmine press' } as Move]]);
  expect(exerciseName('custom:1', own)).toBe('Landmine press');
  expect(exerciseName('bench_press', own)).toBe('Bench press');
  expect(exerciseName('custom:2', own)).toBe('custom:2');
});
