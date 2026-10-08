/**
 * Bringing a program (K-968, ADR-073 #1, Ek 2): #ob-own offers the import, and the import reads the file on this phone
 * into a draft of the program (import/draft.ts). The user sees the draft; a name no catalog move was matched to is
 * picked, made the user's own move (OwnMoveForm) or left out; only their confirmation sends the program (PUT
 * /v1/program). #ob-review then shows the server's review of it (ADR-073 #2-#3): each suggestion on or off, "Use mine
 * with N changes" applies the ones on, "Keep mine as is" changes nothing. Routes are rendered from the real src/app
 * folder; the services are faked.
 */
import fs from 'node:fs';
import * as path from 'node:path';

import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { createTrainingCache, type Move } from '@/train/trainData';
import type { KeyValue } from '@/units/preference';

type Schemas = components['schemas'];

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));

const move = (id: string, equipment: Schemas['Equipment']): Move => ({
  id,
  nameKey: `exercises.${id}.name`,
  kind: 'COMPOUND',
  muscles: [],
  alternatives: [],
  load: 'EXTERNAL',
  equipment,
  unilateral: false,
  setupFields: [],
});
const mockCatalog = [move('bench_press', 'BARBELL'), move('barbell_row', 'BARBELL'), move('squat', 'BARBELL'), move('romanian_deadlift', 'BARBELL')];
const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures/import', name), 'utf8');

const ok = (data: unknown) => ({
  data,
  response: new Response(null, { status: 200 }),
});
const refused = (status: number) => ({
  error: { code: 'VALIDATION_FAILED' },
  response: new Response(null, { status }),
});
const reason = { rule: 'weekly_sets_min', source: { tag: 'EXPERIENCE' as const } };
const FEW_HAMSTRINGS: Schemas['ReviewSuggestion'] = {
  id: 'TOO_FEW_SETS:hamstrings',
  finding: 'TOO_FEW_SETS',
  muscle: 'hamstrings',
  numbers: { from: 3, to: 4, min: 4 },
  copyKey: 'review.too_few_sets',
  reason,
};
const CHEST_ONCE: Schemas['ReviewSuggestion'] = {
  id: 'ONCE_A_WEEK:chest',
  finding: 'ONCE_A_WEEK',
  muscle: 'chest',
  numbers: { from: 1, to: 2 },
  copyKey: 'review.once_a_week',
  reason,
};
const SQUAT_REPS: Schemas['ReviewSuggestion'] = {
  id: 'REP_RANGE:squat',
  finding: 'REP_RANGE',
  exerciseId: 'squat',
  numbers: { fromMin: 5, fromMax: 7, toMin: 6, toMax: 10 },
  copyKey: 'review.rep_range_compound',
  reason,
};
const REVIEW: Schemas['ProgramReview'] = { id: 'r1', notReviewedMoves: 0, suggestions: [FEW_HAMSTRINGS, CHEST_ONCE, SQUAT_REPS], applied: [] };
/** The review the server sends with the program it kept (Program.review), and from GET /v1/program/review. */
let mockReview = REVIEW;
/** The program after the changes picked: Lower moved to Friday, the review run again. */
const APPLIED: Schemas['Program'] = {
  id: 'p1',
  source: 'OWN',
  days: [
    { id: 'd0', name: 'Upper', weekday: 'MONDAY', exercises: [] },
    { id: 'd1', name: 'Lower', weekday: 'FRIDAY', exercises: [] },
  ],
  review: { id: 'r2', notReviewedMoves: 0, suggestions: [], applied: [] },
};
/** The server keeps the program it is sent, each day with an id (PUT /v1/program). */
const kept = (body: Schemas['OwnProgram']): Schemas['Program'] => ({
  review: mockReview,
  id: 'p1',
  source: 'OWN',
  days: body.days.map((day, i) => ({
    id: `d${i}`,
    name: day.name,
    ...(day.weekday === undefined ? {} : { weekday: day.weekday }),
    exercises: day.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      baseSets: e.sets,
      sets: e.sets,
      reps: e.reps,
      targetRir: 1,
    })),
  })),
});
type Init = { body?: unknown };
const mockAnswer = async (route: string, init: Init): Promise<unknown> => {
  if (route === '/v1/program') return ok(kept(init.body as Schemas['OwnProgram']));
  if (route === '/v1/custom-exercises') {
    const own = init.body as Schemas['NewCustomExercise'];
    return ok({ ...own, id: own.name === 'Landmine Press' ? 'custom:8a1d' : `custom:${own.name}` });
  }
  if (route === '/v1/program/review/apply') return ok(APPLIED);
  if (route === '/v1/program/review') return ok(mockReview);
  return ok({ status: 'GRANTED' }); // a consent
};
const mockRead = async (route: string) => mockAnswer(route, {});
const mockApi = {
  GET: jest.fn(mockRead),
  PUT: jest.fn(mockAnswer),
  POST: jest.fn(mockAnswer),
  DELETE: jest.fn(mockAnswer),
};
let mockFile: string | null = null;
const mockPick = jest.fn(async () => mockFile);
const mockProfile = {
  save: jest.fn(async (_profile: unknown) => {}),
  refresh: jest.fn(async () => {}),
};
const mockReport = jest.fn();
/** The phone's real copy of the user's own moves (trainData.ts), on a store kept in memory. */
const mockStore = new Map<string, string>();
const mockKv: KeyValue = {
  getItemAsync: async (key) => mockStore.get(key) ?? null,
  setItemAsync: async (key, value) => void mockStore.set(key, value),
  removeItemAsync: async (key) => void mockStore.delete(key),
};
const mockCache = createTrainingCache(mockKv);
const mockSaved = jest.fn((move: Schemas['CustomExercise']) => mockCache.saved(move));
// One object, as the real provider gives: a screen that reads on its services' change reads once.
const mockServices = {
  profile: mockProfile,
  signOut: jest.fn(),
  api: mockApi,
  queue: { record: jest.fn(async () => true), drain: jest.fn(async () => {}) },
  report: mockReport,
  withdrawHealthData: jest.fn(async () => {}),
  consents: { remember: jest.fn(async () => {}) },
  units: { current: () => 'METRIC', keepOnPhone: jest.fn(async () => {}) },
  importFile: { pick: mockPick },
  training: {
    read: async () => ({
      program: { state: 'none' },
      exercises: { state: 'ready', value: mockCatalog },
      kept: false,
    }),
    own: async () => [] as Move[],
    saved: mockSaved,
  },
};
jest.mock('@/services/ServicesProvider', () => ({
  ServicesProvider: ({ children }: { children: unknown }) => children,
  useSignedIn: () => true,
  useSubscriptionGate: () => 'open',
  useAppearance: () => 'light',
  useOnboarding: () => 'needed',
  useUnits: () => 'METRIC',
  useAppServices: () => mockServices,
}));

const APP = path.resolve(__dirname, '../app');

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.PUT.mockImplementation(mockAnswer);
  mockApi.POST.mockImplementation(mockAnswer);
  mockApi.GET.mockImplementation(mockRead);
  mockFile = fixture('strong-program.csv');
  mockStore.clear();
  mockReview = REVIEW;
});

async function settle() {
  await act(async () => {
    jest.runAllTimers();
  });
}
async function press(name: string | RegExp) {
  await fireEvent.press(screen.getByRole('button', { name }));
  await settle();
}
async function choose(name: string) {
  const start = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${start}`) }));
  await settle();
}

/** Signed in without a profile: goal, experience, "I have my own"; it stops on #ob-own. */
async function toOwnProgram() {
  const router = renderRouter(APP, { initialUrl: '/' });
  await router;
  await settle();
  await choose(t('onboarding.goal.lose_fat.title'));
  await choose(t('onboarding.experience.Y3_PLUS'));
  await choose(t('onboarding.program.bring_my_own.title'));
  return { getPathname: () => router.getPathname() };
}

/** On #ob-own, the import, and the file read. */
async function toDraft() {
  const router = await toOwnProgram();
  await choose(t('onboarding.own.import.title'));
  await press(t('onboarding.programImport.choose'));
  return router;
}

const name = (id: string) => t(`exercises.${id}.name`);
const programPuts = () => mockApi.PUT.mock.calls.filter(([route]) => route === '/v1/program');

describe('#ob-own (prototype)', () => {
  test('brings the program in: from Strong or Hevy, read on this phone', async () => {
    const router = await toOwnProgram();
    expect(router.getPathname()).toBe('/onboarding/own-program');
    expect(screen.getByRole('header', { name: t('onboarding.own.title') })).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.own.why'))).toBeOnTheScreen();
    await choose(t('onboarding.own.import.title'));
    expect(router.getPathname()).toBe('/onboarding/program-import');
  });

  test('nothing to continue with until a program is brought in', async () => {
    await toOwnProgram();
    expect(screen.queryByRole('button', { name: t('onboarding.continue') })).toBeNull();
  });
});

describe('the import: a draft, read on this phone', () => {
  test('what happens to the file is said before one is chosen', async () => {
    const router = await toOwnProgram();
    await choose(t('onboarding.own.import.title'));
    expect(router.getPathname()).toBe('/onboarding/program-import');
    expect(screen.getByText(t('onboarding.programImport.privacy'))).toBeOnTheScreen();
    expect(mockPick).not.toHaveBeenCalled();
  });

  test('each routine a day, on its weekday, with its moves, sets and the reps seen; nothing sent yet', async () => {
    await toDraft();
    expect(screen.getByText('Upper')).toBeOnTheScreen();
    expect(screen.getByText('Lower')).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.schedule.dayName.MONDAY'))).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.schedule.dayName.THURSDAY'))).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.programImport.summary', { app: 'Strong', days: 2, moves: 5 }))).toBeOnTheScreen();
    expect(screen.getByText(name('barbell_row'))).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.programImport.move', { sets: 4, min: 7, max: 9 }))).toBeOnTheScreen();
    expect(screen.getByText(name('squat'))).toBeOnTheScreen();
    // A routine done once (Arms) is no day.
    expect(screen.queryByText('Arms')).toBeNull();
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(mockApi.POST).not.toHaveBeenCalled();
  });

  test('a name no move was matched to is said, and the program waits for it: picked, own or left out', async () => {
    await toDraft();
    expect(screen.getByText('Landmine Press')).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.programImport.unmatched'))).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: t('onboarding.programImport.confirm'),
      }),
    ).toBeDisabled();
  });

  test('left out: gone from the draft, and the program confirmed goes as drafted', async () => {
    const router = await toDraft();
    await press(t('onboarding.programImport.leaveOutLabel', { name: 'Landmine Press' }));
    expect(screen.queryByText('Landmine Press')).toBeNull();
    await press(t('onboarding.programImport.confirm'));
    expect(programPuts()).toHaveLength(1);
    expect(programPuts()[0][1]).toEqual({
      body: {
        days: [
          {
            name: 'Upper',
            weekday: 'MONDAY',
            exercises: [
              { exerciseId: 'bench_press', sets: 4, reps: { min: 7, max: 9 } },
              { exerciseId: 'barbell_row', sets: 3, reps: { min: 9, max: 11 } },
            ],
          },
          {
            name: 'Lower',
            weekday: 'THURSDAY',
            exercises: [
              { exerciseId: 'squat', sets: 3, reps: { min: 5, max: 7 } },
              {
                exerciseId: 'romanian_deadlift',
                sets: 3,
                reps: { min: 8, max: 10 },
              },
            ],
          },
        ],
      },
    });
    expect(router.getPathname()).toBe('/onboarding/review');
  });

  /** Landmine Press made the user's own move: the engine's questions answered (OwnMoveForm, U1). */
  async function answerOwn() {
    await press(t('import.ownLabel', { file: 'Landmine Press' }));
    await press(`${t('ownMove.kind')} ${t('ownMove.kinds.COMPOUND')}`);
    await press(`${t('ownMove.equipment')} ${t('ownMove.equipments.BARBELL')}`);
    await press(`${t('ownMove.unilateral')} ${t('ownMove.no')}`);
    await press(t('ownMove.save'));
  }
  const ownPosts = () => mockApi.POST.mock.calls.filter(([route]) => route === '/v1/custom-exercises');

  // Spec (ADR-073 Ek 2: "Taslak anında oluşturulmaz: reddedilen taslak kendi hareketi de bırakmaz"; the screen's own
  // words "Only the program you confirm is sent"): the own move's answers wait on the phone until the program is confirmed.
  test("made the user's own move: answered now, sent only with the program, then in it by its id", async () => {
    await toDraft();
    await answerOwn();
    expect(mockApi.POST).not.toHaveBeenCalled();
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(screen.queryByText(t('onboarding.programImport.unmatched'))).toBeNull();
    expect(screen.getByText(t('onboarding.programImport.ownWaiting'))).toBeOnTheScreen();
    await press(t('onboarding.programImport.confirm'));
    expect(ownPosts()).toEqual([['/v1/custom-exercises', { body: expect.objectContaining({ name: 'Landmine Press', kind: 'COMPOUND' }) }]]);
    expect(mockSaved).toHaveBeenCalledTimes(1);
    // The own move first, then the program that names it.
    const order = mockApi.POST.mock.invocationCallOrder[0];
    expect(order).toBeLessThan(mockApi.PUT.mock.invocationCallOrder[0]);
    const upper = (programPuts()[0][1].body as Schemas['OwnProgram']).days[0];
    expect(upper.exercises[2]).toEqual({ exerciseId: 'custom:8a1d', sets: 3, reps: { min: 12, max: 14 } });
  });

  test('a draft turned down leaves no own move behind: leaving the screen sends nothing', async () => {
    const router = await toDraft();
    await answerOwn();
    await press(t('onboarding.back'));
    expect(router.getPathname()).toBe('/onboarding/own-program');
    expect(mockApi.POST).not.toHaveBeenCalled();
  });

  test('an own move the confirmed draft no longer uses is not sent', async () => {
    await toDraft();
    await answerOwn();
    await press(t('onboarding.programImport.leaveOutLabel', { name: 'Landmine Press' }));
    await press(t('onboarding.programImport.confirm'));
    expect(ownPosts()).toEqual([]);
    expect(programPuts()).toHaveLength(1);
  });

  test('a program that did not go goes again with the same own move: one clientId, kept for the name', async () => {
    mockApi.PUT.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    await toDraft();
    await answerOwn();
    await press(t('onboarding.programImport.confirm'));
    expect(screen.getByText(t('onboarding.programImport.failed.NoConnection'))).toBeOnTheScreen();
    await press(t('onboarding.programImport.confirm'));
    expect(ownPosts()).toHaveLength(2);
    const clientIds = ownPosts().map(([, init]) => (init as { body: Schemas['NewCustomExercise'] }).body.clientId);
    expect(clientIds[0]).toEqual(clientIds[1]);
    expect(programPuts()).toHaveLength(2);
  });

  test('an own move the server did not keep: said, and no program goes without it', async () => {
    mockApi.POST.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    const router = await toDraft();
    await answerOwn();
    await press(t('onboarding.programImport.confirm'));
    expect(screen.getByText(t('onboarding.programImport.failed.NoConnection'))).toBeOnTheScreen();
    expect(programPuts()).toEqual([]);
    expect(router.getPathname()).toBe('/onboarding/program-import');
  });

  test('picked from the catalog: the move it is, in the program', async () => {
    await toDraft();
    await press(t('import.otherLabel', { file: 'Landmine Press' }));
    await fireEvent.changeText(screen.getByLabelText(t('import.search')), 'squat');
    await press(t('import.pickLabel', { move: name('squat'), file: 'Landmine Press' }));
    await press(t('onboarding.programImport.confirm'));
    const upper = (programPuts()[0][1].body as Schemas['OwnProgram']).days[0];
    expect(upper.exercises).toEqual([
      { exerciseId: 'bench_press', sets: 4, reps: { min: 7, max: 9 } },
      { exerciseId: 'barbell_row', sets: 3, reps: { min: 9, max: 11 } },
      { exerciseId: 'squat', sets: 3, reps: { min: 12, max: 14 } },
    ]);
    expect(mockApi.POST).not.toHaveBeenCalled(); // no own move made
  });

  test('a file whose routines do not repeat: no draft, said so', async () => {
    const lines = fixture('strong-program.csv').split('\n');
    mockFile = [lines[0], ...lines.filter((line) => line.includes('"Arms"'))].join('\n');
    await toDraft();
    expect(screen.getByText(t('onboarding.programImport.noRoutine'))).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', {
        name: t('onboarding.programImport.confirm'),
      }),
    ).toBeNull();
  });

  test('every move of the draft left out: said so, not called a file without routines', async () => {
    const header = fixture('strong-program.csv').split('\n')[0];
    mockFile = [
      header,
      '2025-03-03 18:00:00,"Push",1h,"Landmine Press",1,30,12,0,0,"","",',
      '2025-03-10 18:00:00,"Push",1h,"Landmine Press",1,30,12,0,0,"","",',
    ].join('\n');
    await toDraft();
    await press(t('onboarding.programImport.leaveOutLabel', { name: 'Landmine Press' }));
    expect(screen.getByText(t('onboarding.programImport.allLeftOut'))).toBeOnTheScreen();
    expect(screen.queryByText(t('onboarding.programImport.noRoutine'))).toBeNull();
  });

  test('a file that is not an export we read: said so, another can be chosen', async () => {
    mockFile = 'date,exercise,kg\n2025-01-18,Squat,100';
    await toDraft();
    expect(screen.getByText(t('import.unknown'))).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: t('onboarding.programImport.chooseAnother'),
      }),
    ).toBeOnTheScreen();
  });

  test('no file chosen: nothing changes', async () => {
    mockFile = null;
    await toDraft();
    expect(
      screen.getByRole('button', {
        name: t('onboarding.programImport.choose'),
      }),
    ).toBeOnTheScreen();
  });

  test('a program the server did not keep: said, the walk waits, and the same program can go again', async () => {
    mockApi.PUT.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    const router = await toDraft();
    await press(t('onboarding.programImport.leaveOutLabel', { name: 'Landmine Press' }));
    await press(t('onboarding.programImport.confirm'));
    expect(screen.getByText(t('onboarding.programImport.failed.NoConnection'))).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/onboarding/program-import');
    mockApi.PUT.mockImplementationOnce(async () => refused(400));
    await press(t('onboarding.programImport.confirm'));
    expect(screen.getByText(t('onboarding.programImport.failed.other'))).toBeOnTheScreen();
    await press(t('onboarding.programImport.confirm'));
    expect(programPuts()).toHaveLength(3);
    expect(programPuts()[2][1]).toEqual(programPuts()[0][1]);
    expect(router.getPathname()).toBe('/onboarding/review');
  });
});

describe('after the program', () => {
  test('the walk goes on to its review, fifth of eight; back on #ob-own, Continue goes on with it', async () => {
    const router = await toDraft();
    await press(t('onboarding.programImport.leaveOutLabel', { name: 'Landmine Press' }));
    await press(t('onboarding.programImport.confirm'));
    expect(screen.getByLabelText(t('onboarding.progress', { step: 5, total: 8 }))).toBeOnTheScreen();
    await press(t('onboarding.back'));
    await press(t('onboarding.back'));
    expect(router.getPathname()).toBe('/onboarding/own-program');
    await press(t('onboarding.continue'));
    expect(router.getPathname()).toBe('/onboarding/review');
  });

  test("the profile at the end: bringing my own, on the program's weekdays", async () => {
    await toDraft();
    await press(t('onboarding.programImport.leaveOutLabel', { name: 'Landmine Press' }));
    await press(t('onboarding.programImport.confirm'));
    await press(t('onboarding.review.keep'));
    await press(t('onboarding.healthData.notNow'));
    await press(t('onboarding.consent.continueWithout'));
    await press(t('onboarding.about.male'));
    await press(t('onboarding.continue'));
    await choose(t('onboarding.activity.ACTIVE'));
    expect(mockProfile.save).toHaveBeenCalledWith(
      expect.objectContaining({
        programChoice: 'BRING_MY_OWN',
        schedule: expect.objectContaining({
          trainingDays: ['MONDAY', 'THURSDAY'],
        }),
      }),
    );
  });
});

describe('own moves of the draft, sent with the program', () => {
  const header = fixture('strong-program.csv').split('\n')[0];
  const row = (date: string, routine: string, name: string) => `${date},"${routine}",1h,"${name}",1,30,12,0,0,"","",`;
  async function answer(file: string) {
    await press(t('import.ownLabel', { file }));
    await press(`${t('ownMove.kind')} ${t('ownMove.kinds.ISOLATION')}`);
    await press(`${t('ownMove.equipment')} ${t('ownMove.equipments.CABLE')}`);
    await press(`${t('ownMove.unilateral')} ${t('ownMove.no')}`);
    await press(t('ownMove.save'));
  }
  const posts = () => mockApi.POST.mock.calls.filter(([route]) => route === '/v1/custom-exercises');

  test("two own moves made: the phone keeps both (each kept after the other, none lost)", async () => {
    mockFile = [
      header,
      row('2025-03-03 18:00:00', 'Push', 'Landmine Press'),
      row('2025-03-03 18:00:00', 'Push', 'Cable Fly'),
      row('2025-03-10 18:00:00', 'Push', 'Landmine Press'),
      row('2025-03-10 18:00:00', 'Push', 'Cable Fly'),
    ].join('\n');
    await toDraft();
    await answer('Landmine Press');
    await answer('Cable Fly');
    await press(t('onboarding.programImport.confirm'));
    expect(posts()).toHaveLength(2);
    const kept = JSON.parse(mockStore.get('train.own') ?? '[]') as Schemas['CustomExercise'][];
    expect(kept.map((m) => m.id).sort()).toEqual(['custom:8a1d', 'custom:Cable Fly']);
  });

  test('one name in other case or spaces, on two days, is one own move', async () => {
    mockFile = [
      header,
      row('2025-03-03 18:00:00', 'Push', 'Cable Fly'),
      row('2025-03-06 18:00:00', 'Pull', 'cable  fly'),
      row('2025-03-10 18:00:00', 'Push', 'Cable Fly'),
      row('2025-03-13 18:00:00', 'Pull', 'cable  fly'),
    ].join('\n');
    await toDraft();
    await answer('Cable Fly');
    expect(screen.queryByText(t('onboarding.programImport.unmatched'))).toBeNull();
    await press(t('onboarding.programImport.confirm'));
    expect(posts()).toHaveLength(1);
    const days = (programPuts()[0][1].body as Schemas['OwnProgram']).days;
    expect(days.map((day) => day.exercises.map((e) => e.exerciseId))).toEqual([['custom:Cable Fly'], ['custom:Cable Fly']]);
  });

  test('an answered own move can be changed: the move picked from the catalog instead, no own move made', async () => {
    await toDraft();
    await answer('Landmine Press');
    await press(t('onboarding.programImport.changeLabel', { name: 'Landmine Press' }));
    expect(screen.getByText(t('onboarding.programImport.unmatched'))).toBeOnTheScreen();
    await press(t('import.otherLabel', { file: 'Landmine Press' }));
    await fireEvent.changeText(screen.getByLabelText(t('import.search')), 'squat');
    await press(t('import.pickLabel', { move: name('squat'), file: 'Landmine Press' }));
    await press(t('onboarding.programImport.confirm'));
    expect(posts()).toEqual([]);
    expect((programPuts()[0][1].body as Schemas['OwnProgram']).days[0].exercises[2].exerciseId).toBe('squat');
  });
});

/** The program brought in (Landmine Press left out) and kept: #ob-review is open. */
async function toReview() {
  const router = await toDraft();
  await press(t('onboarding.programImport.leaveOutLabel', { name: 'Landmine Press' }));
  await press(t('onboarding.programImport.confirm'));
  return router;
}
const title = (s: Schemas['ReviewSuggestion']) =>
  t(`${s.copyKey}.title`, { ...s.numbers, muscle: t(`demo.muscle.${s.muscle}`), exercise: name(s.exerciseId ?? '') });
const toggle = (s: Schemas['ReviewSuggestion']) => screen.getByRole('switch', { name: title(s) });
async function flip(s: Schemas['ReviewSuggestion']) {
  await fireEvent(toggle(s), 'valueChange', !toggle(s).props.value);
  await settle();
}
const applies = () => mockApi.POST.mock.calls.filter(([route]) => route === '/v1/program/review/apply');

describe('#ob-review (ADR-073 #2-#3)', () => {
  test('the program in one block, then each suggestion with its concrete change, on, and its coaching rule', async () => {
    const router = await toReview();
    expect(router.getPathname()).toBe('/onboarding/review');
    expect(screen.getByRole('header', { name: t('onboarding.review.title') })).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.review.size', { days: 2, moves: 4 }))).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: t('onboarding.review.headline.other', { count: 3 }) })).toBeOnTheScreen();
    expect(screen.getByText('Hamstrings: 4 sets a week, not 3')).toBeOnTheScreen();
    expect(screen.getByText('Chest on 2 days a week')).toBeOnTheScreen();
    expect(screen.getByText('Squat: 6-10 reps')).toBeOnTheScreen();
    for (const s of [FEW_HAMSTRINGS, CHEST_ONCE, SQUAT_REPS]) expect(toggle(s).props.value).toBe(true);
    expect(screen.getAllByRole('button', { name: t('onboarding.review.rule') })).toHaveLength(3);
    expect(screen.getByText(t('onboarding.review.note'))).toBeOnTheScreen();
    // The rule's own words are one tap away; the card names the kind of source, never a person (U14).
    expect(screen.queryByText(t('review.too_few_sets.body', { min: 4 }))).toBeNull();
  });

  test('the coaching rule opens under its suggestion, in its own words', async () => {
    await toReview();
    await fireEvent.press(screen.getAllByRole('button', { name: t('onboarding.review.rule') })[0]);
    await settle();
    expect(screen.getByText(t('review.too_few_sets.body', { min: 4 }))).toBeOnTheScreen();
  });

  test.each([
    [0, 'Use mine with 3 changes'],
    [1, 'Use mine with 2 changes'],
    [2, 'Use mine with 1 change'],
  ])('with %i turned off, the button counts the changes still on: "%s"; Keep mine as is beside it', async (off, label) => {
    await toReview();
    for (const s of [FEW_HAMSTRINGS, CHEST_ONCE].slice(0, off)) await flip(s);
    expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('onboarding.review.keep') })).toBeOnTheScreen();
  });

  test('every suggestion off: one button, Keep mine as is', async () => {
    await toReview();
    for (const s of [FEW_HAMSTRINGS, CHEST_ONCE, SQUAT_REPS]) await flip(s);
    expect(screen.queryByRole('button', { name: /^Use mine/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: t('onboarding.review.keep') })).toHaveLength(1);
  });

  test('"Use mine with 2 changes" applies those two, by the review they came from; the walk goes on with the changed program', async () => {
    const router = await toReview();
    await flip(CHEST_ONCE);
    await press('Use mine with 2 changes');
    expect(applies()).toEqual([['/v1/program/review/apply', { body: { reviewId: 'r1', suggestionIds: [FEW_HAMSTRINGS.id, SQUAT_REPS.id] } }]]);
    expect(router.getPathname()).toBe('/onboarding/health-data');
    await press(t('onboarding.healthData.notNow'));
    await press(t('onboarding.consent.continueWithout'));
    await press(t('onboarding.about.male'));
    await press(t('onboarding.continue'));
    await choose(t('onboarding.activity.ACTIVE'));
    // The changed program's weekdays (Lower moved to Friday).
    expect(mockProfile.save).toHaveBeenCalledWith(expect.objectContaining({ schedule: expect.objectContaining({ trainingDays: ['MONDAY', 'FRIDAY'] }) }));
  });

  test('"Keep mine as is" sends nothing and changes nothing; the walk goes on', async () => {
    const router = await toReview();
    const puts = mockApi.PUT.mock.calls.length;
    await press(t('onboarding.review.keep'));
    expect(applies()).toEqual([]);
    expect(mockApi.PUT.mock.calls.length).toBe(puts);
    expect(router.getPathname()).toBe('/onboarding/health-data');
  });

  test('a review gone stale (409): nothing applied; it is read again and shown again, every suggestion on', async () => {
    const router = await toReview();
    await flip(CHEST_ONCE);
    mockApi.POST.mockImplementationOnce(async () => ({ error: { code: 'CONFLICT' }, response: new Response(null, { status: 409 }) }));
    mockReview = { id: 'r9', notReviewedMoves: 0, suggestions: [CHEST_ONCE], applied: [] };
    await press('Use mine with 2 changes');
    expect(mockApi.GET).toHaveBeenCalledWith('/v1/program/review');
    expect(router.getPathname()).toBe('/onboarding/review');
    expect(screen.getByText(t('onboarding.review.changed'))).toBeOnTheScreen();
    expect(screen.queryByText('Squat: 6-10 reps')).toBeNull();
    expect(toggle(CHEST_ONCE).props.value).toBe(true);
    await press('Use mine with 1 change');
    expect(applies()[1][1]).toEqual({ body: { reviewId: 'r9', suggestionIds: [CHEST_ONCE.id] } });
  });

  test('a stale review that cannot be read again: said so, not called reviewed again', async () => {
    await toReview();
    mockApi.POST.mockImplementationOnce(async () => ({ error: { code: 'CONFLICT' }, response: new Response(null, { status: 409 }) }));
    mockApi.GET.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    await press('Use mine with 3 changes');
    expect(screen.getByText(t('onboarding.review.loadFailed'))).toBeOnTheScreen();
    expect(screen.queryByText(t('onboarding.review.changed'))).toBeNull();
  });

  test('no connection: said, the walk waits, the same picks can go again', async () => {
    const router = await toReview();
    mockApi.POST.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    await press('Use mine with 3 changes');
    expect(screen.getByText(t('onboarding.review.failed.NoConnection'))).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/onboarding/review');
    await press('Use mine with 3 changes');
    expect(applies()).toHaveLength(2);
    expect(applies()[1]).toEqual(applies()[0]);
    expect(router.getPathname()).toBe('/onboarding/health-data');
  });

  test("the user's own moves are not reviewed, and it says so in one line", async () => {
    mockReview = { ...REVIEW, notReviewedMoves: 2 };
    await toReview();
    expect(screen.getByText(t('onboarding.review.notReviewed', { count: 2 }))).toBeOnTheScreen();
  });

  test('none of their own: no such line', async () => {
    await toReview();
    expect(screen.queryByText(t('onboarding.review.notReviewed', { count: 0 }))).toBeNull();
  });

  test('nothing to suggest: said so, and the way on is Keep mine as is', async () => {
    mockReview = { ...REVIEW, suggestions: [] };
    await toReview();
    expect(screen.getByRole('header', { name: t('onboarding.review.headline.none') })).toBeOnTheScreen();
    expect(screen.queryByRole('switch')).toBeNull();
    await press(t('onboarding.review.keep'));
    expect(applies()).toEqual([]);
  });

  test('a program kept without its review (an older server): the review is read', async () => {
    mockReview = { ...REVIEW, suggestions: [SQUAT_REPS] };
    mockApi.PUT.mockImplementation(async (route: string, init: Init) => {
      if (route !== '/v1/program') return mockAnswer(route, init);
      const { review: _left, ...program } = kept(init.body as Schemas['OwnProgram']);
      return ok(program);
    });
    await toReview();
    expect(mockApi.GET).toHaveBeenCalledWith('/v1/program/review');
    expect(screen.getByText('Squat: 6-10 reps')).toBeOnTheScreen();
  });
});
