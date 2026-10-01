/**
 * A move's history screen (K-415, ADR-033): its records on top, then every session that has it, newest first, each set as
 * it was done. Read from the server's list, kept on the phone, joined with what the phone has not sent yet.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import ExerciseHistoryScreen from '@/app/exercise-history';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import type { Loaded } from '@/today/today';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

let mockParams: { exercise?: string } = {};
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() }, useLocalSearchParams: () => mockParams }));

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
const mockData: TrainData = { program: { state: 'none' }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
const mockServices = {
  api: {},
  training: { read: async () => mockData, history: async () => mockHistory },
  workoutRecords: async () => mockRecords,
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeEach(() => {
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
