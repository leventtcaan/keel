/**
 * The program as the Train tab shows it (K-405, K-217): the calls of the deload ladder in force — a week off, a lighter
 * week, the weights held — and each planned move with this week's sets and the server's next target, in the user's unit.
 * Nothing is computed here: the server's numbers, in words.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { dayName, exerciseName, nextLine, programNotes, rackNote, repsLine, setsLine } from '@/train/program';
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

test("a busy week's dose: the server's numbers in words, with the weights when it keeps them; a state without one says none (K-528)", () => {
  const busy = (dose: Schemas['BusyDose']): Schemas['DeclaredState'] => ({ kind: 'BUSY', since: '2026-09-28', busyDose: dose });
  expect(programNotes(program(), busy({ sessions: 1, setsPerExercise: 1, keepLoad: true }))).toEqual([
    "A busy week: one session with one set per exercise, at your usual weights, keeps what you've built. Anything more is a bonus.",
  ]);
  expect(programNotes(program(), busy({ sessions: 2, setsPerExercise: 2, keepLoad: false }))).toEqual([
    "A busy week: 2 sessions with 2 sets per exercise keeps what you've built. Anything more is a bonus.",
  ]);
  expect(programNotes(program(), { kind: 'SICK', since: '2026-09-28' })).toEqual([]);
  // A suggestion comes after the engine's calls, and says nothing beside a week off.
  expect(programNotes(program({ loadHeldSince: '2026-09-21' }), busy({ sessions: 1, setsPerExercise: 1, keepLoad: true }))[0]).toBe(
    'Weights held since Sep 21: reach the top of the range before adding weight.',
  );
  expect(programNotes(program({ restUntil: '2026-10-04' }), busy({ sessions: 1, setsPerExercise: 1, keepLoad: true }))).toEqual([
    'A week off training, until Oct 4.',
  ]);
  expect(programNotes(program(), null)).toEqual([]);
});

test('back after a long break: the targets start a step lighter, and it says so (K-531)', () => {
  expect(programNotes(program({ backAfterBreak: true }))).toEqual([t('train.status.backAfterBreak')]);
  expect(t('train.status.backAfterBreak')).not.toMatch(/\[missing/);
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
  expect(repsLine(bench)).toBe('6-10 reps');
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

test("the server's word that the rack ends is the note (K-534); many reps alone are not", () => {
  expect(rackNote({ ...bench, nextLoadKg: 10, nextReps: 15, rackEnds: true })).toBe(t('train.rackEnds'));
  expect(t('train.rackEnds')).not.toMatch(/missing/);
  // A session held for form can be as high (K-534 review): without the server's word, nothing.
  expect(rackNote({ ...bench, nextLoadKg: 10, nextReps: 40 })).toBeNull();
  expect(rackNote(bench)).toBeNull();
});
