/**
 * Preparing the plan (ADR-072 #2, #5, #6; K-967): after the last question the profile is stored (onboarding stays open),
 * the program is built for the days, the starting weights become its first targets (only after the program exists: a
 * program built again drops them), and the catalog names the moves. Each line of #ob-preparing is one of these answers,
 * never a timer. A step that failed is tried again from where it stopped; one that went through is not sent again.
 */
import type { components } from '@/api/schema';
import { type Draft, emptyDraft } from '@/onboarding/draft';
import { type Progress, daysTo, firstCallDay, firstWorkout, linesDone, preparePlan } from '@/onboarding/prepare';
import { type Move, ownMove } from '@/train/trainData';

type Schemas = components['schemas'];

const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number) => ({ error: { code: 'X', message: 'x' }, response: new Response(null, { status }) });

const PROFILE: Schemas['Profile'] = {
  goal: 'LOSE_FAT',
  sex: 'MALE',
  heightCm: 180,
  birthYear: 1990,
  activityLevel: 'ACTIVE',
  experience: 'Y1_3',
  programChoice: 'BUILD_ONE_FOR_ME',
  schedule: { trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'], checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' },
  units: 'METRIC',
};
const move = (exerciseId: string, extra: Partial<Schemas['PlannedExercise']> = {}): Schemas['PlannedExercise'] => ({
  exerciseId, baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 2, ...extra,
});
const PROGRAM: Schemas['Program'] = {
  id: '6a0c9d3e-0000-4000-8000-000000000001',
  source: 'GENERATED',
  days: [
    { id: '6a0c9d3e-0000-4000-8000-000000000002', nameKey: 'programDays.upper.name', weekday: 'MONDAY', exercises: [move('bench_press'), move('lat_pulldown')] },
    { id: '6a0c9d3e-0000-4000-8000-000000000003', nameKey: 'programDays.lower.name', weekday: 'WEDNESDAY', exercises: [move('squat'), move('romanian_deadlift')] },
    { id: '6a0c9d3e-0000-4000-8000-000000000004', nameKey: 'programDays.full_body.name', weekday: 'FRIDAY', exercises: [move('leg_press')] },
  ],
  cardio: { source: 'GENERATED', minutes: 30, sessionsPerWeek: 3, sessions: [], doneThisWeek: 0, afterLiftOverLine: false },
};
const WEIGHTED: Schemas['Program'] = { ...PROGRAM, id: '6a0c9d3e-0000-4000-8000-000000000009' };
/** The catalog: the moves the built programs name. */
const CATALOG: Schemas['Exercise'][] = ['bench_press', 'lat_pulldown', 'squat', 'romanian_deadlift', 'leg_press'].map((id) => ({
  id, nameKey: `exercises.${id}.name`, kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [],
}));
const LANDMINE: Schemas['CustomExercise'] = {
  id: 'custom:8a1d', name: 'Landmine Press', kind: 'COMPOUND', load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false,
} as Schemas['CustomExercise'];
const STARTING: Schemas['StartingTarget'] = { targetKcal: 2450, maintenanceKcal: { low: 2600, high: 3000 }, observationDays: 14 };
/** The first call's day, the server's (K-990): not the Monday after "today" (the 19th), so a day the phone worked out would show. */
const FIRST_CALL = '2026-10-26';
const FIRST_WEEKS: Schemas['FirstWeeks'] = { week: 1, risk: [], readsRisk: false, training: true, firstCallOn: FIRST_CALL };

const DRAFT: Draft = {
  ...emptyDraft,
  ids: { weighIn: '11111111-1111-4111-8111-111111111111', waist: '22222222-2222-4222-8222-222222222222' },
  goal: 'LOSE_FAT',
  experience: 'Y1_3',
  programChoice: 'BUILD_ONE_FOR_ME',
  trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
  height: { cm: '180', feet: '', inches: '' },
  birthYear: '1990',
  sex: 'MALE',
  activityLevel: 'ACTIVE',
  healthConsent: 'declined',
  startingWeights: { squat: 100, bench_press: 80 },
};

function fakes({ onServer = null as Schemas['Program'] | null } = {}) {
  const calls: string[] = [];
  const api = {
    POST: jest.fn(async (path: string, _init: unknown) => (calls.push(`POST ${path}`), ok(PROGRAM))),
    PUT: jest.fn(async (path: string, _init: unknown) => (calls.push(`PUT ${path}`), ok(WEIGHTED))),
    // The program the server holds already (a resumed onboarding), or none yet; the catalog.
    GET: jest.fn(async (path: string) => {
      calls.push(`GET ${path}`);
      if (path === '/v1/program') return onServer === null ? refused(404) : ok(onServer);
      if (path === '/v1/targets/starting') return ok(STARTING);
      if (path === '/v1/first-weeks') return ok(FIRST_WEEKS);
      if (path === '/v1/custom-exercises') return ok([LANDMINE]);
      return ok(CATALOG);
    }),
  };
  const profile = { store: jest.fn(async (p: Schemas['Profile']) => (calls.push('store profile'), p)) };
  // The starting weight queued with the profile reaches the server before the starting target is asked for.
  const queue = { record: jest.fn(async () => true), drain: jest.fn(async () => void calls.push('drain')) };
  const consented = jest.fn(async () => true);
  // The user's own moves as this phone kept them at the import (trainData), and the reporter (by name only).
  const keptOwn = jest.fn(async (): Promise<Move[] | null> => null);
  const report = jest.fn();
  return { calls, api, profile, queue, consented, keptOwn, report };
}

const run = (f: ReturnType<typeof fakes>, draft: Draft = DRAFT, from: Progress = {}, onProgress = (_: Progress) => {}) =>
  preparePlan({
    draft,
    from,
    onProgress,
    api: f.api as never,
    profile: f.profile,
    queue: f.queue,
    consented: f.consented,
    keptOwn: f.keptOwn,
    report: f.report,
    units: 'METRIC',
    now: new Date('2026-10-12T09:00:00Z'),
    timeZone: 'Europe/Istanbul',
  });

describe('the steps, in order', () => {
  test('the profile stored, no program yet so one is built for its days, the weights sent after it, the catalog read', async () => {
    const f = fakes();
    const done = await run(f);
    expect(f.calls).toEqual([
      'store profile', 'GET /v1/program', 'POST /v1/program/generate', 'PUT /v1/program/starting-weights',
      'drain', 'GET /v1/targets/starting', 'GET /v1/first-weeks', 'GET /v1/exercises',
    ]);
    expect(f.api.POST).toHaveBeenCalledWith('/v1/program/generate', { body: { trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'] } });
    expect(f.api.PUT).toHaveBeenCalledWith('/v1/program/starting-weights', {
      body: { weights: [{ exerciseId: 'squat', kg: 100 }, { exerciseId: 'bench_press', kg: 80 }] },
    });
    // The program with the weights as its targets is the one shown.
    expect(done).toMatchObject({ profile: PROFILE, program: WEIGHTED, exercises: CATALOG, consented: true, starting: STARTING, firstCall: FIRST_CALL });
  });

  test('no starting weights (a new lifter, or every move skipped): none sent, the program as built', async () => {
    const f = fakes();
    const done = await run(f, { ...DRAFT, experience: 'NEW', startingWeights: {} });
    expect(f.calls).toEqual(['store profile', 'GET /v1/program', 'POST /v1/program/generate', 'drain', 'GET /v1/targets/starting', 'GET /v1/first-weeks', 'GET /v1/exercises']);
    expect(done.program).toEqual(PROGRAM);
  });

  test('weights given on the walk of an experienced lifter who then said "just starting" are not sent (the walk has no weights)', async () => {
    const f = fakes();
    await run(f, { ...DRAFT, experience: 'NEW' });
    expect(f.api.PUT).not.toHaveBeenCalled();
  });

  test('whether there will be calls (the health data consent) is kept with the plan', async () => {
    const f = fakes();
    f.consented.mockResolvedValueOnce(false);
    expect((await run(f)).consented).toBe(false);
  });

  test('each answer is handed on as it comes', async () => {
    const f = fakes();
    const seen: string[][] = [];
    await run(f, DRAFT, {}, (progress) => seen.push(Object.keys(progress)));
    expect(seen).toEqual([
      ['profile'],
      ['profile', 'consented'],
      ['profile', 'consented', 'built'],
      ['profile', 'consented', 'built', 'program'],
      ['profile', 'consented', 'built', 'program', 'starting'],
      ['profile', 'consented', 'built', 'program', 'starting', 'firstCall'],
      ['profile', 'consented', 'built', 'program', 'starting', 'firstCall', 'exercises'],
    ]);
  });
});

describe('resumed after the app was closed (K-967 review): the program the server holds is never replaced', () => {
  const RESUMED: Progress = { profile: PROFILE };

  test('(b) closed after the program was built: no second build, its weights kept (none sent again)', async () => {
    const f = fakes({ onServer: WEIGHTED });
    const done = await run(f, emptyDraft, RESUMED);
    expect(f.calls).toEqual(['GET /v1/program', 'drain', 'GET /v1/targets/starting', 'GET /v1/first-weeks', 'GET /v1/exercises']);
    expect(f.api.POST).not.toHaveBeenCalled();
    expect(f.api.PUT).not.toHaveBeenCalled();
    expect(done.program).toEqual(WEIGHTED);
  });

  test("(a) closed after the profile was saved, before the program: built now, on the profile's days", async () => {
    const f = fakes();
    await run(f, emptyDraft, RESUMED);
    expect(f.calls).toEqual(['GET /v1/program', 'POST /v1/program/generate', 'drain', 'GET /v1/targets/starting', 'GET /v1/first-weeks', 'GET /v1/exercises']);
    expect(f.profile.store).not.toHaveBeenCalled();
  });
});

describe('the branch is the saved profile\'s, not the walk\'s answers (K-967 review)', () => {
  const OWN_ON_SERVER: Schemas['Program'] = { ...PROGRAM, source: 'OWN' };

  test('brought in, then "Build it for me" chosen instead: the program brought in is replaced by one built for the days', async () => {
    const f = fakes({ onServer: OWN_ON_SERVER });
    await run(f, { ...DRAFT, programChoice: 'BUILD_ONE_FOR_ME', ownProgram: OWN_ON_SERVER, reviewed: true });
    expect(f.api.POST).toHaveBeenCalledWith('/v1/program/generate', { body: { trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'] } });
  });

  test('a program built before is never built again', async () => {
    const f = fakes({ onServer: PROGRAM });
    await run(f);
    expect(f.api.POST).not.toHaveBeenCalled();
  });

  test('resumed (the walk\'s answers gone): an own program saved in the profile is read, never built over', async () => {
    const f = fakes({ onServer: OWN_ON_SERVER });
    await run(f, emptyDraft, { profile: { ...PROFILE, programChoice: 'BRING_MY_OWN' } });
    expect(f.api.POST).not.toHaveBeenCalled();
  });
});

describe('an own program brought in (K-968): never built over (ADR-073)', () => {
  const OWN: Schemas['Program'] = {
    ...PROGRAM,
    source: 'OWN',
    days: [{ id: '6a0c9d3e-0000-4000-8000-00000000000a', name: 'Push', weekday: 'MONDAY', exercises: [move('bench_press'), move('custom:8a1d')] }],
  };
  const OWN_DRAFT: Draft = { ...DRAFT, programChoice: 'BRING_MY_OWN', ownProgram: OWN, reviewed: true, startingWeights: { bench_press: 80 } };

  test('the program kept at the import is read after the profile and used: none built; the weights go onto it', async () => {
    const f = fakes({ onServer: OWN });
    const done = await run(f, OWN_DRAFT);
    expect(f.api.POST).not.toHaveBeenCalledWith('/v1/program/generate', expect.anything());
    expect(f.calls.slice(0, 3)).toEqual(['store profile', 'GET /v1/program', 'PUT /v1/program/starting-weights']);
    expect(f.api.PUT).toHaveBeenCalledWith('/v1/program/starting-weights', { body: { weights: [{ exerciseId: 'bench_press', kg: 80 }] } });
    expect(done.program).toEqual(WEIGHTED);
  });

  test('none on the server (it went missing): its own failure, never one built in its place', async () => {
    const f = fakes();
    await expect(run(f, OWN_DRAFT)).rejects.toMatchObject({ name: 'ProgramMissing' });
    expect(f.api.POST).not.toHaveBeenCalled();
  });

  test('the own moves cannot be read: the copy this phone kept at the import names them', async () => {
    const f = fakes({ onServer: OWN });
    f.api.PUT.mockResolvedValueOnce(ok(OWN) as never);
    const get = f.api.GET.getMockImplementation()!;
    f.api.GET.mockImplementation(async (path: string) => {
      if (path === '/v1/custom-exercises') throw new TypeError('Network request failed');
      return get(path) as never;
    });
    f.keptOwn.mockResolvedValueOnce([ownMove(LANDMINE)]);
    const done = await run(f, OWN_DRAFT);
    expect(done.exercises).toContainEqual(expect.objectContaining({ id: 'custom:8a1d', name: 'Landmine Press' }));
  });

  test('neither read nor kept: said, and tried again', async () => {
    const f = fakes({ onServer: OWN });
    f.api.PUT.mockResolvedValueOnce(ok(OWN) as never);
    const get = f.api.GET.getMockImplementation()!;
    f.api.GET.mockImplementation(async (path: string) => {
      if (path === '/v1/custom-exercises') throw new TypeError('Network request failed');
      return get(path) as never;
    });
    await expect(run(f, OWN_DRAFT)).rejects.toMatchObject({ name: 'NoConnection' });
  });

  test('the user\'s own moves it names are read with the catalog, by their names', async () => {
    const f = fakes({ onServer: OWN });
    f.api.PUT.mockResolvedValueOnce(ok(OWN) as never);
    const done = await run(f, OWN_DRAFT);
    expect(f.calls).toContain('GET /v1/custom-exercises');
    expect(done.exercises).toEqual([...CATALOG, expect.objectContaining({ id: 'custom:8a1d', name: 'Landmine Press', equipment: 'BARBELL' })]);
  });

  test('a program of catalog moves only: the own moves are not asked for', async () => {
    const f = fakes();
    await run(f);
    expect(f.calls).not.toContain('GET /v1/custom-exercises');
  });
});

describe("the first call's day (K-990, ADR-077 Ek 2): the server's, never worked out on the phone", () => {
  test('with the consent: the day the server names, after the starting target', async () => {
    const f = fakes();
    expect((await run(f)).firstCall).toBe(FIRST_CALL);
  });

  test('without the consent: not asked for (there are no calls), none named', async () => {
    const f = fakes();
    f.consented.mockResolvedValueOnce(false);
    const done = await run(f);
    expect(done.firstCall).toBeNull();
    expect(f.calls).not.toContain('GET /v1/first-weeks');
  });

  test.each([
    [403, 'the consent is not on the server'],
    [404, 'the first weeks are over'],
    [409, 'no profile'],
  ])('%i (%s): none named, and the plan goes on', async (status) => {
    const f = fakes();
    const get = f.api.GET.getMockImplementation()!;
    f.api.GET.mockImplementation(async (path: string) => (path === '/v1/first-weeks' ? refused(status) : get(path)) as never);
    const done = await run(f);
    expect(done.firstCall).toBeNull();
    expect(done.exercises).toEqual(CATALOG);
  });

  test('the first call made already (no day in the answer): none named', async () => {
    const f = fakes();
    const get = f.api.GET.getMockImplementation()!;
    f.api.GET.mockImplementation(async (path: string) => (path === '/v1/first-weeks' ? ok({ ...FIRST_WEEKS, firstCallOn: undefined }) : get(path)) as never);
    expect((await run(f)).firstCall).toBeNull();
  });

  test('another failure is said and tried again from there: the starting target is not asked again', async () => {
    const f = fakes();
    const get = f.api.GET.getMockImplementation()!;
    f.api.GET.mockImplementation(async (path: string) => (path === '/v1/first-weeks' ? refused(500) : get(path)) as never);
    let progress: Progress = {};
    await expect(run(f, DRAFT, {}, (p) => (progress = p))).rejects.toMatchObject({ name: 'ServerError' });
    f.api.GET.mockImplementation(get);
    f.calls.length = 0;
    expect((await run(f, DRAFT, progress)).firstCall).toBe(FIRST_CALL);
    expect(f.calls).toEqual(['GET /v1/first-weeks', 'GET /v1/exercises']);
  });
});

describe('the starting calories (K-989, ADR-072 Ek 1): the food row, or none', () => {
  test('without the health data consent: not asked for (the server would refuse), no row', async () => {
    const f = fakes();
    f.consented.mockResolvedValueOnce(false);
    const done = await run(f);
    expect(done.starting).toBeNull();
    expect(f.calls).not.toContain('GET /v1/targets/starting');
  });

  test.each([
    [403, 'the consent is not on the server'],
    [404, 'no weigh-in in the window'],
    [409, 'no profile, or the plan already started'],
  ])('%i (%s): no row, and the plan goes on', async (status) => {
    const f = fakes();
    const get = f.api.GET.getMockImplementation()!;
    f.api.GET.mockImplementation(async (path: string) => (path === '/v1/targets/starting' ? refused(status) : get(path)) as never);
    const done = await run(f);
    expect(done.starting).toBeNull();
    expect(done.exercises).toEqual(CATALOG);
  });

  test('a queue that cannot send the weigh-in yet does not stop the plan: reported by name, the target asked for all the same', async () => {
    const f = fakes();
    f.queue.drain.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'SyncStopped' }));
    expect((await run(f)).starting).toEqual(STARTING);
    expect(f.report).toHaveBeenCalledWith({ name: 'SyncStopped' });
  });

  test('another failure is said and tried again from there: the program is not built twice', async () => {
    const f = fakes();
    const get = f.api.GET.getMockImplementation()!;
    f.api.GET.mockImplementation(async (path: string) => (path === '/v1/targets/starting' ? refused(500) : get(path)) as never);
    let progress: Progress = {};
    await expect(run(f, DRAFT, {}, (p) => (progress = p))).rejects.toMatchObject({ name: 'ServerError' });
    f.api.GET.mockImplementation(get);
    f.calls.length = 0;
    await run(f, DRAFT, progress);
    expect(f.calls).toEqual(['drain', 'GET /v1/targets/starting', 'GET /v1/first-weeks', 'GET /v1/exercises']);
  });
});

describe('a step that fails', () => {
  test('throws by name: no connection told from a refusal', async () => {
    const offline = fakes();
    offline.api.POST.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(run(offline)).rejects.toMatchObject({ name: 'NoConnection' });
    const refusedOnce = fakes();
    refusedOnce.api.POST.mockResolvedValueOnce(refused(400) as never);
    await expect(run(refusedOnce)).rejects.toMatchObject({ name: 'ServerError' });
    // The program could not be read (not "none"): nothing is built over it.
    const unread = fakes();
    unread.api.GET.mockResolvedValueOnce(refused(500) as never);
    await expect(run(unread)).rejects.toMatchObject({ name: 'ServerError' });
    expect(unread.api.POST).not.toHaveBeenCalled();
  });

  test('tried again from where it stopped: nothing that went through is sent again, the program is not built twice', async () => {
    const f = fakes();
    let progress: Progress = {};
    f.api.PUT.mockResolvedValueOnce(refused(500) as never);
    await expect(run(f, DRAFT, {}, (p) => (progress = p))).rejects.toMatchObject({ name: 'ServerError' });
    expect(progress).toEqual({ profile: PROFILE, consented: true, built: PROGRAM });
    f.calls.length = 0;
    await run(f, DRAFT, progress);
    expect(f.calls).toEqual(['PUT /v1/program/starting-weights', 'drain', 'GET /v1/targets/starting', 'GET /v1/first-weeks', 'GET /v1/exercises']);
  });
});

describe('the lines of #ob-preparing: each done when its answer is in, in order', () => {
  test.each([
    ['nothing yet', {}, 0],
    ['the profile stored', { profile: PROFILE }, 0],
    ['the program built, the food not known yet', { profile: PROFILE, program: PROGRAM }, 1],
    ['the program and the food (its row, or none)', { profile: PROFILE, program: PROGRAM, starting: null }, 2],
    ['the moves named: all done', { profile: PROFILE, program: PROGRAM, starting: STARTING, exercises: CATALOG }, 3],
  ] as const)('%s: %i lines', (_, progress, lines) => {
    expect(linesDone(progress)).toBe(lines);
  });
});

describe('the dates the plan gives', () => {
  // Monday 12 October 2026 in Istanbul; the user's calendar, whatever the test machine's.
  const TZ = 'Europe/Istanbul';
  const MONDAY = new Date('2026-10-12T09:00:00+03:00');

  test("the days to the server's first call, on the user's calendar", () => {
    expect(daysTo('2026-10-19', MONDAY, TZ)).toBe(7);
    expect(daysTo('2026-10-19', new Date('2026-10-18T09:00:00+03:00'), TZ)).toBe(1);
    expect(daysTo('2026-10-12', MONDAY, TZ)).toBe(0);
    // Still Sunday in UTC, already Monday in Istanbul: the user's day counts.
    expect(daysTo('2026-10-26', new Date('2026-10-18T22:30:00Z'), TZ)).toBe(7);
  });

  test("#ob-preparing's first call: the server's day once it came (its weekday, or today); before it, the check-in day; none, none", () => {
    expect(firstCallDay('2026-10-19', 'MONDAY', MONDAY, TZ)).toBe('MONDAY');
    // A check-in day moved since: the server's day still counts.
    expect(firstCallDay('2026-10-14', 'MONDAY', MONDAY, TZ)).toBe('WEDNESDAY');
    // Resumed after it went by without a call: the server says today.
    expect(firstCallDay('2026-10-12', 'MONDAY', MONDAY, TZ)).toBe('TODAY');
    expect(firstCallDay(undefined, 'MONDAY', MONDAY, TZ)).toBe('MONDAY');
    expect(firstCallDay(null, 'MONDAY', MONDAY, TZ)).toBeNull();
  });

  test('the first workout: the soonest day of the program from today on, today included', () => {
    expect(firstWorkout(PROGRAM, MONDAY, TZ)).toEqual({ day: PROGRAM.days[0], inDays: 0 });
    expect(firstWorkout(PROGRAM, new Date('2026-10-13T09:00:00+03:00'), TZ)).toEqual({ day: PROGRAM.days[1], inDays: 1 });
    expect(firstWorkout(PROGRAM, new Date('2026-10-17T09:00:00+03:00'), TZ)).toEqual({ day: PROGRAM.days[0], inDays: 2 });
  });

  test('a program whose days have no weekday: its first day, with no date', () => {
    const own = { ...PROGRAM, days: PROGRAM.days.map(({ weekday: _, ...day }) => day) };
    expect(firstWorkout(own, MONDAY, TZ)).toEqual({ day: own.days[0], inDays: null });
  });
});
