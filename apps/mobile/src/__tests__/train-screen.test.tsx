/**
 * The Train tab (K-405, K-217, K-970): the calls of the deload ladder in force, then today's card: the session the
 * server put on today (Program.week) with each move's sets × reps and next load, cardio, Start and Change; moved off
 * today, skipped or short as the server says; the rest of the week below. Offline, the copy kept on the phone, saying
 * so; no program, one line; a failed read, one line and a way to try again.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import TrainScreen from '@/app/(tabs)/train';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { workoutParams } from '@/train/params';
import { ThemeProvider } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { CallRow } from '@/train/CallRow';
import type { Outbound } from '@/sync/queue';
import type { LocalRecord } from '@/sync/store';
import { type Move, type TrainData, ownMove } from '@/train/trainData';

type Schemas = components['schemas'];

const EXERCISES = [
  { id: 'bench_press', load: 'EXTERNAL', unilateral: false, equipment: 'BARBELL' },
  { id: 'dip', load: 'BODYWEIGHT_PLUS_EXTERNAL', unilateral: false, equipment: 'BODYWEIGHT' },
] as Schemas['Exercise'][];
const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [
    {
      id: 'a',
      nameKey: 'programDays.upper_a.name',
      weekday: 'TUESDAY',
      exercises: [
        { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 62.5, nextReps: 6 },
        { exerciseId: 'dip', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 10, nextReps: 8 },
      ],
    },
    {
      id: 'b',
      nameKey: 'programDays.lower_a.name',
      weekday: 'THURSDAY',
      exercises: [{ exerciseId: 'squat', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 }],
    },
  ],
  // Tuesday 29 Sep 2026 is today on the user's calendar, as the server says: Upper A is today's session, Lower A Thursday's.
  today: '2026-09-29',
  weekOf: '2026-09-28',
  week: [
    { programDayId: 'a', date: '2026-09-29', exerciseIds: ['bench_press', 'dip'] },
    { programDayId: 'b', date: '2026-10-01', exerciseIds: ['squat'] },
  ],
};
const THURSDAY = { programDayId: 'b', date: '2026-10-01', exerciseIds: ['squat'] };
const CARDIO: Schemas['ProgramCardio'] = {
  source: 'GENERATED',
  minutes: 30,
  sessionsPerWeek: 3,
  sessions: [{ weekday: 'TUESDAY', place: 'AFTER_LIFT' }],
  doneThisWeek: 0,
  afterLiftOverLine: false,
};

let mockData: TrainData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
const withProgram = (extra: Partial<Schemas['Program']>): TrainData => ({ ...mockData, program: { state: 'ready', value: { ...PROGRAM, ...extra } } });
const mockRead = jest.fn(async () => mockData);
let mockRecords: LocalRecord[] = [];
const mockRecord = jest.fn(async (_outbound: Outbound) => true);
let mockDeclared: Schemas['DeclaredState'] | null = null;
let mockOwn: Move[] = [];
let mockDecision: Schemas['Decision'] | null = null;
let mockCheckInDay: Schemas['Weekday'] | null = 'MONDAY';
const mockApplied = jest.fn();
const mockChanged = jest.fn();
let mockChangeAnswer: () => unknown = () => ({ data: PROGRAM, response: { status: 200 } });
let mockApplyStatus = 200;
// The server's open workout that is not on this phone (K-999): what GET /v1/workouts/{id} answers, and the delete.
const OPEN_ELSEWHERE: Schemas['Workout'] = {
  id: 'w9',
  clientId: 'other-phone-w',
  startedAt: '2026-09-29T07:30:00Z',
  programDayId: 'a',
  pausedSeconds: 0,
  sets: [{ id: 's-1', clientId: 'other-phone-s1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 62.5, reps: 8, rir: 2, side: 'BOTH' }],
};
let mockWorkout: () => unknown = () => ({ data: OPEN_ELSEWHERE, response: { status: 200 } });
let mockDelete: () => unknown = () => ({ response: { status: 204, ok: true } });
const mockAdopt = jest.fn(async (_workout: Schemas['Workout']) => {});
const mockWorkoutCalls = jest.fn();
const mockServices = {
  adoptWorkout: (workout: Schemas['Workout']) => mockAdopt(workout),
  api: {
    DELETE: async (path: string, init?: unknown) => {
      mockWorkoutCalls('DELETE', path, init);
      return mockDelete();
    },
    GET: async (path: string, init?: unknown) => {
      if (path === '/v1/workouts/{id}') {
        mockWorkoutCalls('GET', path, init);
        return mockWorkout();
      }
      if (path === '/v1/decisions/current' && mockDecision !== null) return { data: mockDecision, response: { status: 200 } };
      // The user's check-in day: the day "reads what happened" after a skip (user test 10 Oct).
      if (path === '/v1/profile' && mockCheckInDay !== null) return { data: { schedule: { checkInDay: mockCheckInDay } }, response: { status: 200 } };
      return { response: { status: 404 } };
    },
    POST: async (path: string, init?: unknown) => {
      if (path === '/v1/program/today') {
        mockChanged(path, init);
        return mockChangeAnswer();
      }
      mockApplied(path, init);
      return mockApplyStatus === 200 ? { data: mockDecision, response: { status: 200 } } : { error: { code: 'X' }, response: { status: mockApplyStatus } };
    },
  },
  training: { read: mockRead, own: async () => mockOwn },
  state: { current: async () => mockDeclared },
  workoutRecords: async () => mockRecords,
  queue: { record: (outbound: Outbound) => mockRecord(outbound) },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => 'METRIC',
}));
const mockPush = jest.fn();
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-workout' }));
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));

beforeAll(() => {
  // Tuesday 29 Sep 2026 on the phone's calendar; only the date is fake.
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 9, 0),
    doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
});
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  jest.clearAllMocks();
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
  mockDeclared = null;
  mockRecords = [];
  mockOwn = [];
  mockDecision = null;
  mockCheckInDay = 'MONDAY';
  mockChangeAnswer = () => ({ data: PROGRAM, response: { status: 200 } });
  mockApplyStatus = 200;
  mockWorkout = () => ({ data: OPEN_ELSEWHERE, response: { status: 200 } });
  mockDelete = () => ({ response: { status: 204, ok: true } });
});

const DECISION = {
  id: 'd1',
  madeOn: '2026-09-28',
  action: { type: 'STOP_LOAD_INCREASE' },
  reasons: [],
  confidence: 'MEDIUM',
  nextReview: '2026-10-05',
  copyKey: 'decision.stop_load_increase.plateau',
  application: { state: 'APPLIED' },
  declinable: true,
} as unknown as Schemas['Decision'];

describe('the head of the tab', () => {
  test('Edit opens the program editor', async () => {
    await show();
    await fireEvent.press(await screen.findByLabelText(t('editProgram.editLabel')));
    expect(mockPush).toHaveBeenCalledWith('/edit-program');
  });

  test('changes from the review in force: how many, and the way to undo each', async () => {
    const applied = [{ id: 'c1', appliedAt: '2026-09-28T10:00:00Z', suggestion: {} }, { id: 'c2', appliedAt: '2026-09-28T10:00:00Z', suggestion: {} }];
    mockData = withProgram({ review: { id: 'r', suggestions: [], applied } as unknown as Schemas['ProgramReview'] });
    await show();
    await fireEvent.press(await screen.findByText('2 changes applied'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/edit-program', params: { part: 'changes' } });
  });

  test("this week's call, in its words", async () => {
    mockDecision = DECISION;
    await show();
    expect(await screen.findByText('Keep the same weight this week.')).toBeTruthy();
  });

  test('a call kept from last week (declined): not applied, and one tap uses it', async () => {
    mockDecision = { ...DECISION, application: { state: 'DECLINED' } } as Schemas['Decision'];
    await show();
    expect(await screen.findByText(t('train.call.notApplied'))).toBeTruthy();
    const reads = mockRead.mock.calls.length;
    await fireEvent.press(screen.getByText(t('train.call.use')));
    expect(mockApplied).toHaveBeenCalledWith('/v1/decisions/{id}/apply', { params: { path: { id: 'd1' } } });
    // Then the tab reads again: the call in force is the server's.
    expect(mockRead.mock.calls.length).toBe(reads + 1);
  });

  test('a call that is past (409): said, and the tab reads again (the offer goes with the old call)', async () => {
    mockDecision = { ...DECISION, application: { state: 'DECLINED' } } as Schemas['Decision'];
    mockApplyStatus = 409;
    await show();
    const reads = mockRead.mock.calls.length;
    await fireEvent.press(await screen.findByText(t('train.call.use')));
    expect(await screen.findByText(t('today.call.applyRefused'))).toBeTruthy();
    expect(mockRead.mock.calls.length).toBe(reads + 1);
  });

  test('the same failure twice is said twice (VoiceOver hears each)', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    mockDecision = { ...DECISION, application: { state: 'DECLINED' } } as Schemas['Decision'];
    mockApplyStatus = 500;
    await show();
    const use = await screen.findByText(t('train.call.use'));
    await fireEvent.press(use);
    await fireEvent.press(use);
    expect(said.mock.calls.filter(([words]) => words === t('today.call.applyError'))).toHaveLength(2);
  });

  test("a new call clears the last one's failure", async () => {
    const declined = (id: string) => ({ ...DECISION, id, application: { state: 'DECLINED' } }) as Schemas['Decision'];
    mockApplyStatus = 500;
    const row = (decision: Schemas['Decision']) => (
      <ThemeProvider>
        <CallRow decision={decision} onChanged={() => undefined} />
      </ThemeProvider>
    );
    const { rerender } = await render(row(declined('d1')));
    await fireEvent.press(screen.getByText(t('train.call.use')));
    expect(await screen.findByText(t('today.call.applyError'))).toBeTruthy();
    await rerender(row(declined('d2')));
    expect(screen.queryByText(t('today.call.applyError'))).toBeNull();
  });

  test('no call yet: no row', async () => {
    mockDecision = { ...DECISION, action: { type: 'NO_DECISION_YET' } } as unknown as Schemas['Decision'];
    await show();
    expect(await screen.findByText('Upper A')).toBeTruthy();
    expect(screen.queryByText(t('train.call.notApplied'))).toBeNull();
    expect(screen.queryByText(/Not yet/)).toBeNull();
  });
});

const show = () =>
  render(
    <ThemeProvider>
      <TrainScreen />
    </ThemeProvider>,
  );

test("today's card is the session the server put on today, by its day's name: each move with sets × reps and the next load", async () => {
  await show();
  const card = await screen.findByTestId('today-card');
  expect(card).toHaveTextContent(/Today · Tue/);
  expect(card).toHaveTextContent(/2 moves/);
  expect(screen.getByText('Upper A')).toBeTruthy();
  expect(screen.getByText('Bench press')).toBeTruthy();
  expect(screen.getAllByText('3 × 6-10')).toHaveLength(2);
  expect(screen.getByText('62.5 kg')).toBeTruthy();
  // An added load (a weighted dip) with its plus.
  expect(screen.getByText('+10 kg')).toBeTruthy();
  // The split from the days' names, and how many days.
  expect(screen.getByText('Upper / Lower · 2 days')).toBeTruthy();
  // The rest of the week below, on the weekday of its date; the other day's moves are not today's.
  expect(screen.getByText('Thu · Lower A')).toBeTruthy();
  expect(screen.queryByText('Squat')).toBeNull();
});

test('while loads are held, each load says so', async () => {
  mockData = withProgram({ loadHeldSince: '2026-09-21' });
  await show();
  expect(await screen.findByText('62.5 kg')).toBeTruthy();
  expect(screen.getAllByText(t('train.held'))).toHaveLength(2);
});

test("the short version: only the moves the server kept, marked short, cardio optional", async () => {
  mockData = withProgram({ week: [{ programDayId: 'a', date: '2026-09-29', short: true, exerciseIds: ['bench_press'] }], cardio: CARDIO });
  await show();
  const card = await screen.findByTestId('today-card');
  expect(card).toHaveTextContent(/Short version/);
  expect(screen.getByText('Bench press')).toBeTruthy();
  expect(screen.queryByText('Dip')).toBeNull();
  expect(screen.getByText('Cardio, easy')).toBeTruthy();
  expect(screen.getByText('Optional today')).toBeTruthy();
});

test("today's cardio follows the lifting, with the server's minutes", async () => {
  mockData = withProgram({ cardio: CARDIO });
  await show();
  expect(await screen.findByText('Cardio, easy')).toBeTruthy();
  expect(screen.getByText('After lifting')).toBeTruthy();
  expect(screen.getByText('30 min')).toBeTruthy();
});

test('no cardio on a day the server put none', async () => {
  mockData = withProgram({ cardio: { ...CARDIO, sessions: [{ weekday: 'MONDAY', place: 'AFTER_LIFT' }] } });
  await show();
  expect(await screen.findByText('Bench press')).toBeTruthy();
  expect(screen.queryByText('Cardio, easy')).toBeNull();
});

// `moved` says only that a session is not on its usual day: where today's went, and which moves shifted with it, the
// server does not say yet (K-995). The card says nothing it would have to guess; the week marks what the server marks.
test('moved sessions are marked in the week; today is rest, and the card does not guess which one was today\'s', async () => {
  mockData = withProgram({
    week: [
      { programDayId: 'a', date: '2026-09-30', moved: true, exerciseIds: ['bench_press', 'dip'] },
      { programDayId: 'b', date: '2026-10-02', moved: true, exerciseIds: ['squat'] },
    ],
  });
  await show();
  expect(await screen.findByText('Rest')).toBeTruthy();
  expect(screen.getAllByText(t('train.moved'))).toHaveLength(2);
  expect(screen.getByText('Wed · Upper A')).toBeTruthy();
  expect(screen.queryByText(/Moved to/)).toBeNull();
  expect(screen.queryByText(/Then:/)).toBeNull();
  expect(screen.queryByText('Start workout')).toBeNull();
});

test('a session moved again, and two moves in one week: no chain is told on the card', async () => {
  const monday = { id: 'm', nameKey: 'programDays.push.name', weekday: 'MONDAY' as const, exercises: [] };
  mockData = withProgram({
    days: [...PROGRAM.days, monday],
    // Monday's moved to Wednesday, then on to Friday; Tuesday's moved to Thursday, Thursday's to Saturday.
    week: [
      { programDayId: 'a', date: '2026-10-01', moved: true, exerciseIds: ['bench_press', 'dip'] },
      { programDayId: 'm', date: '2026-10-02', moved: true, exerciseIds: [] },
      { programDayId: 'b', date: '2026-10-03', moved: true, exerciseIds: ['squat'] },
    ],
  });
  await show();
  expect(await screen.findByText('Rest')).toBeTruthy();
  expect(screen.getAllByText(t('train.moved'))).toHaveLength(3);
  expect(screen.queryByText(/Moved to/)).toBeNull();
  expect(screen.queryByText(/Then:/)).toBeNull();
});

test('skipped: no catch-up, nothing to start or change', async () => {
  mockData = withProgram({ week: [{ programDayId: 'a', date: '2026-09-29', skipped: true, exerciseIds: ['bench_press', 'dip'] }, THURSDAY] });
  await show();
  expect(await screen.findByText('Skipped. Monday reads what happened.')).toBeTruthy();
  expect(screen.queryByText('Start workout')).toBeNull();
  expect(screen.queryByText('Change')).toBeNull();
});

test("skipped: the day that reads what happened is the user's check-in day, not always Monday (user test 10 Oct)", async () => {
  mockCheckInDay = 'SUNDAY';
  mockData = withProgram({ week: [{ programDayId: 'a', date: '2026-09-29', skipped: true, exerciseIds: ['bench_press', 'dip'] }, THURSDAY] });
  await show();
  expect(await screen.findByText('Skipped. Sunday reads what happened.')).toBeTruthy();
  expect(screen.queryByText(/Monday/)).toBeNull();
});

test("skipped, the check-in day not known (profile not read): no day is made up", async () => {
  mockCheckInDay = null;
  mockData = withProgram({ week: [{ programDayId: 'a', date: '2026-09-29', skipped: true, exerciseIds: ['bench_press', 'dip'] }, THURSDAY] });
  await show();
  expect(await screen.findByText(t('train.skippedNoDay'))).toBeTruthy();
});

describe("this week's list marks the sessions that are done (user test 10 Oct)", () => {
  // Monday 28 Sep, a day before today: a session of the week gone by.
  const MONDAY = { programDayId: 'c', date: '2026-09-28', exerciseIds: ['squat'] };
  const days = [...PROGRAM.days, { id: 'c', nameKey: 'programDays.full_body_a.name', weekday: 'MONDAY' as const, exercises: [PROGRAM.days[1].exercises[0]] }];
  const record = (seq: number, kind: string, clientId: string, parentClientId: string | null, body: unknown): LocalRecord =>
    ({ seq, clientId, kind, parentClientId, body, state: 'PENDING', serverId: null, serverBody: null, errorCode: null }) as LocalRecord;

  test("the server's DONE: a tick and \"Done\" on that row, no \"Start this\"; the other rows are as before", async () => {
    // No session today, so the rows of the week can be started: the done one cannot.
    mockData = withProgram({ days, week: [{ ...MONDAY, workout: { id: 'w1', state: 'DONE' } }, THURSDAY] });
    await show();
    expect(await screen.findAllByLabelText(t('train.doneTag'))).toHaveLength(1);
    expect(screen.queryByLabelText(t('train.startDay', { day: 'Full body A' }))).toBeNull();
    expect(screen.getByLabelText(t('train.startDay', { day: 'Lower A' }))).toBeTruthy();
  });

  test("finished on this phone (its finish may still wait to be sent): done on the row before the server knows", async () => {
    mockRecords = [
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: new Date(2026, 8, 28, 18, 0).toISOString(), programDayId: 'c' }),
      record(2, 'finish', 'f1', 'wo', { endedAt: new Date(2026, 8, 28, 19, 0).toISOString(), uncleanExerciseIds: [] }),
    ];
    mockData = withProgram({ days, week: [MONDAY, THURSDAY] });
    await show();
    expect(await screen.findAllByLabelText(t('train.doneTag'))).toHaveLength(1);
    expect(screen.queryByLabelText(t('train.startDay', { day: 'Full body A' }))).toBeNull();
  });

  test("the session is matched by its program day, not by its date: Monday's session done on Tuesday still ticks Monday's row (the contract's SessionWorkout is the day's latest of the week)", async () => {
    mockRecords = [
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: new Date(2026, 8, 29, 8, 0).toISOString(), programDayId: 'c' }),
      record(2, 'finish', 'f1', 'wo', { endedAt: new Date(2026, 8, 29, 9, 0).toISOString(), uncleanExerciseIds: [] }),
    ];
    mockData = withProgram({ days, week: [MONDAY, THURSDAY] });
    await show();
    expect(await screen.findAllByLabelText(t('train.doneTag'))).toHaveLength(1);
    expect(screen.queryByLabelText(t('train.startDay', { day: 'Full body A' }))).toBeNull();
    expect(screen.getByLabelText(t('train.startDay', { day: 'Lower A' }))).toBeTruthy(); // Thursday's was not done
  });

  test("a workout of the same program day from an earlier week is not this week's: the row stays open", async () => {
    mockRecords = [
      record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: new Date(2026, 8, 21, 18, 0).toISOString(), programDayId: 'c' }),
      record(2, 'finish', 'f1', 'wo', { endedAt: new Date(2026, 8, 21, 19, 0).toISOString(), uncleanExerciseIds: [] }),
    ];
    mockData = withProgram({ days, week: [MONDAY, THURSDAY] });
    await show();
    await screen.findByText(t('train.thisWeek'));
    expect(screen.queryByLabelText(t('train.doneTag'))).toBeNull();
    expect(screen.getByLabelText(t('train.startDay', { day: 'Full body A' }))).toBeTruthy();
  });

  test("a copy kept offline: a session the server said DONE stays done (a finished session does not come undone), tick and no Start agree", async () => {
    mockData = { ...withProgram({ days, week: [{ ...MONDAY, workout: { id: 'w1', state: 'DONE' } }, THURSDAY] }), kept: true };
    await show();
    expect(await screen.findAllByLabelText(t('train.doneTag'))).toHaveLength(1);
    expect(screen.queryByLabelText(t('train.startDay', { day: 'Full body A' }))).toBeNull();
    expect(screen.getByLabelText(t('train.startDay', { day: 'Lower A' }))).toBeTruthy();
  });

  test("a copy kept offline: today's session the server said DONE is done on the card too (no Start), as its week row is ticked: one word for both", async () => {
    mockData = { ...withProgram({ days, week: [{ ...MONDAY, workout: { id: 'w1', state: 'DONE' } }, { ...PROGRAM.week![0], workout: { id: 'w2', state: 'DONE' } }, THURSDAY] }), kept: true };
    await show();
    expect(await screen.findByText(t('train.doneToday'))).toBeTruthy();
    expect(screen.queryByText('Start workout')).toBeNull();
    expect(screen.getAllByLabelText(t('train.doneTag'))).toHaveLength(1); // Monday's row
  });

  test('a copy kept offline: an OPEN session of the copy is still not believed (it may be closed since)', async () => {
    mockData = { ...withProgram({ week: [{ ...PROGRAM.week![0], workout: { id: 'w2', state: 'OPEN' } }, THURSDAY] }), kept: true };
    await show();
    expect(await screen.findByText('Start workout')).toBeTruthy();
  });

  test('nothing done, nothing marked: an empty past day says nothing (U7)', async () => {
    mockData = withProgram({ days, week: [MONDAY, PROGRAM.week![0], THURSDAY] });
    await show();
    await screen.findByText(t('train.thisWeek'));
    expect(screen.queryByLabelText(t('train.doneTag'))).toBeNull();
  });

  test('a skipped session keeps its own tag, not a tick', async () => {
    mockData = withProgram({ days, week: [{ ...MONDAY, skipped: true }, PROGRAM.week![0], THURSDAY] });
    await show();
    expect(await screen.findByText(t('train.skippedTag'))).toBeTruthy();
    expect(screen.queryByLabelText(t('train.doneTag'))).toBeNull();
  });
});

test('a day without a session: rest, and any session of the week can be started from its row', async () => {
  mockData = withProgram({ week: [THURSDAY] });
  await show();
  expect(await screen.findByText(t('train.restDayPick'))).toBeTruthy();
  const start = screen.getByLabelText('Start Lower A');
  // A full-size button (at least size.touch tall), not the small one.
  expect(start).toHaveStyle({ paddingVertical: tokens.space.md });
  await fireEvent.press(start);
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/workout', params: { day: 'b' } });
});

test('nothing to start below (a workout under way, or the rest skipped): rest, without pointing below', async () => {
  mockData = withProgram({ week: [{ ...THURSDAY, skipped: true }] });
  await show();
  expect(await screen.findByText(t('train.restDay'))).toBeTruthy();
  expect(screen.queryByText(t('train.restDayPick'))).toBeNull();
  expect(screen.queryByLabelText('Start Lower A')).toBeNull();
});

test('each move of today has its swap, named for VoiceOver, opening the swap of that planned move', async () => {
  const swapped = { exerciseId: 'dumbbell_bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, swapOptions: ['push_up'] };
  mockData = withProgram({
    days: [{ ...PROGRAM.days[0], exercises: PROGRAM.days[0].exercises.map((e, i) => ({ ...e, swapOptions: [i === 0 ? 'dumbbell_bench_press' : 'push_up'] })) }, PROGRAM.days[1]],
    week: [{ programDayId: 'a', date: '2026-09-29', exerciseIds: ['dumbbell_bench_press', 'dip'], swaps: [{ insteadOf: 'bench_press', exercise: swapped }] }],
  });
  await show();
  // Swapped for today: the card shows the move in its place, and its swap names the planned one.
  expect(await screen.findByText('Dumbbell bench press')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Swap Dumbbell bench press'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/swap', params: { day: 'a', move: 'bench_press' } });
  expect(screen.getByLabelText('Swap Dip')).toBeTruthy();
});

test('two quick taps on a swap open one sheet', async () => {
  mockData = withProgram({ days: [{ ...PROGRAM.days[0], exercises: PROGRAM.days[0].exercises.map((e) => ({ ...e, swapOptions: ['push_up'] })) }, PROGRAM.days[1]] });
  await show();
  const swap = await screen.findByLabelText('Swap Bench press');
  await fireEvent.press(swap);
  await fireEvent.press(swap);
  await fireEvent.press(screen.getByLabelText(t('train.changeLabel')));
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test("a workout under way: no swap on the card (the workout swaps its own moves)", async () => {
  mockData = withProgram({ days: [{ ...PROGRAM.days[0], exercises: PROGRAM.days[0].exercises.map((e) => ({ ...e, swapOptions: ['push_up'] })) }, PROGRAM.days[1]] });
  mockRecords = [
    {
      seq: 1,
      clientId: 'w1',
      kind: 'workout',
      parentClientId: null,
      body: { clientId: 'w1', startedAt: new Date(Date.now() - 60 * 60_000).toISOString(), programDayId: 'a' },
      state: 'PENDING',
      serverId: null,
      serverBody: null,
      errorCode: null,
    },
  ];
  await show();
  expect(await screen.findByText('Continue workout')).toBeTruthy();
  expect(screen.queryByLabelText('Swap Bench press')).toBeNull();
});

test('a move with nothing to swap to (the server sent no options) has no swap', async () => {
  await show();
  expect(await screen.findByText('Bench press')).toBeTruthy();
  expect(screen.queryByLabelText('Swap Bench press')).toBeNull();
});

test("Change opens today's changes for today's session", async () => {
  await show();
  await fireEvent.press(await screen.findByLabelText(t('train.changeLabel')));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/today-change', params: { day: 'a' } });
});

test('a target stopped at the ceiling says the rack ends, under that move only (K-534)', async () => {
  const rackEnds = { ...PROGRAM.days[0].exercises[1], nextLoadKg: 10, nextReps: 15, rackEnds: true };
  mockData = withProgram({ days: [{ ...PROGRAM.days[0], exercises: [PROGRAM.days[0].exercises[0], rackEnds] }, PROGRAM.days[1]] });
  await show();
  expect(await screen.findByText('Upper A')).toBeTruthy();

  expect(screen.getAllByText(t('train.rackEnds'))).toHaveLength(1);
});

test('the calls in force are said above the card: a week off with its note and nothing to start, a lighter week', async () => {
  mockData = withProgram({ restUntil: '2026-10-04', deload: { setsFactor: 0.5, until: '2026-10-11' } });
  await show();
  expect(await screen.findByText('A week off training, until Oct 4.')).toBeTruthy();
  expect(screen.getByText('Rest is the plan this week. Your program picks up after it.')).toBeTruthy();
  expect(screen.getByText('A lighter week, until Oct 11: fewer sets, the same weights.')).toBeTruthy();
  expect(screen.queryByText('Start workout')).toBeNull();
});

test("a lighter week: today's sets are this week's", async () => {
  mockData = withProgram({
    deload: { setsFactor: 0.5, until: '2026-10-11' },
    days: [{ ...PROGRAM.days[0], exercises: [{ ...PROGRAM.days[0].exercises[0], sets: 2 }] }, PROGRAM.days[1]],
    week: [{ programDayId: 'a', date: '2026-09-29', exerciseIds: ['bench_press'] }],
  });
  await show();
  expect(await screen.findByText('2 × 6-10')).toBeTruthy();
});

test("a busy week: its least dose above the card, the program's own sets as they are (K-528, U2)", async () => {
  mockDeclared = { kind: 'BUSY', since: '2026-09-28', busyDose: { sessions: 1, setsPerExercise: 1, keepLoad: true } };
  await show();
  expect(await screen.findByText("A busy week: one session with one set per exercise, at your usual weights, keeps what you've built. Anything more is a bonus.")).toBeTruthy();
  expect(screen.getAllByText('3 × 6-10').length).toBeGreaterThan(0);
});

test('offline, the program kept on the phone, and it says so', async () => {
  mockData = { ...mockData, kept: true };
  await show();
  expect(await screen.findByText("You're offline. This is your program as it was last loaded.")).toBeTruthy();
  expect(screen.getByText('Upper A')).toBeTruthy();
});

test('while the first read is on its way: a calm loading sign under the title, said to VoiceOver; gone once read', async () => {
  let answer: (data: TrainData) => void = () => undefined;
  mockRead.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
  await show();
  expect(screen.getByLabelText(t('train.loading'))).toBeTruthy();
  await act(async () => answer(mockData));
  expect(await screen.findByText('Upper A')).toBeTruthy();
  expect(screen.queryByLabelText(t('train.loading'))).toBeNull();
});

test('no program yet: one line', async () => {
  mockData = { program: { state: 'none' }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
  await show();
  expect(await screen.findByText('No program yet.')).toBeTruthy();
});

test('a failed read says so once, and trying again reads again', async () => {
  mockData = { program: { state: 'failed', problem: 'NoConnection' }, exercises: { state: 'failed', problem: 'NoConnection' }, kept: false };
  await show();
  expect(await screen.findByText("Your program couldn't load.")).toBeTruthy();
  await fireEvent.press(screen.getByText('Try again'));
  expect(mockRead).toHaveBeenCalledTimes(2);
});

test("today's session starts a workout: the session opens on that day, and nothing is kept until a set is logged", async () => {
  await show();
  await fireEvent.press(await screen.findByText('Start workout'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/workout', params: { day: 'a' } });
  expect(mockRecord).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Start Upper A')).toBeTruthy();
});

test('two quick taps on Start open the session once', async () => {
  await show();
  const start = await screen.findByText('Start workout');
  // The screen has not come up yet (no focus change in between): the second tap is the same tap.
  await fireEvent.press(start);
  await fireEvent.press(start);
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test('a workout under way is continued, not started again', async () => {
  mockRecords = [
    {
      seq: 1,
      clientId: 'w1',
      kind: 'workout',
      parentClientId: null,
      body: { clientId: 'w1', startedAt: new Date(Date.now() - 60 * 60_000).toISOString(), programDayId: 'a' },
      state: 'PENDING',
      serverId: null,
      serverBody: null,
      errorCode: null,
    },
  ];
  await show();
  expect(await screen.findByText('Continue workout')).toBeTruthy();
  expect(screen.queryByText('Start workout')).toBeNull();
  await fireEvent.press(screen.getByText('Continue workout'));
  expect(mockPush).toHaveBeenCalledWith('/workout');
  expect(mockRecord).not.toHaveBeenCalled();
});

test("a workout left open past the server's close is not continued: the server closed it, and today's session starts", async () => {
  mockRecords = [
    {
      seq: 1,
      clientId: 'w1',
      kind: 'workout',
      parentClientId: null,
      body: { clientId: 'w1', startedAt: new Date(Date.now() - (workoutParams.unfinishedSessionCloseHours + 2) * 3_600_000).toISOString(), programDayId: 'a' },
      state: 'PENDING',
      serverId: null,
      serverBody: null,
      errorCode: null,
    },
  ];
  await show();
  expect(await screen.findByText('Start workout')).toBeTruthy();
  expect(screen.queryByText('Continue workout')).toBeNull();
});

test('under way on this phone, offline (the server knows nothing yet): continued, and nothing to change or swap', async () => {
  mockRecords = [
    {
      seq: 1,
      clientId: 'w1',
      kind: 'workout',
      parentClientId: null,
      body: { clientId: 'w1', startedAt: new Date(Date.now() - 60 * 60_000).toISOString(), programDayId: 'a' },
      state: 'PENDING',
      serverId: null,
      serverBody: null,
      errorCode: null,
    },
  ];
  mockData = withProgram({
    days: [{ ...PROGRAM.days[0], exercises: PROGRAM.days[0].exercises.map((e) => ({ ...e, swapOptions: ['push_up'] })) }, PROGRAM.days[1]],
  });
  await show();
  expect(await screen.findByText('Continue workout')).toBeTruthy();
  expect(screen.queryByLabelText(t('train.changeLabel'))).toBeNull();
  expect(screen.queryByLabelText('Swap Bench press')).toBeNull();
});

test('finished on this phone, the finish still in the queue: done, no second session to start', async () => {
  mockRecords = [
    {
      seq: 1,
      clientId: 'w1',
      kind: 'workout',
      parentClientId: null,
      body: { clientId: 'w1', startedAt: '2026-09-29T08:00:00Z', programDayId: 'a' },
      state: 'PENDING',
      serverId: null,
      serverBody: null,
      errorCode: null,
    },
    {
      seq: 2,
      clientId: 'f1',
      kind: 'finish',
      parentClientId: 'w1',
      body: { endedAt: '2026-09-29T08:50:00Z' },
      state: 'PENDING',
      serverId: null,
      serverBody: null,
      errorCode: null,
    },
  ];
  await show();
  expect(await screen.findByText(t('train.doneToday'))).toBeTruthy();
  expect(screen.queryByText('Start workout')).toBeNull();
  expect(screen.queryByText('Continue workout')).toBeNull();
});

/** A workout finished on this phone today (Tuesday 29 Sep), the finish still in the queue. */
const finishedToday = (programDayId: string | null): LocalRecord[] => [
  { seq: 1, clientId: 'w1', kind: 'workout', parentClientId: null, body: { clientId: 'w1', startedAt: '2026-09-29T08:00:00Z', programDayId }, state: 'PENDING', serverId: null, serverBody: null, errorCode: null },
  { seq: 2, clientId: 'f1', kind: 'finish', parentClientId: 'w1', body: { endedAt: '2026-09-29T08:50:00Z' }, state: 'PENDING', serverId: null, serverBody: null, errorCode: null },
];

test("another day's session finished here while today's was planned: the day has its workout, done, no Start", async () => {
  mockRecords = finishedToday('b');
  await show();
  expect(await screen.findByText(t('train.doneToday'))).toBeTruthy();
  expect(screen.queryByText('Start workout')).toBeNull();
});

test('a free workout finished here (no program day): done, no Start', async () => {
  mockRecords = finishedToday(null);
  await show();
  expect(await screen.findByText(t('train.doneToday'))).toBeTruthy();
  expect(screen.queryByText('Start workout')).toBeNull();
});

test('a day without a session, one of the week picked and finished here: done', async () => {
  mockData = withProgram({ week: [THURSDAY] });
  mockRecords = finishedToday('b');
  await show();
  expect(await screen.findByText(t('train.doneToday'))).toBeTruthy();
});

test("another day's session finished here while today's was planned: the card names the day that was done, not the planned one", async () => {
  mockRecords = finishedToday('b');
  await show();
  expect(await screen.findByRole('header', { name: 'Lower A' })).toBeTruthy();
  expect(screen.queryByRole('header', { name: 'Upper A' })).toBeNull();
  expect(screen.getByText(t('train.doneToday'))).toBeTruthy();
});

test('a day without a session, one of the week picked and finished here: the card names that day, not Rest', async () => {
  mockData = withProgram({ week: [THURSDAY] });
  mockRecords = finishedToday('b');
  await show();
  expect(await screen.findByRole('header', { name: 'Lower A' })).toBeTruthy();
  expect(screen.queryByRole('header', { name: 'Rest' })).toBeNull();
  expect(screen.getByText(t('train.doneToday'))).toBeTruthy();
});

test('a week off from a copy kept before it ended: not a week off now, today starts as usual', async () => {
  mockData = { ...withProgram({ restUntil: '2026-09-20' }), kept: true };
  await show();
  expect(await screen.findByText('Start workout')).toBeTruthy();
  expect(screen.queryByText(t('train.status.restWeekNote'))).toBeNull();
});

test('the server says OPEN, nothing of it on this phone: open elsewhere; no Continue into an empty screen, no Start', async () => {
  mockData = withProgram({ week: [{ ...PROGRAM.week![0], workout: { id: 'w9', state: 'OPEN' } }, THURSDAY] });
  await show();
  expect(await screen.findByText(t('train.openElsewhere'))).toBeTruthy();
  expect(screen.queryByText('Continue workout')).toBeNull();
  expect(screen.queryByText('Start workout')).toBeNull();
});

describe('open on the server, not on this phone (K-999)', () => {
  const open = () => {
    mockData = withProgram({ week: [{ ...PROGRAM.week![0], workout: { id: 'w9', state: 'OPEN' } }, THURSDAY] });
  };
  const reads = () => mockRead.mock.calls.length;

  test('Continue, Fill in later and Discard on the card; still no Start', async () => {
    open();
    await show();
    expect(await screen.findByRole('button', { name: t('openElsewhere.continueLabel') })).toBeTruthy();
    expect(screen.getByRole('button', { name: t('openElsewhere.laterLabel') })).toBeTruthy();
    expect(screen.getByRole('button', { name: t('openElsewhere.discardLabel') })).toBeTruthy();
    expect(screen.queryByText('Start workout')).toBeNull();
  });

  test("Continue reads the server's workout, keeps it on the phone and opens the session on it", async () => {
    open();
    await show();
    await fireEvent.press(await screen.findByText(t('openElsewhere.continue')));
    expect(mockWorkoutCalls).toHaveBeenCalledWith('GET', '/v1/workouts/{id}', { params: { path: { id: 'w9' } } });
    expect(mockAdopt).toHaveBeenCalledWith(OPEN_ELSEWHERE);
    // The session screen without a day: it continues the workout the phone now keeps (not a new one on a day).
    expect(mockPush).toHaveBeenCalledWith('/workout');
  });

  test('no connection: the card says so and the same button tries again, and then opens it', async () => {
    open();
    mockWorkout = () => Promise.reject(new TypeError('Network request failed'));
    await show();
    await fireEvent.press(await screen.findByText(t('openElsewhere.continue')));
    expect(await screen.findByText(t('openElsewhere.offline'))).toBeTruthy();
    expect(mockAdopt).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    mockWorkout = () => ({ data: OPEN_ELSEWHERE, response: { status: 200 } });
    await fireEvent.press(screen.getByText(t('openElsewhere.continue')));
    await act(async () => {});
    expect(mockPush).toHaveBeenCalledWith('/workout');
    expect(screen.queryByText(t('openElsewhere.offline'))).toBeNull();
  });

  test('a refusal from the server is said as a failure, nothing kept', async () => {
    open();
    mockWorkout = () => ({ error: { code: 'X' }, response: { status: 500 } });
    await show();
    await fireEvent.press(await screen.findByText(t('openElsewhere.continue')));
    expect(await screen.findByText(t('openElsewhere.failed'))).toBeTruthy();
    expect(mockAdopt).not.toHaveBeenCalled();
  });

  test('ended meanwhile: said, nothing kept, and the tab reads the week again', async () => {
    open();
    mockWorkout = () => ({ data: { ...OPEN_ELSEWHERE, endedAt: '2026-09-29T08:30:00Z' }, response: { status: 200 } });
    await show();
    await screen.findByText(t('openElsewhere.continue'));
    const before = reads();
    await fireEvent.press(screen.getByText(t('openElsewhere.continue')));
    expect(await screen.findByText(t('openElsewhere.closed'))).toBeTruthy();
    expect(mockAdopt).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(reads()).toBe(before + 1);
  });

  test('Fill in later leaves it open and says it counts; nothing is sent', async () => {
    open();
    await show();
    await fireEvent.press(await screen.findByText(t('openElsewhere.later')));
    expect(screen.getByText(t('openElsewhere.laterSaid', { hours: workoutParams.unfinishedSessionCloseHours }))).toBeTruthy();
    expect(mockWorkoutCalls).not.toHaveBeenCalled();
    expect(mockAdopt).not.toHaveBeenCalled();
    // Continue stays.
    expect(screen.getByText(t('openElsewhere.continue'))).toBeTruthy();
  });

  test('Discard asks once more; Keep it goes back and deletes nothing', async () => {
    open();
    await show();
    await fireEvent.press(await screen.findByText(t('openElsewhere.discard')));
    expect(screen.getByText(t('workout.ending.discardAsk'))).toBeTruthy();
    expect(mockWorkoutCalls).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(t('workout.ending.keep')));
    expect(screen.getByText(t('openElsewhere.continue'))).toBeTruthy();
    expect(mockWorkoutCalls).not.toHaveBeenCalled();
  });

  test("Discard confirmed deletes the server's workout and the tab reads the week again", async () => {
    open();
    await show();
    await fireEvent.press(await screen.findByText(t('openElsewhere.discard')));
    const before = reads();
    await fireEvent.press(screen.getByText(t('workout.ending.confirm')));
    await act(async () => {});
    expect(mockWorkoutCalls).toHaveBeenCalledWith('DELETE', '/v1/workouts/{id}', { params: { path: { id: 'w9' } } });
    expect(reads()).toBe(before + 1);
  });

  test('Discard with no connection says so, deletes nothing here, and can be tried again', async () => {
    open();
    mockDelete = () => Promise.reject(new TypeError('Network request failed'));
    await show();
    await fireEvent.press(await screen.findByText(t('openElsewhere.discard')));
    const before = reads();
    await fireEvent.press(screen.getByText(t('workout.ending.confirm')));
    expect(await screen.findByText(t('openElsewhere.discardOffline'))).toBeTruthy();
    expect(reads()).toBe(before);
    expect(screen.getByText(t('workout.ending.confirm'))).toBeTruthy();
  });

  test('a workout under way on this phone is continued as before: no choice of the other kind', async () => {
    open();
    mockRecords = [{ seq: 1, clientId: 'wo', kind: 'workout', parentClientId: null, body: { clientId: 'wo', startedAt: '2026-09-29T08:00:00Z', programDayId: 'a' }, state: 'SYNCED', serverId: 'w9', serverBody: null, errorCode: null }];
    await show();
    expect(await screen.findByText(t('train.continueWorkout'))).toBeTruthy();
    expect(screen.queryByText(t('openElsewhere.continue'))).toBeNull();
  });
});

test("another day's session OPEN on the server is not today's: today's starts as usual", async () => {
  mockData = withProgram({ week: [PROGRAM.week![0], { ...THURSDAY, date: '2026-09-28', workout: { id: 'w9', state: 'OPEN' } }] });
  await show();
  expect(await screen.findByText('Start workout')).toBeTruthy();
});

test("offline with the copy kept yesterday: the phone's day is today, yesterday's DONE is not today's", async () => {
  // Kept on Monday 28 Sep (Monday done); the phone is on Tuesday 29 Sep, offline.
  mockData = {
    ...withProgram({ today: '2026-09-28', week: [{ ...PROGRAM.week![0] }, { ...THURSDAY, date: '2026-09-28', workout: { id: 'w0', state: 'DONE' } }] }),
    kept: true,
  };
  await show();
  const card = await screen.findByTestId('today-card');
  expect(card).toHaveTextContent(/Today · Tue/);
  expect(card).toHaveTextContent(/Upper A/);
  expect(screen.getByText('Start workout')).toBeTruthy();
  expect(screen.queryByText(t('train.doneToday'))).toBeNull();
});

test("offline with a kept copy, the kept Undo is not offered (the server's word was for then)", async () => {
  mockData = { ...withProgram({ week: [{ ...PROGRAM.week![0], skipped: true, undoable: true }, THURSDAY] }), kept: true };
  await show();
  expect(await screen.findByText('Skipped. Monday reads what happened.')).toBeTruthy();
  expect(screen.queryByLabelText(t('train.undoLabel'))).toBeNull();
});

test("today's session done: no Start, it says it is done, and nothing to change", async () => {
  mockData = withProgram({ week: [{ ...PROGRAM.week![0], workout: { id: 'w1', state: 'DONE' } }, THURSDAY] });
  await show();
  expect(await screen.findByText(t('train.doneToday'))).toBeTruthy();
  expect(screen.queryByText('Start workout')).toBeNull();
  expect(screen.queryByLabelText(t('train.changeLabel'))).toBeNull();
  // Not offered again from the week below either.
  expect(screen.queryByLabelText('Start Upper A')).toBeNull();
});

test("today is the server's day, not the phone's clock (travelling)", async () => {
  // The phone says Tuesday; the user's calendar is already Wednesday, where Lower A was moved.
  mockData = withProgram({ today: '2026-09-30', week: [{ ...PROGRAM.week![0] }, { ...THURSDAY, date: '2026-09-30', moved: true, movedFrom: '2026-10-01' }] });
  await show();
  const card = await screen.findByTestId('today-card');
  expect(card).toHaveTextContent(/Today · Wed/);
  expect(card).toHaveTextContent(/Lower A/);
});

describe("today's change undone (UNDO) and the full workout back (FULL)", () => {
  test("moved off today: where it went, from the server; Undo brings it back, shown from the server's answer at once", async () => {
    mockData = withProgram({ week: [{ ...PROGRAM.week![0], date: '2026-09-30', moved: true, movedFrom: '2026-09-29', undoable: true }, THURSDAY] });
    mockChangeAnswer = () => ({ data: PROGRAM, response: { status: 200 } });
    await show();
    expect(await screen.findByText('Moved to Wed. Today is rest.')).toBeTruthy();
    const reads = mockRead.mock.calls.length;
    // The read after the undo never ends: the card shows the answer itself.
    mockRead.mockImplementationOnce(() => new Promise(() => undefined));
    await fireEvent.press(screen.getByLabelText(t('train.undoLabel')));
    expect(mockChanged).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'a', change: 'UNDO' } });
    expect(mockRead.mock.calls.length).toBe(reads + 1);
    expect(await screen.findByText('Start workout')).toBeTruthy();
  });

  test('moved twice (on from its own day, then again today): Undo by the one the server marks undoable', async () => {
    mockData = withProgram({
      week: [{ ...PROGRAM.week![0], date: '2026-09-30', moved: true, movedFrom: '2026-09-28', undoable: true }, { ...THURSDAY, date: '2026-10-02', moved: true, movedFrom: '2026-09-29' }],
    });
    await show();
    expect(await screen.findByText('Moved to Wed. Today is rest.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(t('train.undoLabel')));
    expect(mockChanged).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'a', change: 'UNDO' } });
  });

  test('two taps on Undo send once', async () => {
    mockData = withProgram({ week: [{ ...PROGRAM.week![0], skipped: true, undoable: true }, THURSDAY] });
    let answer: (v: unknown) => void = () => undefined;
    mockChangeAnswer = () => new Promise((resolve) => (answer = resolve));
    await show();
    const undo = await screen.findByLabelText(t('train.undoLabel'));
    await fireEvent.press(undo);
    await fireEvent.press(undo);
    expect(mockChanged).toHaveBeenCalledTimes(1);
    await act(async () => answer({ data: PROGRAM, response: { status: 200 } }));
  });

  test("the full workout back the server refuses (409: the day turned): said so, and the week read again", async () => {
    mockData = withProgram({ week: [{ programDayId: 'a', date: '2026-09-29', short: true, exerciseIds: ['bench_press'] }, THURSDAY] });
    mockChangeAnswer = () => ({ error: { code: 'CONFLICT' }, response: { status: 409 } });
    await show();
    const reads = mockRead.mock.calls.length;
    await fireEvent.press(await screen.findByText(t('train.full')));
    expect(await screen.findByText(t('train.dayChanged'))).toBeTruthy();
    expect(mockRead.mock.calls.length).toBe(reads + 1);
  });

  test("an undo the server refuses (409: today's workout began): said so", async () => {
    mockData = withProgram({ week: [{ ...PROGRAM.week![0], skipped: true, undoable: true }, THURSDAY] });
    mockChangeAnswer = () => ({ error: { code: 'CONFLICT' }, response: { status: 409 } });
    await show();
    await fireEvent.press(await screen.findByLabelText(t('train.undoLabel')));
    expect(await screen.findByText(t('todayChange.started'))).toBeTruthy();
  });

  test('skipped today: Undo while the server says it can be undone', async () => {
    mockData = withProgram({ week: [{ ...PROGRAM.week![0], skipped: true, undoable: true }, THURSDAY] });
    await show();
    await fireEvent.press(await screen.findByLabelText(t('train.undoLabel')));
    expect(mockChanged).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'a', change: 'UNDO' } });
  });

  test('no Undo where the server does not offer it', async () => {
    mockData = withProgram({ week: [{ ...PROGRAM.week![0], skipped: true }, THURSDAY] });
    await show();
    expect(await screen.findByText('Skipped. Monday reads what happened.')).toBeTruthy();
    expect(screen.queryByLabelText(t('train.undoLabel'))).toBeNull();
  });

  test('an undo the server answered without undoing (the day turned meanwhile): not called undone', async () => {
    const still = { ...PROGRAM.week![0], skipped: true, undoable: true };
    mockData = withProgram({ week: [still, THURSDAY] });
    // As the server answers after midnight: nothing to undo now, its today the next day, the session still skipped and
    // no longer undoable.
    mockChangeAnswer = () => ({ data: { ...PROGRAM, today: '2026-09-30', week: [{ ...still, undoable: undefined }, THURSDAY] }, response: { status: 200 } });
    await show();
    await fireEvent.press(await screen.findByLabelText(t('train.undoLabel')));
    expect(await screen.findByText(t('train.notUndone'))).toBeTruthy();
  });

  test('the short version: Full workout brings every move back', async () => {
    mockData = withProgram({ week: [{ programDayId: 'a', date: '2026-09-29', short: true, exerciseIds: ['bench_press'] }, THURSDAY] });
    await show();
    await fireEvent.press(await screen.findByText(t('train.full')));
    expect(mockChanged).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'a', change: 'FULL' } });
  });
});

test('a move opens its history and records (K-415), named for a screen reader', async () => {
  await show();
  await fireEvent.press(await screen.findByLabelText('Bench press: history'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/exercise-history', params: { exercise: 'bench_press' } });
});

test("the user's own move in their program is named as they named it, never by its id (K-968)", async () => {
  const own = ownMove({ id: 'custom:8a1d', clientId: 'c1', name: 'Landmine press', kind: 'COMPOUND', load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false });
  mockOwn = [own];
  const day = { ...PROGRAM.days[0], exercises: [{ exerciseId: own.id, baseSets: 3, sets: 3, reps: { min: 8, max: 12 }, targetRir: 1 }] };
  mockData = withProgram({ source: 'OWN', days: [day], week: [{ programDayId: 'a', date: '2026-09-29', exerciseIds: [own.id] }] });
  await show();
  expect(await screen.findByText('Landmine press')).toBeTruthy();
  expect(screen.getByRole('button', { name: t('history.openLabel', { exercise: 'Landmine press' }) })).toBeTruthy();
  expect(screen.queryByText(/custom:/)).toBeNull();
  // Their own program is theirs, whatever its days are called.
  expect(screen.getByText('Your own program · 1 day')).toBeTruthy();
});
