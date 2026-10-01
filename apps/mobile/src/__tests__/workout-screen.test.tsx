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
const mockReplace = jest.fn();
let mockParams: { day?: string } = {};
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args) },
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

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
/** The phone's store as the queue writes it: the record kept, pending. */
const keep = async (outbound: Outbound) => {
  const clientId = outbound.kind === 'finish' ? outbound.clientId : outbound.body.clientId;
  const parent = outbound.kind === 'set' || outbound.kind === 'finish' ? outbound.workoutClientId : null;
  mockRecords = [...mockRecords, { ...record(outbound.kind, clientId, outbound.body, parent), state: 'PENDING' }];
  return true;
};
const mockRecord = jest.fn(keep);
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
const mockWorkoutRecords = jest.fn(async () => mockRecords);
const mockServices = {
  api: {},
  training: { read: async () => mockData },
  workoutRecords: () => mockWorkoutRecords(),
  queue: { record: (outbound: Outbound) => mockRecord(outbound) },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockUnits = 'METRIC';
  mockWorkoutRecords.mockImplementation(async () => mockRecords);
  mockRecord.mockImplementation(keep);
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

test("finishing asks about each move's form; a move marked not clean is sent, and the summary opens", async () => {
  await show();
  await fireEvent.press(await screen.findByText('Log set 1'));
  await fireEvent.press(screen.getByText('Finish workout'));
  expect(screen.getByText('How was your form?')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bench press: Not clean'));
  await fireEvent.press(screen.getByText('Finish'));
  const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
  expect(finish).toMatchObject({ kind: 'finish', workoutClientId: 'w1', body: { uncleanExerciseIds: ['bench_press'] } });
  // The summary of what was done takes the session's place (K-406).
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/workout-summary', params: { workout: 'w1' } });
});

test('offline, the screen says the sets are kept on the phone', async () => {
  mockData = { ...mockData, kept: true };
  await show();
  expect(await screen.findByText("You're offline. Everything you log is saved on the phone and sent later.")).toBeTruthy();
});

test('a workout opened from a day is kept on the phone only once its first set is logged — workout first, then the set', async () => {
  mockRecords = lastWeek();
  mockParams = { day: 'day-a' };
  await show();
  expect(await screen.findByText('Upper A')).toBeTruthy();
  expect(mockRecord).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Log set 1'));
  const [workout, set] = mockRecord.mock.calls.map(([o]) => o);
  expect(workout).toEqual({ kind: 'workout', body: { clientId: expect.any(String), startedAt: expect.any(String), programDayId: 'day-a' } });
  expect(set).toMatchObject({ kind: 'set', workoutClientId: workout.kind === 'workout' ? workout.body.clientId : '' });
  expect(await screen.findByText('Log set 2')).toBeTruthy();
});

test('finishing before any set closes the screen and sends nothing: an empty workout is no session', async () => {
  mockRecords = lastWeek();
  mockParams = { day: 'day-a' };
  await show();
  await fireEvent.press(await screen.findByText('Finish workout'));
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalled();
});

test('when the move picked is done, the next move with sets left comes up', async () => {
  await show();
  await fireEvent.press((await screen.findAllByText('Bench press'))[0]); // the list's, picked by the user
  await fireEvent.press(screen.getByText('Log set 1'));
  await fireEvent.press(await screen.findByText('Log set 2'));
  await fireEvent.press(await screen.findByText('Log set 3'));
  expect(await screen.findByText('Log set 1 · left')).toBeTruthy();
});

test('a set that cannot be saved says so; trying again keeps the one workout already started, not a second', async () => {
  mockRecords = lastWeek();
  mockParams = { day: 'day-a' };
  let failSet = true;
  mockRecord.mockImplementation(async (outbound: Outbound) => {
    if (outbound.kind === 'set' && failSet) {
      failSet = false;
      throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
    }
    return keep(outbound);
  });
  await show();
  await fireEvent.press(await screen.findByText('Log set 1'));
  expect(await screen.findByText("That set couldn't be saved on the phone. Try again.")).toBeTruthy();
  await fireEvent.press(screen.getByText('Log set 1'));
  const kinds = mockRecord.mock.calls.map(([o]) => o.kind);
  expect(kinds.filter((k) => k === 'workout')).toHaveLength(1);
  expect(await screen.findByText('Log set 2')).toBeTruthy();
});

test('a set saved but not read back is not called unsaved: no message, and no second set on the next tap', async () => {
  await show();
  mockWorkoutRecords.mockImplementationOnce(async () => {
    throw Object.assign(new Error('read'), { name: 'ReadFailed' });
  });
  await fireEvent.press(await screen.findByText('Log set 1'));
  expect(screen.queryByText("That set couldn't be saved on the phone. Try again.")).toBeNull();
  expect(mockRecord.mock.calls.filter(([o]) => o.kind === 'set')).toHaveLength(1);
});

test('a workout whose day is gone from the program (made again) can still be finished, and says why there is nothing to log', async () => {
  mockRecords = [record('workout', 'w9', { clientId: 'w9', startedAt: '2026-09-28T17:00:00Z', programDayId: 'gone' })];
  await show();
  expect(await screen.findByText("This workout's day is no longer in your program. Finish it to start a new one.")).toBeTruthy();
  await fireEvent.press(screen.getByText('Finish workout'));
  expect(mockRecord.mock.calls.map(([o]) => o)).toEqual([expect.objectContaining({ kind: 'finish', workoutClientId: 'w9' })]);
  expect(mockBack).toHaveBeenCalled();
});

test('a finish that cannot be saved says so where the user is, and the screen stays', async () => {
  mockRecord.mockImplementation(async () => {
    throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
  });
  await show(); // the open workout has no set yet: finishing asks nothing
  await fireEvent.press(await screen.findByText('Finish workout'));
  expect(await screen.findByText("The workout couldn't be finished on the phone. Try again.")).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

test('two quick taps log one set and one workout', async () => {
  mockRecords = lastWeek();
  mockParams = { day: 'day-a' };
  await show();
  // The first save is still on its way when the second tap lands.
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  mockRecord.mockImplementationOnce(async (outbound: Outbound) => {
    await gate;
    return keep(outbound);
  });
  const log = await screen.findByText('Log set 1');
  await fireEvent.press(log);
  await fireEvent.press(log);
  release();
  expect(await screen.findByText('Log set 2')).toBeTruthy();
  const kinds = mockRecord.mock.calls.map(([o]) => o.kind);
  expect(kinds).toEqual(['workout', 'set']);
});

test("in lb, an untouched suggestion logs the server's kg; a typed one, what was typed", async () => {
  mockUnits = 'IMPERIAL';
  await show();
  await fireEvent.press(await screen.findByText('Log set 1'));
  expect(sets()[0].body).toMatchObject({ loadKg: 62.5 });
  await fireEvent.changeText(await screen.findByLabelText('Weight (lb)'), '140');
  await fireEvent.press(screen.getByText('Log set 2'));
  expect(sets()[1].body).toMatchObject({ loadKg: 63.5 });
});

test('a move marked not clean and then clean again is sent as clean', async () => {
  await show();
  await fireEvent.press(await screen.findByText('Log set 1'));
  await fireEvent.press(screen.getByText('Finish workout'));
  await fireEvent.press(screen.getByLabelText('Bench press: Not clean'));
  await fireEvent.press(screen.getByLabelText('Bench press: Clean'));
  await fireEvent.press(screen.getByText('Finish'));
  const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
  expect(finish).toMatchObject({ body: { uncleanExerciseIds: [] } });
});

describe("warm-ups (K-417, G1 K-17): three before the day's first move, one before the others; easy, no RIR", () => {
  const GYM = { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25], dumbbellsKg: [], stackStepKg: null, machineStepsKg: {} };
  const BARBELL = EXERCISES.map((m) => ({ ...m, equipment: m.id === 'bench_press' ? 'BARBELL' : 'DUMBBELL' })) as Schemas['Exercise'][];

  test("the day's first move: three, climbing to the work load, each logged with one tap as a warm-up", async () => {
    await show();
    expect(await screen.findByText('Warm-up')).toBeTruthy();
    expect(screen.getByText('32.5 kg × 8')).toBeTruthy();
    expect(screen.getByText('45 kg × 5')).toBeTruthy();
    expect(screen.getByText('52.5 kg × 3')).toBeTruthy();
    await fireEvent.press(screen.getByText('Log warm-up 1'));
    expect(sets()).toEqual([
      {
        kind: 'set',
        workoutClientId: 'w1',
        body: { clientId: expect.any(String), exerciseId: 'bench_press', setType: 'WARM_UP', loadKg: 32.5, reps: 8 },
      },
    ]);
    expect(await screen.findByText('Log warm-up 2')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByText(/^Rest/)).toBeNull(); // the rest timer is the work sets'
  });

  test('a warm-up starts the workout when none is kept yet', async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    await show();
    await fireEvent.press(await screen.findByText('Log warm-up 1'));
    const [workout, set] = mockRecord.mock.calls.map(([o]) => o);
    expect(workout.kind).toBe('workout');
    expect(set).toMatchObject({
      kind: 'set',
      workoutClientId: workout.kind === 'workout' ? workout.body.clientId : '',
      body: { setType: 'WARM_UP' },
    });
  });

  test('gone once the move has a work set; the next move gets one, both sides of a one-sided move with one tap', async () => {
    mockRecords = [
      ...lastWeek(),
      record('set', 's9', { clientId: 's9', exerciseId: 'one_arm_dumbbell_row', setType: 'WORKING', loadKg: 20, reps: 10, side: 'LEFT' }, 'w0'),
      record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' }),
      record('set', 's1', { clientId: 's1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 62.5, reps: 6, rir: 1, side: 'BOTH' }, 'w1'),
    ];
    await show();
    expect(await screen.findByText('Log set 2')).toBeTruthy();
    expect(screen.queryByText('Warm-up')).toBeNull();
    await fireEvent.press(screen.getAllByText('One-arm dumbbell row')[0]);
    expect(await screen.findByText('12.5 kg × 5')).toBeTruthy();
    expect(screen.queryByText('Log warm-up 2')).toBeNull();
    await fireEvent.press(screen.getByText('Log warm-up 1'));
    expect(sets().map((o) => o.body)).toEqual([
      { clientId: expect.any(String), exerciseId: 'one_arm_dumbbell_row', setType: 'WARM_UP', loadKg: 12.5, reps: 5, side: 'LEFT' },
      { clientId: expect.any(String), exerciseId: 'one_arm_dumbbell_row', setType: 'WARM_UP', loadKg: 12.5, reps: 5, side: 'RIGHT' },
    ]);
  });

  test('a one-sided warm-up whose second side failed to save: said, and the next tap logs only that side, and the words go', async () => {
    mockRecords = [
      ...lastWeek(),
      record('set', 's9', { clientId: 's9', exerciseId: 'one_arm_dumbbell_row', setType: 'WORKING', loadKg: 20, reps: 10, side: 'LEFT' }, 'w0'),
      record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' }),
      record('set', 's1', { clientId: 's1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 62.5, reps: 6, rir: 1, side: 'BOTH' }, 'w1'),
    ];
    mockRecord.mockImplementation(async (outbound: Outbound) => {
      if (outbound.kind === 'set' && outbound.body.side === 'RIGHT' && mockRecord.mock.calls.length === 2) {
        throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
      }
      return keep(outbound);
    });
    await show();
    await fireEvent.press((await screen.findAllByText('One-arm dumbbell row'))[0]);
    await fireEvent.press(await screen.findByText('Log warm-up 1'));
    expect(await screen.findByText("That set couldn't be saved on the phone. Try again.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Log warm-up 1'));
    expect(sets().map((o) => o.body.side)).toEqual(['LEFT', 'RIGHT', 'RIGHT']);
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(screen.queryByText("That set couldn't be saved on the phone. Try again.")).toBeNull();
  });

  test('with the gym in use: loads its bar and plates make, and the plates a side for each and for the set under way', async () => {
    mockData = { ...mockData, exercises: { state: 'ready', value: BARBELL }, gym: GYM };
    await show();
    expect(await screen.findByText('30 kg × 8')).toBeTruthy();
    expect(screen.getByText('5 kg a side')).toBeTruthy();
    expect(screen.getByText('42.5 kg × 5')).toBeTruthy();
    expect(screen.getByText('10 + 1.25 kg a side')).toBeTruthy();
    expect(screen.getByText('20 + 1.25 kg a side')).toBeTruthy(); // 62.5 kg, the set under way
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '20');
    expect(screen.getByText('Just the bar')).toBeTruthy();
  });

  test("in lb at a kg gym, the load is in lb and the plates are the gym's, in kg: what is on the rack", async () => {
    mockUnits = 'IMPERIAL';
    mockData = { ...mockData, exercises: { state: 'ready', value: BARBELL }, gym: GYM };
    await show();
    expect(await screen.findByText('20 + 1.25 kg a side')).toBeTruthy(); // 137.8 lb, the 62.5 kg under way
  });

  test('in lb, the plates are said in lb', async () => {
    mockUnits = 'IMPERIAL';
    const LB_GYM = { ...GYM, barKg: 20.41, platesKg: [20.41, 11.34, 4.54, 2.27, 1.13] };
    mockData = { ...mockData, exercises: { state: 'ready', value: BARBELL }, gym: LB_GYM };
    await show();
    await fireEvent.changeText(await screen.findByLabelText('Weight (lb)'), '135');
    expect(screen.getByText('45 lb a side')).toBeTruthy();
  });
});
