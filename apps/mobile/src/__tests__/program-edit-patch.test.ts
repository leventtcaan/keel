/**
 * The program edited in place (K-970 Edit › Days, Moves; PATCH /v1/program, K-995, ADR-073 Ek 7): the editor's days from
 * the program as the server sent it, each day and move with its id, and the edit sent back by those ids, so a move kept
 * keeps its row and next target. A day or move added has no id; a day's name is sent only when the user renamed it (a
 * generated day keeps its key otherwise). Which moves lose their target (another rep range: it was for the old one) is
 * said before saving, as the server will do it.
 */
import type { components } from '@/api/schema';
import { draftFits, editedDays, programEditOf, stepped, targetsLost, withMove, withMoveAt, withWeekday, withoutDay, withoutMove } from '@/train/programEdit';
import type { Move } from '@/train/trainData';

type Schemas = components['schemas'];

const planned = (id: string, exerciseId: string, extra: Partial<Schemas['PlannedExercise']> = {}): Schemas['PlannedExercise'] => ({
  id,
  exerciseId,
  baseSets: 3,
  sets: 3,
  reps: { min: 6, max: 10 },
  targetRir: 1,
  ...extra,
});
const PROGRAM: Schemas['Program'] = {
  id: 'p',
  source: 'GENERATED',
  days: [
    { id: 'd1', nameKey: 'programDays.upper.name', weekday: 'MONDAY', exercises: [planned('r1', 'bench_press', { nextLoadKg: 80, nextReps: 8 }), planned('r2', 'lat_pulldown')] },
    { id: 'd2', name: 'Legs', exercises: [planned('r3', 'squat', { sets: 2, baseSets: 3 })] },
  ],
};
const ROW: Move = { id: 'seated_row', nameKey: 'exercises.seated_row.name', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'CABLE', unilateral: false, setupFields: [] } as Move;

test("the editor's days are the program's, by their ids and names; a move's sets are the program's (not this week's lighter ones)", () => {
  expect(editedDays(PROGRAM)).toEqual([
    { id: 'd1', name: 'Upper', weekday: 'MONDAY', moves: [
      { rowId: 'r1', exerciseId: 'bench_press', sets: 3, reps: { min: 6, max: 10 } },
      { rowId: 'r2', exerciseId: 'lat_pulldown', sets: 3, reps: { min: 6, max: 10 } },
    ] },
    { id: 'd2', name: 'Legs', moves: [{ rowId: 'r3', exerciseId: 'squat', sets: 3, reps: { min: 6, max: 10 } }] },
  ]);
});

test('nothing changed: the edit names every day and move by its id, and no name', () => {
  expect(programEditOf(editedDays(PROGRAM), PROGRAM)).toEqual({
    days: [
      { id: 'd1', weekday: 'MONDAY', exercises: [
        { id: 'r1', exerciseId: 'bench_press', sets: 3, reps: { min: 6, max: 10 } },
        { id: 'r2', exerciseId: 'lat_pulldown', sets: 3, reps: { min: 6, max: 10 } },
      ] },
      { id: 'd2', exercises: [{ id: 'r3', exerciseId: 'squat', sets: 3, reps: { min: 6, max: 10 } }] },
    ],
  });
});

test('a move added, a day renamed and moved to another weekday, a new day: the new without ids, the renamed with its name', () => {
  let days = editedDays(PROGRAM);
  days = withMove(days, 0, ROW);
  days = withWeekday(days, 0, 'TUESDAY');
  days = [...days.slice(0, 1), { ...days[1], name: 'Leg day' }, { id: 'day-9', name: 'Arms', moves: [{ exerciseId: 'barbell_curl', sets: 3, reps: { min: 8, max: 12 } }] }];
  const edit = programEditOf(days, PROGRAM);
  expect(edit?.days[0]).toEqual({
    id: 'd1',
    weekday: 'TUESDAY',
    exercises: [
      { id: 'r1', exerciseId: 'bench_press', sets: 3, reps: { min: 6, max: 10 } },
      { id: 'r2', exerciseId: 'lat_pulldown', sets: 3, reps: { min: 6, max: 10 } },
      { exerciseId: 'seated_row', sets: 3, reps: { min: 6, max: 10 } },
    ],
  });
  expect(edit?.days[1]).toEqual({ id: 'd2', name: 'Leg day', exercises: [{ id: 'r3', exerciseId: 'squat', sets: 3, reps: { min: 6, max: 10 } }] });
  expect(edit?.days[2]).toEqual({ name: 'Arms', exercises: [{ exerciseId: 'barbell_curl', sets: 3, reps: { min: 8, max: 12 } }] });
});

test('a day without a move, or without a name, sends nothing', () => {
  const days = editedDays(PROGRAM);
  expect(programEditOf([{ ...days[0], moves: [] }, days[1]], PROGRAM)).toBeNull();
  expect(programEditOf([days[0], { ...days[1], name: '  ' }], PROGRAM)).toBeNull();
});

test('the moves whose target goes: kept with another rep range, and it had one; other sets keep it', () => {
  let days = editedDays(PROGRAM);
  expect(targetsLost(days, PROGRAM)).toEqual([]);
  days = stepped(days, 0, 0, 'sets', 1);
  expect(targetsLost(days, PROGRAM)).toEqual([]);
  days = stepped(days, 0, 0, 'max', 1);
  expect(targetsLost(days, PROGRAM)).toEqual(['bench_press']);
  // A move without a target loses none.
  expect(targetsLost(stepped(editedDays(PROGRAM), 0, 1, 'max', 1), PROGRAM)).toEqual([]);
});

test('a move named once however many rows lose their target', () => {
  const twice: Schemas['Program'] = {
    ...PROGRAM,
    days: [PROGRAM.days[0], { id: 'd3', name: 'Chest', exercises: [planned('r4', 'bench_press', { nextLoadKg: 70, nextReps: 8 })] }],
  };
  let days = editedDays(twice);
  days = stepped(days, 0, 0, 'max', 1);
  days = stepped(days, 1, 0, 'max', 1);
  expect(targetsLost(days, twice)).toEqual(['bench_press']);
});

test('a move taken out and added again is a new row: the target it had goes, and it is said', () => {
  let days = editedDays(PROGRAM);
  days = withoutMove(days, 0, 0);
  // Taken out and not added again: the user took it out, nothing to say.
  expect(targetsLost(days, PROGRAM)).toEqual([]);
  days = withMove(days, 0, { ...ROW, id: 'bench_press' });
  expect(targetsLost(days, PROGRAM)).toEqual(['bench_press']);
  // Put back by Undo (its own row again): nothing is lost.
  const put = withMoveAt(withoutMove(editedDays(PROGRAM), 0, 0), 'd1', editedDays(PROGRAM)[0].moves[0], 0);
  expect(targetsLost(put, PROGRAM)).toEqual([]);
});

test('the same move added in another day while its own row stays: its target stays, nothing to say', () => {
  const days = withMove(editedDays(PROGRAM), 1, { ...ROW, id: 'bench_press' });
  expect(targetsLost(days, PROGRAM)).toEqual([]);
});

test('a move without a target, taken out and added again: nothing to say', () => {
  let days = withoutMove(editedDays(PROGRAM), 0, 1);
  days = withMove(days, 0, { ...ROW, id: 'lat_pulldown' });
  expect(targetsLost(days, PROGRAM)).toEqual([]);
});

describe('whether an edit still fits the program the server has now (409)', () => {
  test('every day and row the draft kept from the old program is there: it fits', () => {
    expect(draftFits(editedDays(PROGRAM), PROGRAM, PROGRAM)).toBe(true);
    // Changed meanwhile, but the same days and rows.
    const sets = { ...PROGRAM, days: PROGRAM.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e, sets: 2 })) })) };
    expect(draftFits(editedDays(PROGRAM), PROGRAM, sets)).toBe(true);
  });

  test('a day of the old program gone, or a row gone: it does not', () => {
    expect(draftFits(editedDays(PROGRAM), PROGRAM, { ...PROGRAM, days: [PROGRAM.days[0]] })).toBe(false);
    const fewer = { ...PROGRAM, days: [{ ...PROGRAM.days[0], exercises: [PROGRAM.days[0].exercises[0]] }, PROGRAM.days[1]] };
    expect(draftFits(editedDays(PROGRAM), PROGRAM, fewer)).toBe(false);
  });

  test('a day or move the user added has no id in the program, and needs none', () => {
    const days = [...editedDays(PROGRAM), { id: 'day-9', name: 'Arms', moves: [{ exerciseId: 'barbell_curl', sets: 3, reps: { min: 8, max: 12 } }] }];
    expect(draftFits(days, PROGRAM, PROGRAM)).toBe(true);
  });

  test('a day or a row the user took out does not have to be there', () => {
    expect(draftFits(withoutDay(editedDays(PROGRAM), 1), PROGRAM, { ...PROGRAM, days: [PROGRAM.days[0]] })).toBe(true);
  });
});

test('a weekday moved and back, a name with a space, a step and back: the same edit as the program', () => {
  const base = programEditOf(editedDays(PROGRAM), PROGRAM);
  let days = withWeekday(editedDays(PROGRAM), 0, 'TUESDAY');
  days = withWeekday(days, 0, 'MONDAY');
  days = [{ ...days[0], name: 'Upper ' }, days[1]];
  days = stepped(stepped(days, 0, 0, 'sets', 1), 0, 0, 'sets', -1);
  expect(JSON.stringify(programEditOf(days, PROGRAM))).toBe(JSON.stringify(base));
});
