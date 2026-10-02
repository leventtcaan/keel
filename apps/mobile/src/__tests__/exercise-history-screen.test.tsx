/**
 * A move's history screen (K-415, ADR-033): its records on top, then every session that has it, newest first, each set as
 * it was done. Read from the server's list, kept on the phone, joined with what the phone has not sent yet.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import ExerciseHistoryScreen from '@/app/exercise-history';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import type { Loaded } from '@/today/today';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

let mockParams: { exercise?: string } = {};
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockFocus: (() => void) | null = null;
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: (to: unknown) => mockPush(to) },
  useLocalSearchParams: () => mockParams,
  // Read on focus: coming back from editing a session reads again (K-416).
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    mockFocus = effect;
    React.useEffect(effect, [effect]);
  },
}));

const EXERCISES = [
  { id: 'bench_press', kind: 'COMPOUND', load: 'EXTERNAL', unilateral: false },
  { id: 'lateral_raise', kind: 'ISOLATION', load: 'EXTERNAL', unilateral: false },
] as Schemas['Exercise'][];
const set = (clientId: string, exerciseId: string, loadKg: number, reps: number, rir?: number, setType: Schemas['SetType'] = 'WORKING') => ({
  id: `srv-${clientId}`,
  clientId,
  exerciseId,
  setType,
  loadKg,
  reps,
  ...(rir === undefined ? {} : { rir }),
});
const WORKOUTS: Schemas['Workout'][] = [
  {
    id: 'a',
    clientId: 'w1',
    startedAt: '2026-09-21T17:00:00Z',
    sets: [set('s1', 'bench_press', 40, 10, undefined, 'WARM_UP'), set('s2', 'bench_press', 80, 8, 1)],
  },
  { id: 'b', clientId: 'w2', startedAt: '2026-09-28T17:00:00Z', sets: [set('s3', 'bench_press', 85, 4, 2), set('s4', 'lateral_raise', 12.5, 12, 1)] },
];

let mockHistory: Loaded<Schemas['Workout'][]>;
let mockRecords: LocalRecord[] = [];
let mockData: TrainData;
const mockServices = {
  api: {},
  training: { read: async () => mockData, history: jest.fn(async () => mockHistory) },
  workoutRecords: async () => mockRecords,
  report: jest.fn(),
};
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeEach(() => {
  jest.clearAllMocks();
  mockServices.training.history.mockImplementation(async () => mockHistory);
  mockUnits = 'METRIC';
  mockData = { program: { state: 'none' }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
  mockParams = { exercise: 'bench_press' };
  mockHistory = { state: 'ready', value: WORKOUTS };
  mockRecords = [];
});

const show = () =>
  render(
    <ThemeProvider>
      <ExerciseHistoryScreen />
    </ThemeProvider>,
  );

test('the records first: heaviest, estimated max, most reps at each weight, each with its day', async () => {
  await show();
  expect(await screen.findByText('Bench press')).toBeTruthy();
  expect(screen.getByText('Heaviest · 85 kg × 4')).toBeTruthy();
  expect(screen.getByText('Estimated max · 104 kg')).toBeTruthy();
  expect(screen.getByText('Most reps at 85 kg · 4')).toBeTruthy();
  expect(screen.getByText('Most reps at 80 kg · 8')).toBeTruthy();
  expect(screen.getAllByText('Sep 28').length).toBeGreaterThan(0);
  expect(screen.queryByText("Showing what's on this phone. The rest shows when you're online.")).toBeNull();
});

test('then each session, newest first, every set as it was done — a warm-up marked as one', async () => {
  await show();
  const days = await screen.findAllByText(/^Sep (21|28)$/);
  expect(days.map((d) => d.props.children)).toContain('Sep 21');
  expect(screen.getByText('85 kg × 4 · RIR 2')).toBeTruthy();
  expect(screen.getByText('40 kg × 10 · warm-up')).toBeTruthy();
  expect(screen.getByText('80 kg × 8 · RIR 1')).toBeTruthy();
});

test('an isolation move shows no weight record (G6 K-33)', async () => {
  mockParams = { exercise: 'lateral_raise' };
  await show();
  expect(await screen.findByText('Most reps at 12.5 kg · 12')).toBeTruthy();
  expect(screen.queryByText(/^Heaviest/)).toBeNull();
  expect(screen.queryByText(/^Estimated max/)).toBeNull();
});

test('a set on the phone not sent yet is there', async () => {
  mockRecords = [
    {
      seq: 1,
      clientId: 'w3',
      kind: 'workout',
      parentClientId: null,
      body: { clientId: 'w3', startedAt: '2026-09-30T17:00:00Z' },
      state: 'PENDING',
      serverId: null,
      serverBody: null,
      errorCode: null,
    },
    {
      seq: 2,
      clientId: 's9',
      kind: 'set',
      parentClientId: 'w3',
      body: { clientId: 's9', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 87.5, reps: 3, rir: 1 },
      state: 'PENDING',
      serverId: null,
      serverBody: null,
      errorCode: null,
    },
  ];
  await show();
  expect(await screen.findByText('Heaviest · 87.5 kg × 3')).toBeTruthy();
});

test("offline with nothing kept: the phone's own sessions, and the screen says so", async () => {
  mockHistory = { state: 'failed', problem: 'NoConnection' };
  await show();
  expect(await screen.findByText("Showing what's on this phone. The rest shows when you're online.")).toBeTruthy();
});

test('nothing logged for the move yet', async () => {
  mockHistory = { state: 'ready', value: [] };
  await show();
  expect(await screen.findByText('Nothing logged for this exercise yet.')).toBeTruthy();
});

test('back closes it', async () => {
  await show();
  await fireEvent.press(await screen.findByText('Done'));
  expect(mockBack).toHaveBeenCalled();
});

test('in lb, two loads written alike are one weight: one "137.8 lb" row', async () => {
  mockUnits = 'IMPERIAL';
  mockHistory = {
    state: 'ready',
    value: [
      { id: 'a', clientId: 'w1', startedAt: '2026-09-21T17:00:00Z', sets: [set('s1', 'bench_press', 62.5, 6, 1)] },
      { id: 'b', clientId: 'w2', startedAt: '2026-09-28T17:00:00Z', sets: [set('s2', 'bench_press', 62.51, 6, 1)] },
    ],
  };
  await show();
  expect(await screen.findAllByText('Most reps at 137.8 lb · 6')).toHaveLength(1);
});

test("the exercises unread (offline, nothing kept): the screen says it couldn't load, not an empty history", async () => {
  mockData = { program: { state: 'none' }, exercises: { state: 'failed', problem: 'NoConnection' }, kept: false };
  await show();
  expect(await screen.findByText("This exercise's history couldn't load. Try again when you're online.")).toBeTruthy();
  expect(screen.queryByText('History')).toBeNull();
});

test('a read that throws is reported by its name only, and the screen stays', async () => {
  mockServices.training.history.mockImplementation(async () => {
    throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
  });
  await show();
  expect(await screen.findByText('Done')).toBeTruthy();
  await screen.findByText('Done');
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'StoreFailed' });
});

test("the phone's own workouts from before the window are not counted: a new phone would not show them", async () => {
  mockRecords = [
    {
      seq: 1,
      clientId: 'w0',
      kind: 'workout',
      parentClientId: null,
      body: { clientId: 'w0', startedAt: '2020-01-06T17:00:00Z' },
      state: 'SYNCED',
      serverId: 'x',
      serverBody: null,
      errorCode: null,
    },
    {
      seq: 2,
      clientId: 's0',
      kind: 'set',
      parentClientId: 'w0',
      body: { clientId: 's0', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 140, reps: 1, rir: 0 },
      state: 'SYNCED',
      serverId: 'y',
      serverBody: null,
      errorCode: null,
    },
  ];
  await show();
  expect(await screen.findByText('Heaviest · 85 kg × 4')).toBeTruthy();
});

test("a set's note and the session's note are shown with them", async () => {
  mockHistory = {
    state: 'ready',
    value: [
      {
        id: 'a',
        clientId: 'w1',
        startedAt: '2026-09-21T17:00:00Z',
        note: 'Slept 5 hours',
        sets: [{ ...set('s1', 'bench_press', 80, 8, 1), note: 'grip slipped' }],
      },
    ],
  };
  await show();
  expect(await screen.findByText('Slept 5 hours')).toBeTruthy();
  expect(screen.getByText('grip slipped')).toBeTruthy();
});

describe('editing a past session (K-416)', () => {
  test("a session the server has opens its edit; the edit is the server's workout", async () => {
    await show();
    await screen.findAllByText(/^Sep (21|28)$/);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('sessionEdit.openSpoken', { day: 'Sep 28' }) })));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/workout-edit', params: { workout: 'b' } });
  });

  test('a session only on the phone (not sent yet) has no edit: the server does not have it', async () => {
    mockHistory = { state: 'ready', value: [] };
    mockRecords = [
      {
        seq: 1,
        clientId: 'w9',
        kind: 'workout',
        parentClientId: null,
        body: { clientId: 'w9', startedAt: new Date().toISOString() },
        state: 'PENDING',
        serverId: null,
        serverBody: null,
        errorCode: null,
      },
      {
        seq: 2,
        clientId: 's9',
        kind: 'set',
        parentClientId: 'w9',
        body: { clientId: 's9', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 80, reps: 8, rir: 1 },
        state: 'PENDING',
        serverId: null,
        serverBody: null,
        errorCode: null,
      },
    ];
    await show();
    expect(await screen.findByText('80 kg × 8 · RIR 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Edit the session/ })).toBeNull();
  });

  test('coming back to the screen reads the history again, so an edit shows at once', async () => {
    await show();
    await screen.findAllByText(/^Sep (21|28)$/);
    const reads = mockServices.training.history.mock.calls.length;
    await act(async () => mockFocus?.());
    expect(mockServices.training.history.mock.calls.length).toBeGreaterThan(reads);
  });
});
