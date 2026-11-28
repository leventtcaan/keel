/**
 * A move's history screen (K-415, ADR-033): its records on top, then every session that has it, newest first, each set as
 * it was done. Read from the server's list, kept on the phone, joined with what the phone has not sent yet.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import ExerciseHistoryScreen from '@/app/exercise-history';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';
import type { Loaded } from '@/today/today';
import type { Move, TrainData } from '@/train/trainData';

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
    endedAt: '2026-09-21T18:00:00Z',
    sets: [set('s1', 'bench_press', 40, 10, undefined, 'WARM_UP'), set('s2', 'bench_press', 80, 8, 1)],
  },
  {
    id: 'b',
    clientId: 'w2',
    startedAt: '2026-09-28T17:00:00Z',
    endedAt: '2026-09-28T18:00:00Z',
    sets: [set('s3', 'bench_press', 85, 4, 2), set('s4', 'lateral_raise', 12.5, 12, 1)],
  },
];

// The server's records for WORKOUTS' bench press (K-1259: the server works them out over all time).
const BENCH: Schemas['MoveRecord'][] = [
  { kind: 'HEAVIEST', loadKg: 85, reps: 4, on: '2026-09-28T17:00:00Z' },
  { kind: 'ESTIMATED_MAX', kg: 104, on: '2026-09-21T17:00:00Z' },
  { kind: 'REPS_AT', loadKg: 85, reps: 4, on: '2026-09-28T17:00:00Z' },
  { kind: 'REPS_AT', loadKg: 80, reps: 8, on: '2026-09-21T17:00:00Z' },
];
const page = (sessions: Schemas['Workout'][], records: Schemas['MoveRecord'][] = [], next?: string): Schemas['MoveHistory'] => ({
  sessions,
  records,
  ...(next === undefined ? {} : { next }),
});

let mockHistory: Loaded<Schemas['MoveHistory']>;
let mockOlder: Record<string, Loaded<Schemas['MoveHistory']>> = {};
async function answer(_api: unknown, _move: string, before?: string): Promise<{ read: Loaded<Schemas['MoveHistory']>; kept: boolean }> {
  return { read: before === undefined ? mockHistory : (mockOlder[before] ?? { state: 'failed', problem: 'NoConnection' }), kept: false };
}
let mockRecords: LocalRecord[] = [];
let mockData: TrainData;
let mockOwn: Move[] = [];
const mockServices = {
  api: {},
  training: {
    read: async () => mockData,
    own: async () => mockOwn,
    moveHistory: jest.fn(answer),
  },
  workoutRecords: async () => mockRecords,
  report: jest.fn(),
};
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeEach(() => {
  jest.clearAllMocks();
  mockOlder = {};
  mockServices.training.moveHistory.mockImplementation(answer);
  mockUnits = 'METRIC';
  mockData = { program: { state: 'none' }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
  mockParams = { exercise: 'bench_press' };
  mockHistory = { state: 'ready', value: page(WORKOUTS, BENCH) };
  mockRecords = [];
  mockOwn = [];
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
  expect(screen.getByText('85 kg × 4 · 2 reps left')).toBeTruthy();
  expect(screen.getByText('40 kg × 10 · warm-up')).toBeTruthy();
  expect(screen.getByText('80 kg × 8 · 1 rep left')).toBeTruthy();
});

test('an isolation move shows no weight record (G6 K-33)', async () => {
  mockParams = { exercise: 'lateral_raise' };
  mockHistory = { state: 'ready', value: page(WORKOUTS, [{ kind: 'REPS_AT', loadKg: 12.5, reps: 12, on: '2026-09-28T17:00:00Z' }]) };
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
  mockHistory = { state: 'ready', value: page([]) };
  await show();
  expect(await screen.findByText('Nothing logged for this exercise yet.')).toBeTruthy();
});

// K1 (Evre 7 C): the history is a pushed screen with the system's back arrow (the walk: "no back arrow"), so the "Done" button at its
// foot, the only way out, is gone.
test('the way back is the system header, not a button at the foot', async () => {
  await show();
  await screen.findByText(t('history.sessions'));
  expect(screen.queryByText('Done')).toBeNull();
});

test('in lb, two loads written alike are one weight: one "140 lb" row', async () => {
  mockUnits = 'IMPERIAL';
  mockHistory = {
    state: 'ready',
    value: page(
      [
        { id: 'a', clientId: 'w1', startedAt: '2026-09-21T17:00:00Z', sets: [set('s1', 'bench_press', 62.5, 6, 1)] },
        { id: 'b', clientId: 'w2', startedAt: '2026-09-28T17:00:00Z', sets: [set('s2', 'bench_press', 62.51, 6, 1)] },
      ],
      [
        { kind: 'REPS_AT', loadKg: 62.51, reps: 6, on: '2026-09-28T17:00:00Z' },
        { kind: 'REPS_AT', loadKg: 62.5, reps: 6, on: '2026-09-21T17:00:00Z' },
      ],
    ),
  };
  await show();
  expect(await screen.findAllByText('Most reps at 140 lb · 6')).toHaveLength(1);
});

test("the exercises unread (offline, nothing kept): the screen says it couldn't load, not an empty history", async () => {
  mockData = { program: { state: 'none' }, exercises: { state: 'failed', problem: 'NoConnection' }, kept: false };
  await show();
  expect(await screen.findByText("This exercise's history couldn't load. Try again when you're online.")).toBeTruthy();
  expect(screen.queryByText('History')).toBeNull();
});

test('a read that throws is reported by its name only, and the screen stays', async () => {
  mockServices.training.moveHistory.mockImplementation(async () => {
    throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
  });
  await show();
  await waitFor(() => expect(mockServices.report).toHaveBeenCalled());
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'StoreFailed' });
});

test("a set the server already has counts from the server's records, not again from the phone's copy", async () => {
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
    value: page([
      {
        id: 'a',
        clientId: 'w1',
        startedAt: '2026-09-21T17:00:00Z',
        note: 'Slept 5 hours',
        sets: [{ ...set('s1', 'bench_press', 80, 8, 1), note: 'grip slipped' }],
      },
    ]),
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

  test('"Edit this session" is a text button in the accent, not bold black words', async () => {
    await show();
    const button = screen.getByRole('button', { name: t('sessionEdit.openSpoken', { day: 'Sep 28' }) });
    expect(StyleSheet.flatten(within(button).getByText(t('sessionEdit.open')).props.style).color).toBe(palettes.light.accent);
  });

  test('a session still under way has no edit: it is edited in the session itself (review)', async () => {
    mockHistory = { state: 'ready', value: page([WORKOUTS[0], { ...WORKOUTS[1], endedAt: undefined }], BENCH) };
    await show();
    await screen.findAllByText(/^Sep (21|28)$/);
    expect(screen.queryByRole('button', { name: t('sessionEdit.openSpoken', { day: 'Sep 28' }) })).toBeNull();
  });

  test('a session only on the phone (not sent yet) has no edit: the server does not have it', async () => {
    mockHistory = { state: 'ready', value: page([]) };
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
    expect(await screen.findByText('80 kg × 8 · 1 rep left')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Edit the session/ })).toBeNull();
  });

  test('coming back to the screen reads the history again, so an edit shows at once', async () => {
    await show();
    await screen.findAllByText(/^Sep (21|28)$/);
    const reads = mockServices.training.moveHistory.mock.calls.length;
    await act(async () => mockFocus?.());
    expect(mockServices.training.moveHistory.mock.calls.length).toBeGreaterThan(reads);
  });
});

test("the user's own move's history under the name they gave", async () => {
  mockOwn = [{ id: 'custom:1', nameKey: '', name: 'Landmine press', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] }];
  mockParams = { exercise: 'custom:1' };
  mockHistory = {
    state: 'ready',
    value: page([{ id: 'c', clientId: 'w5', startedAt: '2026-09-29T17:00:00Z', endedAt: '2026-09-29T18:00:00Z', sets: [set('s9', 'custom:1', 30, 10, 1)] }]),
  };
  await show();
  expect(await screen.findByText('Landmine press')).toBeOnTheScreen();
  expect(screen.getByText('30 kg × 10 · 1 rep left')).toBeOnTheScreen();
  expect(screen.queryByText(t('history.loadFailed'))).toBeNull();
});

describe('the whole log, a page at a time, with no limit in time (K-1266, ADR-096: free)', () => {
  const scrolledToEnd = { nativeEvent: { layoutMeasurement: { height: 800 }, contentOffset: { y: 1200 }, contentSize: { height: 2000 } } };

  test("a record of long ago is the server's, kept whatever the year: Heaviest from two years back", async () => {
    mockHistory = { state: 'ready', value: page(WORKOUTS, [{ kind: 'HEAVIEST', loadKg: 110, reps: 3, on: '2024-10-01T17:00:00Z' }, ...BENCH.slice(1)]) };
    await show();
    expect(await screen.findByText('Heaviest · 110 kg × 3')).toBeOnTheScreen();
    expect(screen.getByText('Oct 1')).toBeOnTheScreen();
  });

  test('nearing the end of the list asks for the older page by its cursor and shows a session from more than a year back', async () => {
    mockHistory = { state: 'ready', value: page(WORKOUTS, BENCH, 'a') };
    mockOlder = {
      a: {
        state: 'ready',
        value: page([{ id: 'z', clientId: 'w0', startedAt: '2025-02-03T17:00:00Z', endedAt: '2025-02-03T18:00:00Z', sets: [set('s0', 'bench_press', 60, 12, 2)] }]),
      },
    };
    await show();
    await screen.findAllByText(/^Sep (21|28)$/);
    expect(screen.queryByText('Feb 3')).toBeNull();
    await act(async () => fireEvent.scroll(screen.getByTestId('history-list'), scrolledToEnd));
    expect(mockServices.training.moveHistory).toHaveBeenCalledWith(mockServices.api, 'bench_press', 'a');
    expect(await screen.findByText('Feb 3')).toBeOnTheScreen();
    expect(screen.getByText('60 kg × 12 · 2 reps left')).toBeOnTheScreen();
    // The last page has no cursor: nothing more is asked.
    const asked = mockServices.training.moveHistory.mock.calls.length;
    await act(async () => fireEvent.scroll(screen.getByTestId('history-list'), scrolledToEnd));
    expect(mockServices.training.moveHistory.mock.calls.length).toBe(asked);
  });

  test("the phone's own workout older than the pages read waits for its page, in its place", async () => {
    mockHistory = { state: 'ready', value: page(WORKOUTS, BENCH, 'a') };
    mockOlder = { a: { state: 'ready', value: page([]) } };
    mockRecords = [
      { seq: 1, clientId: 'w0', kind: 'workout', parentClientId: null, body: { clientId: 'w0', startedAt: '2025-01-06T17:00:00Z' }, state: 'PENDING', serverId: null, serverBody: null, errorCode: null },
      { seq: 2, clientId: 's0', kind: 'set', parentClientId: 'w0', body: { clientId: 's0', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 50, reps: 15, rir: 2 }, state: 'PENDING', serverId: null, serverBody: null, errorCode: null },
    ];
    await show();
    await screen.findAllByText(/^Sep (21|28)$/);
    // Its set counts toward the records at once; its session waits for its page.
    expect(screen.queryByText('50 kg × 15 · 2 reps left')).toBeNull();
    await act(async () => fireEvent.scroll(screen.getByTestId('history-list'), scrolledToEnd));
    expect(await screen.findByText('50 kg × 15 · 2 reps left')).toBeOnTheScreen();
  });

  test('an older page that fails is not asked again on every scroll, only once the list leaves its end and comes back', async () => {
    mockHistory = { state: 'ready', value: page(WORKOUTS, BENCH, 'a') };
    await show();
    await screen.findAllByText(/^Sep (21|28)$/);
    const list = screen.getByTestId('history-list');
    await act(async () => fireEvent.scroll(list, scrolledToEnd));
    await act(async () => fireEvent.scroll(list, scrolledToEnd));
    const older = () => mockServices.training.moveHistory.mock.calls.filter((call) => call[2] === 'a').length;
    expect(older()).toBe(1);
    await act(async () => fireEvent.scroll(list, { nativeEvent: { layoutMeasurement: { height: 800 }, contentOffset: { y: 0 }, contentSize: { height: 2000 } } }));
    await act(async () => fireEvent.scroll(list, scrolledToEnd));
    expect(older()).toBe(2);
  });

  test('without a subscription it is all there: the subscription is not read', async () => {
    await show();
    await screen.findByText('Heaviest · 85 kg × 4');
    expect(JSON.stringify(mockServices.training.moveHistory.mock.calls)).not.toContain('subscription');
    expect(mockServices.api).toEqual({});
  });
});
