/**
 * The summary after a workout (K-406, prototype 2.6): how many moves reached the target effort, each move's sets and
 * what improved since last time, a note where the effort was short of the target. From the phone's records: it shows
 * offline, right after the finish.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import WorkoutSummaryScreen from '@/app/workout-summary';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => ({ workout: 'w1' }),
}));

const EXERCISES = [
  { id: 'bench_press', kind: 'COMPOUND', load: 'EXTERNAL', unilateral: false },
  { id: 'lateral_raise', kind: 'ISOLATION', load: 'EXTERNAL', unilateral: false },
] as Schemas['Exercise'][];
const PROGRAM: Schemas['Program'] = {
  id: 'p',
  source: 'GENERATED',
  days: [
    {
      id: 'day-a',
      nameKey: 'upper_a',
      exercises: [
        { exerciseId: 'bench_press', baseSets: 2, sets: 2, reps: { min: 6, max: 10 }, targetRir: 1 },
        { exerciseId: 'lateral_raise', baseSets: 2, sets: 2, reps: { min: 8, max: 12 }, targetRir: 1 },
      ],
    },
  ],
};
let seq = 0;
const row = (kind: string, clientId: string, body: unknown, parent: string | null = null): LocalRecord => ({
  seq: ++seq,
  clientId,
  kind,
  parentClientId: parent,
  body,
  state: 'SYNCED',
  serverId: null,
  serverBody: null,
  errorCode: null,
});
const set = (workout: string, id: string, exerciseId: string, loadKg: number, reps: number, rir: number) =>
  row('set', id, { clientId: id, exerciseId, setType: 'WORKING', loadKg, reps, rir }, workout);
const RECORDS = [
  row('workout', 'w0', { clientId: 'w0', startedAt: '2026-09-21T17:00:00Z', programDayId: 'day-a' }),
  set('w0', 'a', 'bench_press', 80, 8, 1),
  row('finish', 'f0', { endedAt: '2026-09-21T18:00:00Z' }, 'w0'),
  row('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' }),
  set('w1', 'b', 'bench_press', 80, 9, 1),
  set('w1', 'c', 'lateral_raise', 12.5, 12, 3),
  row('finish', 'f1', { endedAt: '2026-09-28T18:00:00Z' }, 'w1'),
];
const mockData: TrainData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
const mockServices = { api: {}, training: { read: async () => mockData }, workoutRecords: async () => RECORDS, report: jest.fn() };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

test('the moves that reached the target effort, what improved, and a note where the effort was short', async () => {
  await render(
    <ThemeProvider>
      <WorkoutSummaryScreen />
    </ThemeProvider>,
  );
  expect(await screen.findByText('1 of 2 exercises reached your target effort')).toBeTruthy();
  expect(screen.getByText('Same weight, 1 more rep at RIR 1')).toBeTruthy();
  expect(screen.getByText('80 kg × 9 · RIR 1')).toBeTruthy();
  expect(screen.getByText('First time logged')).toBeTruthy(); // the raise has no last time
  expect(screen.getByText('RIR 3. Next time, aim for 0–1.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Done'));
  expect(mockBack).toHaveBeenCalled();
});

test('one move judged reads as one exercise', async () => {
  RECORDS.splice(
    RECORDS.findIndex((r) => r.clientId === 'c'),
    1,
  ); // the raise was not done
  await render(
    <ThemeProvider>
      <WorkoutSummaryScreen />
    </ThemeProvider>,
  );
  expect(await screen.findByText('1 of 1 exercise reached your target effort')).toBeTruthy();
});
