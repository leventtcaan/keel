/**
 * The Train tab (K-405, K-217): the program as the server set it this week — the calls of the deload ladder in force,
 * each day with its moves, this week's sets and the next target — today's day marked. Offline, the copy kept on the
 * phone, saying so; no program, one line; a failed read, one line and a way to try again.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import TrainScreen from '@/app/(tabs)/train';
import type { components } from '@/api/schema';
import { ThemeProvider } from '@/theme/theme';
import type { Outbound } from '@/sync/queue';
import type { LocalRecord } from '@/sync/store';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const EXERCISES = [
  { id: 'bench_press', load: 'EXTERNAL', unilateral: false },
  { id: 'dip', load: 'BODYWEIGHT_PLUS_EXTERNAL', unilateral: false },
] as Schemas['Exercise'][];
const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [
    {
      id: 'a',
      nameKey: 'upper_a',
      weekday: 'MONDAY',
      exercises: [
        { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 62.5, nextReps: 6 },
        { exerciseId: 'dip', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 10, nextReps: 8 },
      ],
    },
    {
      id: 'b',
      nameKey: 'lower_a',
      weekday: 'TUESDAY',
      exercises: [{ exerciseId: 'squat', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 }],
    },
  ],
};

let mockData: TrainData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
const mockRead = jest.fn(async () => mockData);
let mockRecords: LocalRecord[] = [];
const mockRecord = jest.fn(async (_outbound: Outbound) => true);
const mockServices = {
  api: {},
  training: { read: mockRead },
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
  mockRecords = [];
});

const show = () =>
  render(
    <ThemeProvider>
      <TrainScreen />
    </ThemeProvider>,
  );

test("each day with its moves, this week's sets, the reps and the server's next target; today's day is marked", async () => {
  await show();
  expect(await screen.findByText('Upper A')).toBeTruthy();
  expect(screen.getByText('Bench press')).toBeTruthy();
  expect(screen.getByText('Next 62.5 kg × 6')).toBeTruthy();
  expect(screen.getByText('Next +10 kg × 8')).toBeTruthy();
  expect(screen.getAllByText('3 sets · 6–10 reps').length).toBe(3);
  // Tuesday: the lower day is today's.
  expect(screen.getByTestId('day-b')).toHaveTextContent(/Today/);
  expect(screen.getByTestId('day-a')).not.toHaveTextContent(/Today/);
});

test('the calls in force are said above the days: a week off with its note, a lighter week with its fewer sets', async () => {
  const lighter = {
    ...PROGRAM,
    restUntil: '2026-10-04',
    deload: { setsFactor: 0.5, until: '2026-10-11' },
    days: [{ ...PROGRAM.days[0], exercises: [{ ...PROGRAM.days[0].exercises[0], sets: 2 }] }],
  };
  mockData = { ...mockData, program: { state: 'ready', value: lighter } };
  await show();
  expect(await screen.findByText('A week off training, until Oct 4.')).toBeTruthy();
  expect(screen.getByText('Rest is the plan this week. Your program picks up after it.')).toBeTruthy();
  expect(screen.getByText('A lighter week, until Oct 11: fewer sets, the same weights.')).toBeTruthy();
  expect(screen.getByText('2 of 3 sets · 6–10 reps')).toBeTruthy();
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

test("today's day starts a workout: it is recorded on the phone under that day, and the session opens", async () => {
  await show();
  await fireEvent.press(await screen.findByText('Start workout'));
  expect(mockRecord).toHaveBeenCalledWith({
    kind: 'workout',
    body: { clientId: 'new-workout', startedAt: expect.any(String), programDayId: 'b' },
  });
  expect(mockPush).toHaveBeenCalledWith('/workout');
  // Another day can be started too (a session moved to today).
  expect(screen.getAllByText('Start').length).toBe(1);
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
  expect(await screen.findByText('Workout in progress')).toBeTruthy();
  expect(screen.queryByText('Start workout')).toBeNull();
  await fireEvent.press(screen.getByText('Continue'));
  expect(mockPush).toHaveBeenCalledWith('/workout');
  expect(mockRecord).not.toHaveBeenCalled();
});
