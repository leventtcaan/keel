/**
 * The program editor's rules (K-968 "Type it in", reused by K-970's Edit): days, their weekday once each, moves with sets
 * and a rep range, always within what the contract's OwnProgram takes (workout.json mirrors its limits). An own move the
 * user makes waits as a pending move until the program is sent (ADR-073 Ek 2). Pure: the editor component and the tests
 * share it.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import {
  type EditedDay,
  isPending,
  newDay,
  ownProgramOf,
  pendingMove,
  renamed,
  stepped,
  weekdayTaken,
  withDayAt,
  withMove,
  withMoveAt,
  withoutDay,
  withoutMove,
  withWeekday,
} from '@/train/programEdit';
import { workoutParams } from '@/train/params';
import type { Move } from '@/train/trainData';

type Schemas = components['schemas'];

const move = (id: string, kind: Schemas['Exercise']['kind'] = 'COMPOUND'): Move => ({
  id,
  nameKey: `exercises.${id}.name`,
  kind,
  muscles: [],
  alternatives: [],
  load: 'EXTERNAL',
  equipment: 'BARBELL',
  unilateral: false,
  setupFields: [],
});
const SQUAT = move('squat');
const CURL = move('barbell_curl', 'ISOLATION');
const start = newDay([]);
const oneMove = withMove(start, 0, SQUAT);
const { programNewMoveSets: SETS, programNewMoveReps: REPS } = workoutParams;

describe('days', () => {
  test('a new day is named by its place, without a weekday or a move, with an id of its own', () => {
    expect(start).toEqual([{ id: expect.any(String), name: t('programEditor.defaultName', { number: 1 }), moves: [] }]);
    const two = newDay(start);
    expect(two[1].name).toBe(t('programEditor.defaultName', { number: 2 }));
    expect(two[1].id).not.toBe(two[0].id);
  });

  test("no more days than the contract's program has", () => {
    let days: EditedDay[] = [];
    for (let i = 0; i < workoutParams.programDaysMax + 2; i++) days = newDay(days);
    expect(days).toHaveLength(workoutParams.programDaysMax);
  });

  test('a day removed, the others stay as they were, their ids too', () => {
    const two = renamed(newDay(start), 1, 'Pull');
    expect(withoutDay(two, 0)).toEqual([two[1]]);
  });

  test("a weekday is one day's: taken by another, it cannot be chosen; chosen again, it is cleared", () => {
    const two = withWeekday(newDay(start), 0, 'MONDAY');
    expect(weekdayTaken(two, 1, 'MONDAY')).toBe(true);
    expect(weekdayTaken(two, 0, 'MONDAY')).toBe(false);
    expect(withWeekday(two, 1, 'MONDAY')).toBe(two);
    expect(withWeekday(two, 0, undefined)[0]).toEqual({ id: two[0].id, name: two[0].name, moves: [] });
  });
});

describe('moves', () => {
  test('a move comes in with the sets and the rep range of its kind it starts from (workout.json)', () => {
    expect(oneMove[0].moves).toEqual([{ exerciseId: 'squat', sets: SETS, reps: REPS.COMPOUND }]);
    expect(withMove(oneMove, 0, CURL)[0].moves[1]).toEqual({ exerciseId: 'barbell_curl', sets: SETS, reps: REPS.ISOLATION });
  });

  test('those starting points are a range the contract and the review take', () => {
    for (const reps of Object.values(REPS)) expect(reps.max).toBeGreaterThan(reps.min);
    expect(SETS).toBeGreaterThanOrEqual(1);
    expect(SETS).toBeLessThanOrEqual(workoutParams.programMoveSetsMax);
  });

  test("no more moves on a day than the contract's, and a move the day has is not added again", () => {
    let days = start;
    for (let i = 0; i < workoutParams.programDayMovesMax + 2; i++) days = withMove(days, 0, move(`m${i}`));
    expect(days[0].moves).toHaveLength(workoutParams.programDayMovesMax);
    expect(withMove(oneMove, 0, SQUAT)).toBe(oneMove);
  });

  test('a move removed, the others keep their numbers', () => {
    const two = stepped(withMove(oneMove, 0, CURL), 0, 1, 'sets', 1);
    expect(withoutMove(two, 0, 0)[0].moves).toEqual([{ exerciseId: 'barbell_curl', sets: SETS + 1, reps: REPS.ISOLATION }]);
  });

  test('sets step within one and the most a move has', () => {
    let days = oneMove;
    for (let i = 0; i < 30; i++) days = stepped(days, 0, 0, 'sets', -1);
    expect(days[0].moves[0].sets).toBe(1);
    for (let i = 0; i < 30; i++) days = stepped(days, 0, 0, 'sets', 1);
    expect(days[0].moves[0].sets).toBe(workoutParams.programMoveSetsMax);
  });

  test('the fewest and the most reps step on their own, so 5 x 5, 3-5 or 12-15 can be written', () => {
    let days = oneMove;
    for (let i = 0; i < 200; i++) days = stepped(days, 0, 0, 'min', -1);
    for (let i = 0; i < 200; i++) days = stepped(days, 0, 0, 'max', -1);
    expect(days[0].moves[0].reps).toEqual({ min: 1, max: 2 }); // a range: the most above the fewest (OwnProgram)
    for (let i = 0; i < 3; i++) days = stepped(days, 0, 0, 'max', 1);
    for (let i = 0; i < 2; i++) days = stepped(days, 0, 0, 'min', 1);
    expect(days[0].moves[0].reps).toEqual({ min: 3, max: 5 });
  });

  test('the rep range stays a range: the fewest at least one and under the most, the most at most the reps a set takes', () => {
    let days = oneMove;
    for (let i = 0; i < 200; i++) days = stepped(days, 0, 0, 'min', 1);
    expect(days[0].moves[0].reps).toEqual({ min: REPS.COMPOUND.max - 1, max: REPS.COMPOUND.max });
    for (let i = 0; i < 200; i++) days = stepped(days, 0, 0, 'max', -1);
    expect(days[0].moves[0].reps).toEqual({ min: REPS.COMPOUND.max - 1, max: REPS.COMPOUND.max });
    for (let i = 0; i < 200; i++) days = stepped(days, 0, 0, 'max', 1);
    expect(days[0].moves[0].reps.max).toBe(workoutParams.maxReps);
  });
});

describe('put back (Undo)', () => {
  test('a day removed goes back where it was, with its moves', () => {
    const three = newDay(newDay(oneMove));
    expect(withDayAt(withoutDay(three, 0), three[0], 0)).toEqual(three);
  });

  test('a move removed goes back where it was in its day; a day gone meanwhile takes nothing', () => {
    const two = withMove(oneMove, 0, CURL);
    expect(withMoveAt(withoutMove(two, 0, 0), two[0].id, two[0].moves[0], 0)).toEqual(two);
    expect(withMoveAt([], two[0].id, two[0].moves[0], 0)).toEqual([]);
  });

  test('never past the limits: no eighth day, no move twice', () => {
    let days: EditedDay[] = [];
    for (let i = 0; i < workoutParams.programDaysMax; i++) days = newDay(days);
    expect(withDayAt(days, newDay([])[0], 0)).toBe(days);
    expect(withMoveAt(oneMove, oneMove[0].id, oneMove[0].moves[0], 0)).toBe(oneMove);
  });

  test('a day put back whose weekday another day took meanwhile comes back on no weekday', () => {
    const two = withWeekday(newDay(oneMove), 0, 'MONDAY');
    const gone = two[0];
    const retaken = withWeekday(withoutDay(two, 0), 0, 'MONDAY');
    const back = withDayAt(retaken, gone, 0);
    expect(back[0]).toEqual({ id: gone.id, name: gone.name, moves: gone.moves });
    expect(back[1].weekday).toBe('MONDAY');
  });
});

describe("the user's own move, pending until the program is sent", () => {
  const body: Schemas['NewCustomExercise'] = {
    clientId: 'c-1',
    name: 'Landmine press',
    kind: 'COMPOUND',
    load: 'EXTERNAL',
    equipment: 'BARBELL',
    unilateral: false,
  };

  test('is a move by its name, with an id that says it is not on the server yet', () => {
    const pending = pendingMove(body);
    expect(pending).toMatchObject({ name: 'Landmine press', kind: 'COMPOUND' });
    expect(isPending(pending.id)).toBe(true);
    expect(isPending('custom:8a1d')).toBe(false);
  });

  test('goes in the program by the id the server gave it; without one, no program', () => {
    const days = withMove(oneMove, 0, pendingMove(body));
    expect(ownProgramOf(days)).toBeNull();
    const sent = ownProgramOf(days, new Map([[pendingMove(body).id, 'custom:8a1d']]));
    expect(sent?.days[0].exercises.map((e) => e.exerciseId)).toEqual(['squat', 'custom:8a1d']);
  });
});

describe('the program it makes (contract OwnProgram)', () => {
  test('each day with its name trimmed, its weekday when it has one, its moves', () => {
    const days = withWeekday(renamed(withMove(newDay(oneMove), 1, CURL), 0, '  Legs '), 0, 'TUESDAY');
    expect(ownProgramOf(days)).toEqual({
      days: [
        { name: 'Legs', weekday: 'TUESDAY', exercises: [{ exerciseId: 'squat', sets: SETS, reps: REPS.COMPOUND }] },
        { name: t('programEditor.defaultName', { number: 2 }), exercises: [{ exerciseId: 'barbell_curl', sets: SETS, reps: REPS.ISOLATION }] },
      ],
    });
  });

  test('none while a day has no move or no name, or there is no day', () => {
    expect(ownProgramOf([])).toBeNull();
    expect(ownProgramOf(newDay(oneMove))).toBeNull();
    expect(ownProgramOf(renamed(oneMove, 0, '   '))).toBeNull();
  });

  test('two days on one weekday is no program (the server refuses it)', () => {
    const two = withMove(newDay(oneMove), 1, CURL);
    const both = two.map((day) => ({ ...day, weekday: 'MONDAY' as const }));
    expect(ownProgramOf(both)).toBeNull();
  });

  test('a name longer than a day name can be is no program', () => {
    expect(ownProgramOf(renamed(oneMove, 0, 'x'.repeat(workoutParams.programDayNameMaxChars + 1)))).toBeNull();
    expect(ownProgramOf(renamed(oneMove, 0, 'x'.repeat(workoutParams.programDayNameMaxChars)))).not.toBeNull();
  });
});
