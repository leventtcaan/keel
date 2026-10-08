/**
 * The Train tab (K-405, K-217, K-970): the calls of the deload ladder in force, then today's card: the session the
 * server put on today (Program.week) with each move's sets × reps and next load, cardio, Start and Change; moved off
 * today, skipped or short as the server says; the rest of the week below. Offline, the copy kept on the phone, saying
 * so; no program, one line; a failed read, one line and a way to try again.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import TrainScreen from '@/app/(tabs)/train';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
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
  // Tuesday 29 Sep 2026 is today (below): Upper A is today's session, Lower A Thursday's.
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
const mockServices = {
  api: {},
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

test('moved off today: today is rest, the card says where it went and which days shifted with it, and the week marks them', async () => {
  mockData = withProgram({
    week: [
      { programDayId: 'a', date: '2026-09-30', moved: true, exerciseIds: ['bench_press', 'dip'] },
      { programDayId: 'b', date: '2026-10-02', moved: true, exerciseIds: ['squat'] },
    ],
  });
  await show();
  expect(await screen.findByText('Rest')).toBeTruthy();
  expect(screen.getByText('Moved to Wed. Today is rest.')).toBeTruthy();
  expect(screen.getByText('Then: Fri · Lower A.')).toBeTruthy();
  expect(screen.getAllByText(t('train.moved'))).toHaveLength(2);
  expect(screen.queryByText('Start workout')).toBeNull();
});

test('skipped: no catch-up, nothing to start or change', async () => {
  mockData = withProgram({ week: [{ programDayId: 'a', date: '2026-09-29', skipped: true, exerciseIds: ['bench_press', 'dip'] }, THURSDAY] });
  await show();
  expect(await screen.findByText('Skipped. Monday reads what happened.')).toBeTruthy();
  expect(screen.queryByText('Start workout')).toBeNull();
  expect(screen.queryByText('Change')).toBeNull();
});

test('a day without a session: rest, and any session of the week can be started from its row', async () => {
  mockData = withProgram({ week: [THURSDAY] });
  await show();
  expect(await screen.findByText(t('train.restDay'))).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Start Lower A'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/workout', params: { day: 'b' } });
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
      body: { clientId: 'w1', startedAt: '2026-09-29T08:00:00Z', programDayId: 'a' },
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
