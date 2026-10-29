/**
 * Every program the server answers is followed (ADR-090 Ek 1, K-1060): the training days, the week off and the offline copy
 * are the program's, and a day can be changed by many paths, so one place sees them all (api/programFollower.ts). Through the
 * real API client with a fetch that answers, as the services use it.
 */
import { createApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { programFollower } from '@/api/programFollower';

type Program = components['schemas']['Program'];

const BASE = 'https://api.test';
const PROGRAM = {
  id: 'p1',
  source: 'GENERATED',
  days: [{ id: 'd1', nameKey: 'programDays.upper.name', weekday: 'MONDAY', exercises: [] }],
  canAddDay: true,
} as unknown as Program;

function setup(answers: Record<string, unknown>, status = 200) {
  const followed: { program: Program; changed: boolean; era: number }[] = [];
  let era = 1;
  const fetch = async (request: Request) => {
    const path = new URL(request.url).pathname;
    const body = answers[`${request.method} ${path}`];
    if (body === undefined) return new Response(JSON.stringify({ code: 'NOT_FOUND' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  const api = createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch });
  api.use(programFollower((program, changed, startedIn) => void followed.push({ program, changed, era: startedIn }), () => era));
  return { api, followed, nextEra: () => void (era += 1) };
}

test('a program read is followed as a read; an answer to a change as a change', async () => {
  const { api, followed } = setup({ 'GET /v1/program': PROGRAM, 'POST /v1/program/days': PROGRAM, 'PATCH /v1/program': PROGRAM });

  await api.GET('/v1/program');
  await api.POST('/v1/program/days', { body: { weekday: 'FRIDAY' } });
  await api.PATCH('/v1/program', { body: { days: [] } });

  expect(followed.map((f) => f.changed)).toEqual([false, true, true]);
  expect(followed.every((f) => f.program.id === 'p1')).toBe(true);
});

test('every endpoint that answers the program: generate, today, swap, review apply, cardio, starting weights', async () => {
  const paths = ['POST /v1/program/generate', 'POST /v1/program/today', 'POST /v1/program/swap', 'POST /v1/program/review/apply', 'PUT /v1/program/cardio', 'PUT /v1/program/starting-weights', 'PUT /v1/program'];
  const { api, followed } = setup(Object.fromEntries(paths.map((p) => [p, PROGRAM])));
  const calls = [
    () => api.POST('/v1/program/generate', { body: { trainingDays: ['MONDAY'] } }),
    () => api.POST('/v1/program/today', { body: { programDayId: 'd1', change: 'SKIP' } }),
    () => api.POST('/v1/program/swap', { body: { programDayId: 'd1', exerciseId: 'a', to: 'b', scope: 'TODAY' } }),
    () => api.POST('/v1/program/review/apply', { body: { reviewId: 'r', suggestionIds: ['x'] } }),
    () => api.PUT('/v1/program/cardio', { body: { minutes: 30, sessions: [] } }),
    () => api.PUT('/v1/program/starting-weights', { body: { weights: [] } }),
    () => api.PUT('/v1/program', { body: { days: [] } }),
  ];
  for (const call of calls) await call();
  expect(followed).toHaveLength(paths.length);
  expect(followed.every((f) => f.changed)).toBe(true);
});

test('an undo answers the program inside; the review read, and anything else, is not a program', async () => {
  const { api, followed } = setup({
    'POST /v1/program/review/undo': { program: PROGRAM, alsoUndone: [] },
    'GET /v1/program/review': { id: 'r', suggestions: [], applied: [], notReviewedMoves: 0 },
    'GET /v1/profile': { days: [], id: 'not a program path' },
  });

  await api.POST('/v1/program/review/undo', { body: { changeId: 'c' } });
  await api.GET('/v1/program/review');
  await api.GET('/v1/profile');

  expect(followed).toHaveLength(1);
  expect(followed[0].program.id).toBe('p1');
  expect(followed[0].changed).toBe(true);
});

test('an answer that is not 2xx is followed by no one, and the caller still gets it whole', async () => {
  const { api, followed } = setup({ 'POST /v1/program/days': { code: 'CONFLICT', days: [] } }, 409);

  const answer = await api.POST('/v1/program/days', { body: { weekday: 'FRIDAY' } });

  expect(answer.response.status).toBe(409);
  expect(followed).toEqual([]);
});

test("the follower reads a copy: the caller gets the body untouched; a follower that throws is the follower's own", async () => {
  const followed: Program[] = [];
  const fetch = async () => new Response(JSON.stringify(PROGRAM), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const api = createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch });
  api.use(
    programFollower((program) => {
      followed.push(program);
      throw new Error('the follower failed');
    }, () => 1),
  );

  const answer = await api.GET('/v1/program');

  expect(answer.data).toEqual(PROGRAM);
  expect(followed).toHaveLength(1);
});

test("the account's era when the request began is what the follower is told: an answer after a sign-out can be dropped", async () => {
  const followed: number[] = [];
  let era = 1;
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const fetch = async () => {
    await gate; // the answer is on its way
    return new Response(JSON.stringify(PROGRAM), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const api = createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch });
  api.use(programFollower((_program, _changed, startedIn) => void followed.push(startedIn), () => era));

  const pending = api.POST('/v1/program/days', { body: { weekday: 'FRIDAY' } });
  await new Promise((resolve) => setTimeout(resolve, 0)); // the request has begun
  era += 1; // the account left while it was on its way
  release();
  await pending;

  expect(followed).toEqual([1]);
});
