/**
 * Changing today's session and swapping a move (K-970; the server's K-964 endpoints, ADR-073 Ek 3): the program the
 * server answers, or why not, by name: CONFLICT is the server's "not now" (nothing changed), no answer is no connection,
 * anything else is ours. Nothing is decided on the phone.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { applySuggestion, changeToday, coachCardio, editProgram, putCardio, rebuild, swapMove, undoChange } from '@/train/changes';

type Schemas = components['schemas'];

const PROGRAM: Schemas['Program'] = { id: 'p', source: 'GENERATED', days: [], week: [] };
const answer = (status: number, data?: unknown) => ({ data, error: data === undefined ? { code: 'X' } : undefined, response: { status } as Response });
const apiAnswering = (reply: () => unknown) => {
  const POST = jest.fn(async () => reply());
  return { api: { POST } as unknown as ApiClient, POST };
};

test("today's change goes to the server as asked, and the program it answers comes back", async () => {
  const { api, POST } = apiAnswering(() => answer(200, PROGRAM));
  expect(await changeToday(api, 'day-1', 'MOVE')).toEqual({ kind: 'done', program: PROGRAM });
  expect(POST).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'day-1', change: 'MOVE' } });
});

test('a swap goes with its scope', async () => {
  const { api, POST } = apiAnswering(() => answer(200, PROGRAM));
  const body = { programDayId: 'day-1', exerciseId: 'bench_press', to: 'dumbbell_bench_press', scope: 'FROM_NOW_ON' } as const;
  expect(await swapMove(api, body)).toEqual({ kind: 'done', program: PROGRAM });
  expect(POST).toHaveBeenCalledWith('/v1/program/swap', { body });
});

test.each([
  [409, 'conflict'],
  [500, 'failed'],
  [400, 'failed'],
])('the server answering %i is %s, and nothing is assumed changed', async (status, kind) => {
  const { api } = apiAnswering(() => answer(status));
  expect(await changeToday(api, 'day-1', 'SKIP')).toEqual({ kind });
  expect(await swapMove(api, { programDayId: 'day-1', exerciseId: 'a', to: 'b', scope: 'TODAY' })).toEqual({ kind });
});

describe('the program edited on the Edit page', () => {
  test('a review suggestion applied names the review it came from', async () => {
    const { api, POST } = apiAnswering(() => answer(200, PROGRAM));
    expect(await applySuggestion(api, 'rev-1', 'TOO_MANY_SETS:chest')).toEqual({ kind: 'done', program: PROGRAM });
    expect(POST).toHaveBeenCalledWith('/v1/program/review/apply', { body: { reviewId: 'rev-1', suggestionIds: ['TOO_MANY_SETS:chest'] } });
  });

  test('an applied change undone: the program, and the later changes undone with it', async () => {
    const { api, POST } = apiAnswering(() => answer(200, { program: PROGRAM, alsoUndone: ['c2'] }));
    expect(await undoChange(api, 'c1')).toEqual({ kind: 'done', program: PROGRAM, alsoUndone: ['c2'] });
    expect(POST).toHaveBeenCalledWith('/v1/program/review/undo', { body: { changeId: 'c1' } });
  });

  test('an undo the server refuses (the program changed another way) is a conflict', async () => {
    const { api } = apiAnswering(() => answer(409));
    expect(await undoChange(api, 'c1')).toEqual({ kind: 'conflict' });
  });

  test("the user's own cardio is sent whole; back to the coach's default removes it", async () => {
    const PUT = jest.fn(async () => answer(200, PROGRAM));
    const DELETE = jest.fn(async () => answer(200, PROGRAM));
    const api = { PUT, DELETE } as unknown as ApiClient;
    const plan = { minutes: 25, sessions: [{ weekday: 'MONDAY' as const, place: 'AFTER_LIFT' as const }] };
    expect(await putCardio(api, plan)).toEqual({ kind: 'done', program: PROGRAM });
    expect(PUT).toHaveBeenCalledWith('/v1/program/cardio', { body: plan });
    expect(await coachCardio(api)).toEqual({ kind: 'done', program: PROGRAM });
    expect(DELETE).toHaveBeenCalledWith('/v1/program/cardio');
  });

  test("rebuilt from the user's training days", async () => {
    const { api, POST } = apiAnswering(() => answer(200, PROGRAM));
    expect(await rebuild(api, ['MONDAY', 'THURSDAY'])).toEqual({ kind: 'done', program: PROGRAM });
    expect(POST).toHaveBeenCalledWith('/v1/program/generate', { body: { trainingDays: ['MONDAY', 'THURSDAY'] } });
  });
});

describe('the program edited in place (PATCH /v1/program, K-995)', () => {
  const EDIT: Schemas['ProgramEdit'] = { days: [{ id: 'd1', exercises: [{ id: 'r1', exerciseId: 'bench_press', sets: 3, reps: { min: 6, max: 10 } }] }] };
  const patching = (reply: () => unknown) => {
    const PATCH = jest.fn(async () => reply());
    return { api: { PATCH } as unknown as ApiClient, PATCH };
  };

  test('the edit goes whole, and the program the server answers comes back', async () => {
    const { api, PATCH } = patching(() => answer(200, PROGRAM));
    expect(await editProgram(api, EDIT)).toEqual({ kind: 'done', program: PROGRAM });
    expect(PATCH).toHaveBeenCalledWith('/v1/program', { body: EDIT });
  });

  test.each([
    [409, { kind: 'conflict' }],
    [400, { kind: 'refused' }],
    [404, { kind: 'failed' }],
    [500, { kind: 'failed' }],
  ])('the server answering %i is %j: the program is as it was', async (status, said) => {
    const { api } = patching(() => answer(status));
    expect(await editProgram(api, EDIT)).toEqual(said);
  });

  test('no answer at all is no connection', async () => {
    const { api } = patching(() => {
      throw new TypeError('Network request failed');
    });
    expect(await editProgram(api, EDIT)).toEqual({ kind: 'offline' });
  });
});

test('no answer at all is no connection', async () => {
  const api = {
    POST: async () => {
      throw new TypeError('Network request failed');
    },
  } as unknown as ApiClient;
  expect(await changeToday(api, 'day-1', 'SHORT')).toEqual({ kind: 'offline' });
});
