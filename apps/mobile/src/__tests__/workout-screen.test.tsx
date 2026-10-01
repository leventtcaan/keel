/**
 * The session (K-405, prototype 2.4, B §6.5): the day's moves, the move under way with its rows — the server's next
 * target faint, last time beside it — and one tap logs the set as suggested, with the RIR picked (0, 1, 2, 3+). A rest
 * timer after each set (G1 K-49: 2-3 min). Finishing asks whether each move's form was clean (G6 K-31). Everything goes
 * through the phone's queue (K-304), so it all works offline.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import WorkoutScreen from '@/app/workout';
import type { Outbound } from '@/sync/queue';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() }, useRouter: () => ({ back: mockBack }) }));

const EXERCISES = [
  { id: 'bench_press', load: 'EXTERNAL', unilateral: false },
  { id: 'one_arm_dumbbell_row', load: 'EXTERNAL', unilateral: true },
] as Schemas['Exercise'][];
const DAY: Schemas['ProgramDay'] = {
  id: 'day-a',
  nameKey: 'upper_a',
  weekday: 'MONDAY',
  exercises: [
    { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 62.5, nextReps: 6 },
    { exerciseId: 'one_arm_dumbbell_row', baseSets: 2, sets: 2, reps: { min: 8, max: 12 }, targetRir: 1 },
  ],
};
const PROGRAM: Schemas['Program'] = { id: 'p', source: 'GENERATED', days: [DAY] };

let seq = 0;
const record = (kind: string, clientId: string, body: unknown, parentClientId: string | null = null): LocalRecord => ({
  seq: ++seq,
  clientId,
  kind,
  parentClientId,
  body,
  state: 'SYNCED',
  serverId: null,
  serverBody: null,
  errorCode: null,
});
const lastWeek = () => [
  record('workout', 'w0', { clientId: 'w0', startedAt: '2026-09-21T17:00:00Z', programDayId: 'day-a' }),
  record('set', 's0', { clientId: 's0', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 57.5, reps: 8 }, 'w0'),
  record('finish', 'f0', { endedAt: '2026-09-21T18:00:00Z' }, 'w0'),
];

let mockRecords: LocalRecord[] = [];
let mockData: TrainData;
const mockRecord = jest.fn(async (outbound: Outbound) => {
  const clientId = outbound.kind === 'finish' ? outbound.clientId : outbound.body.clientId;
  const parent = outbound.kind === 'set' || outbound.kind === 'finish' ? outbound.workoutClientId : null;
  mockRecords = [...mockRecords, { ...record(outbound.kind, clientId, outbound.body, parent), state: 'PENDING' }];
  return true;
});
const mockServices = {
  api: {},
  training: { read: async () => mockData },
  workoutRecords: async () => mockRecords,
  queue: { record: (outbound: Outbound) => mockRecord(outbound) },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeEach(() => {
  jest.clearAllMocks();
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
  mockRecords = [...lastWeek(), record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' })];
});

const show = () =>
  render(
    <ThemeProvider>
      <WorkoutScreen />
    </ThemeProvider>,
  );
const sets = () => mockRecord.mock.calls.map(([outbound]) => outbound).filter((o) => o.kind === 'set');

test("the day's moves, and the move under way with the server's target faint and last time beside it", async () => {
  await show();
  expect(await screen.findByText('Upper A')).toBeTruthy();
  expect(screen.getAllByText('Bench press').length).toBeGreaterThan(0);
  expect(screen.getByText('3 sets')).toBeTruthy(); // the bench, before any set
  expect(screen.getByText('Target RIR 0–1')).toBeTruthy();
  expect(screen.getAllByText('62.5 kg × 6').length).toBe(3);
  expect(screen.getByText('57.5 kg × 8')).toBeTruthy();
});

test('one tap logs the set as suggested, with the target RIR, under the workout; then the rest timer runs', async () => {
  await show();
  await fireEvent.press(await screen.findByText('Log set 1'));
  expect(sets()).toEqual([
    {
      kind: 'set',
      workoutClientId: 'w1',
      body: { clientId: expect.any(String), exerciseId: 'bench_press', setType: 'WORKING', loadKg: 62.5, reps: 6, rir: 1, side: 'BOTH' },
    },
  ]);
  expect(await screen.findByText('Log set 2')).toBeTruthy();
  expect(screen.getByText('Rest · 2:00–3:00')).toBeTruthy();
  expect(screen.getByText('Set 2 of 3')).toBeTruthy();
});

test('what is typed and the RIR picked are what is logged; 3+ is logged as 3', async () => {
  await show();
  await fireEvent.changeText(await screen.findByLabelText('Weight (kg)'), '60');
  await fireEvent.changeText(screen.getByLabelText('Reps'), '5');
  await fireEvent.press(screen.getByText('3+'));
  await fireEvent.press(screen.getByText('Log set 1'));
  expect(sets()[0].body).toMatchObject({ loadKg: 60, reps: 5, rir: 3 });
});

test('a set the server would refuse is not logged, and the screen says what to check', async () => {
  await show();
  await fireEvent.changeText(await screen.findByLabelText('Reps'), '0');
  await fireEvent.press(screen.getByText('Log set 1'));
  expect(sets()).toEqual([]);
  expect(screen.getByText('Check the weight and the reps.')).toBeTruthy();
});

test('another move can be picked; a one-sided move is logged side by side', async () => {
  await show();
  await fireEvent.press(await screen.findByText('One-arm dumbbell row'));
  await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '20');
  await fireEvent.changeText(screen.getByLabelText('Reps'), '12');
  await fireEvent.press(screen.getByText('Log set 1 · left'));
  expect(sets()[0].body).toMatchObject({ exerciseId: 'one_arm_dumbbell_row', side: 'LEFT', loadKg: 20, reps: 12 });
  expect(await screen.findByText('Log set 1 · right')).toBeTruthy();
});

test("finishing asks about each move's form; a move marked not clean is sent, and the screen closes", async () => {
  await show();
  await fireEvent.press(await screen.findByText('Log set 1'));
  await fireEvent.press(screen.getByText('Finish workout'));
  expect(screen.getByText('How was your form?')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bench press: Not clean'));
  await fireEvent.press(screen.getByText('Finish'));
  const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
  expect(finish).toMatchObject({ kind: 'finish', workoutClientId: 'w1', body: { uncleanExerciseIds: ['bench_press'] } });
  expect(mockBack).toHaveBeenCalled();
});

test('offline, the screen says the sets are kept on the phone', async () => {
  mockData = { ...mockData, kept: true };
  await show();
  expect(await screen.findByText("You're offline. Everything you log is saved on the phone and sent later.")).toBeTruthy();
});
