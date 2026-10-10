/**
 * The first week's days (K-978, ADR-077 #4 and Ek 1/Ek 4): the call that moves the missed sessions to other days is saved
 * as an edit of the program's days (PATCH /v1/program, K-995 B) by their ids, so every row keeps its target. The days the
 * server suggested come filled; the user may pick others. The phone works out no day: it only puts the chosen weekdays on
 * the days the program already has.
 */
import type { components } from '@/api/schema';
import { dayCall, freeDays, moveBody, moveDays, trainingWeekdays } from '@/today/week1';

type Schemas = components['schemas'];
const ex = (id: string, exerciseId: string): Schemas['PlannedExercise'] => ({
  id,
  exerciseId,
  baseSets: 3,
  sets: 2, // a deload week: this week's sets, not the program's
  reps: { min: 6, max: 10 },
  targetRir: 2,
  nextLoadKg: 60,
});
const program = (): Schemas['Program'] => ({
  id: 'p1',
  source: 'GENERATED',
  days: [
    { id: 'a', nameKey: 'full_body_a', weekday: 'MONDAY', exercises: [ex('a1', 'squat'), ex('a2', 'bench_press')] },
    { id: 'b', nameKey: 'full_body_b', weekday: 'WEDNESDAY', exercises: [ex('b1', 'deadlift')] },
    { id: 'c', nameKey: 'full_body_c', weekday: 'FRIDAY', exercises: [ex('c1', 'row')] },
  ],
});
const decision = (action: unknown): Schemas['Decision'] =>
  ({
    id: 'd1',
    madeOn: '2026-10-12',
    action,
    reasons: [{ rule: 'first_week_move_missed', source: { tag: 'EXPERIENCE' } }],
    confidence: 'MEDIUM',
    nextReview: '2026-10-19',
    copyKey: 'decision.move_missed_sessions.first_week_move_missed',
    application: { state: 'NOT_NEEDED' },
    declinable: false,
    changes: [],
  }) as Schemas['Decision'];

describe('which calls pick days', () => {
  test('the missed sessions: the days that were missed and the days the server suggests, in the same order', () => {
    const found = dayCall(decision({ type: 'MOVE_MISSED_SESSIONS', missed: ['WEDNESDAY', 'FRIDAY'], suggested: ['THURSDAY'] }));
    expect(found).toEqual({ kind: 'move', missed: ['WEDNESDAY', 'FRIDAY'], suggested: ['THURSDAY'] });
  });

  test('one more day: the count and the day suggested', () => {
    expect(dayCall(decision({ type: 'ADD_TRAINING_DAY', toDays: 4, idealDays: 4, suggested: ['SATURDAY'] }))).toEqual({
      kind: 'add',
      toDays: 4,
      suggested: ['SATURDAY'],
    });
  });

  test('every other call: none (the plan stays, or the call moves a target)', () => {
    expect(dayCall(decision({ type: 'CONTINUE' }))).toBeNull();
    expect(dayCall(decision({ type: 'ADJUST_CALORIES', kcalPerDay: -250 }))).toBeNull();
  });
});

describe('the days the program has', () => {
  test('its training weekdays; the free days are the rest, Monday first', () => {
    expect(trainingWeekdays(program())).toEqual(['MONDAY', 'WEDNESDAY', 'FRIDAY']);
    expect(freeDays(program())).toEqual(['TUESDAY', 'THURSDAY', 'SATURDAY', 'SUNDAY']);
  });

  test('a day on no weekday is not a training weekday', () => {
    const p = program();
    delete p.days[1].weekday;
    expect(trainingWeekdays(p)).toEqual(['MONDAY', 'FRIDAY']);
  });
});

describe('the edit that moves a day', () => {
  test("the whole program by its ids, the missed day's weekday changed, every move with its row id, program sets and range", () => {
    const body = moveBody(program(), [{ from: 'WEDNESDAY', to: 'THURSDAY' }]);
    expect(body).toEqual({
      days: [
        { id: 'a', weekday: 'MONDAY', exercises: [{ id: 'a1', exerciseId: 'squat', sets: 3, reps: { min: 6, max: 10 } }, { id: 'a2', exerciseId: 'bench_press', sets: 3, reps: { min: 6, max: 10 } }] },
        { id: 'b', weekday: 'THURSDAY', exercises: [{ id: 'b1', exerciseId: 'deadlift', sets: 3, reps: { min: 6, max: 10 } }] },
        { id: 'c', weekday: 'FRIDAY', exercises: [{ id: 'c1', exerciseId: 'row', sets: 3, reps: { min: 6, max: 10 } }] },
      ],
    });
  });

  test('two days at once, each to its own weekday', () => {
    const body = moveBody(program(), [
      { from: 'WEDNESDAY', to: 'SATURDAY' },
      { from: 'FRIDAY', to: 'THURSDAY' },
    ]);
    expect(body?.days.map((d) => d.weekday)).toEqual(['MONDAY', 'SATURDAY', 'THURSDAY']);
  });

  test('a day the program no longer has on that weekday: nothing to send (it changed since)', () => {
    expect(moveBody(program(), [{ from: 'TUESDAY', to: 'THURSDAY' }])).toBeNull();
  });

  test('a weekday that is a training day already, or one chosen twice: nothing to send', () => {
    expect(moveBody(program(), [{ from: 'WEDNESDAY', to: 'FRIDAY' }])).toBeNull();
    expect(
      moveBody(program(), [
        { from: 'WEDNESDAY', to: 'SATURDAY' },
        { from: 'FRIDAY', to: 'SATURDAY' },
      ]),
    ).toBeNull();
  });
});

describe('saving', () => {
  const answer = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });

  test('sent once as PATCH; the program the server answered comes back', async () => {
    const PATCH = jest.fn(async (_path: string, _init?: unknown) => answer(200, program()));
    const done = await moveDays({ PATCH } as never, program(), [{ from: 'WEDNESDAY', to: 'THURSDAY' }]);
    expect(done).toEqual({ kind: 'done' });
    expect(PATCH).toHaveBeenCalledTimes(1);
    expect(PATCH.mock.calls[0][0]).toBe('/v1/program');
  });

  test.each([
    [409, 'conflict'],
    [400, 'failed'],
    [500, 'failed'],
  ])('refused %i: %s, nothing changed', async (status, kind) => {
    const PATCH = jest.fn(async () => answer(status));
    expect(await moveDays({ PATCH } as never, program(), [{ from: 'WEDNESDAY', to: 'THURSDAY' }])).toEqual({ kind });
  });

  test('no answer: offline', async () => {
    const PATCH = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await moveDays({ PATCH } as never, program(), [{ from: 'WEDNESDAY', to: 'THURSDAY' }])).toEqual({ kind: 'offline' });
  });

  test('a program that changed (the weekday is gone): conflict without sending', async () => {
    const PATCH = jest.fn();
    expect(await moveDays({ PATCH } as never, program(), [{ from: 'TUESDAY', to: 'THURSDAY' }])).toEqual({ kind: 'conflict' });
    expect(PATCH).not.toHaveBeenCalled();
  });
});
