/**
 * The session (K-405, prototype 2.4, B §6.5): the day's moves, the move under way with its rows — the server's next
 * target faint, last time beside it — and one tap logs the set as suggested, with the RIR picked (0, 1, 2, 3+). A rest
 * timer after each set (G1 K-49: 2-3 min). Finishing asks whether each move's form was clean (G6 K-31). Everything goes
 * through the phone's queue (K-304), so it all works offline.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import WorkoutScreen from '@/app/workout';
import type { Outbound } from '@/sync/queue';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import { workoutParams } from '@/train/params';
import { type Move, type TrainData, ownMove } from '@/train/trainData';

type Schemas = components['schemas'];

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: { day?: string } = {};
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: (...args: unknown[]) => mockPush(...args), replace: (...args: unknown[]) => mockReplace(...args) },
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
let mockOwn: Move[] = [];
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
let mockSave: (body: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
const mockPOST = jest.fn(async (_path: string, init: { body: unknown }) => mockSave(init.body));
const mockServices = {
  api: { POST: mockPOST },
  training: { read: async () => mockData, own: async () => mockOwn, saved: jest.fn(async () => {}) },
  workoutRecords: () => mockWorkoutRecords(),
  queue: { record: (outbound: Outbound) => mockRecord(outbound) },
  report: jest.fn(),
  // The rest timer's voice in the background (K-411).
  restAlert: { start: jest.fn(async (_since: number) => {}), stop: jest.fn(async () => {}) },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockUnits = 'METRIC';
  mockWorkoutRecords.mockImplementation(async () => mockRecords);
  mockRecord.mockImplementation(keep);
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
  mockOwn = [];
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

test("the move under way opens its screen: setup, tips, muscles (K-418)", async () => {
  await show();
  await fireEvent.press(await screen.findByLabelText(t('demo.openLabel', { exercise: 'Bench press' })));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/exercise', params: { exercise: 'bench_press' } });
});

test('the move under way opens its history and records (K-415)', async () => {
  await show();
  await fireEvent.press(await screen.findByLabelText('Bench press: history'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/exercise-history', params: { exercise: 'bench_press' } });
});

test('what is typed and the RIR picked are what is logged; 3+ is logged as 3', async () => {
  await show();
  await fireEvent.changeText(await screen.findByLabelText('Weight (kg)'), '60');
  await fireEvent.changeText(screen.getByLabelText('Reps'), '5');
  await fireEvent.press(screen.getByText('3+'));
  await fireEvent.press(screen.getByText('Log set 1'));
  expect(sets()[0].body).toMatchObject({ loadKg: 60, reps: 5, rir: 3 });
});

test('a note goes with the set it was written for, and the next set starts without one (K-422)', async () => {
  await show();
  expect(screen.queryByLabelText('Note on this set')).toBeNull(); // closed: one tap stays one tap
  await fireEvent.press(await screen.findByText('Add a note'));
  await fireEvent.changeText(screen.getByLabelText('Note on this set'), 'Left shoulder pinched');
  await fireEvent.press(screen.getByText('Log set 1'));
  expect(sets()[0].body).toMatchObject({ note: 'Left shoulder pinched' });
  await fireEvent.press(await screen.findByText('Log set 2'));
  expect(sets()[1].body).not.toHaveProperty('note');
});

test('the session note is asked at the finish, and goes with it (K-422)', async () => {
  await show();
  await fireEvent.press(await screen.findByText('Log set 1'));
  await fireEvent.press(await screen.findByText('Finish workout'));
  await fireEvent.changeText(await screen.findByLabelText('Note on this workout (optional)'), 'Slept 5 hours');
  await fireEvent.press(screen.getByText('Finish'));
  const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
  expect(finish?.kind === 'finish' && finish.body).toMatchObject({ note: 'Slept 5 hours' });
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

  test('before the first work set, warm-ups wait on the phone: an empty workout is no session (K-220)', async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    await show();
    await fireEvent.press(await screen.findByText('Log warm-up 1'));
    expect(await screen.findByText('Log warm-up 2')).toBeTruthy();
    expect(mockRecord).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Finish workout'));
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  test('the first work set keeps the workout, then the warm-ups done before it, then itself', async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    await show();
    await fireEvent.press(await screen.findByText('Log warm-up 1'));
    await fireEvent.press(await screen.findByText('Log warm-up 2'));
    await fireEvent.press(screen.getByText('Log set 1'));
    expect(await screen.findByText('Log set 2')).toBeTruthy();
    const sent = mockRecord.mock.calls.map(([o]) => o);
    expect(sent.map((o) => (o.kind === 'set' ? o.body.setType : o.kind))).toEqual(['workout', 'WARM_UP', 'WARM_UP', 'WORKING']);
    const workout = sent[0].kind === 'workout' ? sent[0].body.clientId : '';
    expect(sent.slice(1).every((o) => o.kind === 'set' && o.workoutClientId === workout)).toBe(true);
    expect(sent[1].kind === 'set' && sent[1].body).toMatchObject({ loadKg: 32.5, reps: 8 });
  });

  test('waiting warm-ups that fail to save with the first work set are saved once each on the next tap, not twice', async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    let warmups = 0;
    mockRecord.mockImplementation(async (outbound: Outbound) => {
      // The phone's store keeps one record per clientId (INSERT OR IGNORE): the same record made twice is one.
      if (outbound.kind !== 'finish' && mockRecords.some((r) => r.clientId === outbound.body.clientId)) return false;
      if (outbound.kind === 'set' && outbound.body.setType === 'WARM_UP' && ++warmups === 2) {
        throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
      }
      return keep(outbound);
    });
    await show();
    await fireEvent.press(await screen.findByText('Log warm-up 1'));
    await fireEvent.press(await screen.findByText('Log warm-up 2'));
    await fireEvent.press(screen.getByText('Log set 1'));
    expect(await screen.findByText("That set couldn't be saved on the phone. Try again.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Log set 1'));
    expect(await screen.findByText('Log set 2')).toBeTruthy();
    const kept = mockRecords.filter((r) => r.kind === 'set').map((r) => (r.body as Schemas['NewSet']).setType);
    expect(kept).toEqual(['WORKING', 'WARM_UP', 'WARM_UP', 'WORKING']); // last week's, then today's
    expect(mockRecords.filter((r) => r.kind === 'workout' && r.state === 'PENDING')).toHaveLength(1);
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

  test('two quick taps log one warm-up', async () => {
    await show();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockRecord.mockImplementationOnce(async (outbound: Outbound) => {
      await gate;
      return keep(outbound);
    });
    const log = await screen.findByText('Log warm-up 1');
    await fireEvent.press(log);
    await fireEvent.press(log);
    release();
    expect(await screen.findByText('Log warm-up 2')).toBeTruthy();
    expect(sets()).toHaveLength(1);
  });

  test('a warm-up that cannot be saved is said on its move, not on the next one picked', async () => {
    // The row has warm-ups of its own too (a load known from last time).
    mockRecords = [
      ...lastWeek(),
      record('set', 's9', { clientId: 's9', exerciseId: 'one_arm_dumbbell_row', setType: 'WORKING', loadKg: 20, reps: 10, side: 'LEFT' }, 'w0'),
      record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' }),
    ];
    mockRecord.mockImplementationOnce(async () => {
      throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
    });
    await show();
    await fireEvent.press(await screen.findByText('Log warm-up 1'));
    expect(await screen.findByText("That set couldn't be saved on the phone. Try again.")).toBeTruthy();
    await fireEvent.press(screen.getAllByText('One-arm dumbbell row')[0]);
    expect(await screen.findByText('Log warm-up 1')).toBeTruthy();
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

describe('a move added to the session, outside the plan (K-416)', () => {
  const LAT = { id: 'lat_pulldown', nameKey: 'exercises.lat_pulldown.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
  beforeEach(() => {
    mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, LAT] } };
  });
  const latName = t('exercises.lat_pulldown.name');

  test('found by name in the catalog, added with one tap, logged like any move — with no reps made up', async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'lat');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.pick', { name: latName }) }));
    expect(screen.getAllByText(latName).length).toBeGreaterThan(1); // in the list and as the card's title
    expect(screen.getByLabelText(t('workout.repsLabel')).props.value).toBe('');
    await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '50');
    await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '10');
    await fireEvent.press(screen.getByText('Log set 1'));
    expect(sets().at(-1)).toEqual({
      kind: 'set',
      workoutClientId: 'w1',
      body: {
        clientId: expect.any(String),
        exerciseId: 'lat_pulldown',
        setType: 'WORKING',
        loadKg: 50,
        reps: 10,
        rir: workoutParams.targetRirMax,
        side: 'BOTH',
      },
    });
  });

  test("a move done in this session outside the plan is in the session's list when it is opened again", async () => {
    mockRecords = [
      ...mockRecords,
      record('set', 'x1', { clientId: 'x1', exerciseId: 'lat_pulldown', setType: 'WORKING', loadKg: 50, reps: 10, rir: 1 }, 'w1'),
    ];
    await show();
    expect((await screen.findAllByText(latName)).length).toBeGreaterThan(0);
  });

  test("the plan's own moves are not offered again; a name not in the catalog says so", async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'bench');
    expect(screen.queryByRole('button', { name: t('workout.add.pick', { name: 'Bench press' }) })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'zzz');
    expect(screen.getByText(t('workout.add.none'))).toBeOnTheScreen();
  });

  const SPLIT = { id: 'bulgarian_split_squat', nameKey: 'exercises.bulgarian_split_squat.name', load: 'EXTERNAL', unilateral: true } as Schemas['Exercise'];
  const addByName = async (query: string, name: string) => {
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), query);
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.pick', { name }) }));
  };
  const logTyped = async (load: string, reps: string, button: string) => {
    await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), load);
    await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), reps);
    await fireEvent.press(screen.getByText(button));
  };
  const sideButton = (side: 'LEFT' | 'RIGHT') => t('workout.logSide', { number: 1, side: t(`workout.sideName.${side}`) });

  test("after a set of the added move its card stays: there is no planned count to finish it, the plan's moves wait", async () => {
    await show();
    await addByName('lat', latName);
    await logTyped('50', '10', t('workout.log', { number: 1 }));
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 2 })));
    expect(sets().map((s) => s.body.exerciseId)).toEqual(['lat_pulldown', 'lat_pulldown']);
  });

  test('two moves added: the second keeps its card through both sides, though its first set puts it before the other', async () => {
    mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, LAT, SPLIT] } };
    await show();
    await addByName('lat', latName);
    await addByName('bulgarian', t('exercises.bulgarian_split_squat.name'));
    await logTyped('20', '8', sideButton('LEFT'));
    await fireEvent.press(await screen.findByText(sideButton('RIGHT')));
    expect(sets().map((s) => [s.body.exerciseId, s.body.side])).toEqual([
      ['bulgarian_split_squat', 'LEFT'],
      ['bulgarian_split_squat', 'RIGHT'],
    ]);
    // The list keeps the order they were added in.
    const names = ['Bench press', t('exercises.one_arm_dumbbell_row.name'), latName, t('exercises.bulgarian_split_squat.name')];
    const listed = screen
      .getAllByRole('button')
      .filter((b) => b.props.accessibilityState?.selected !== undefined)
      .map((b) => within(b).getAllByText(/./)[0].props.children as string)
      .filter((text) => names.includes(text));
    expect(listed).toEqual(names);
  });

  test("the progress counts the plan's moves only; an added move says its set with no count to reach", async () => {
    await show();
    await addByName('lat', latName);
    await logTyped('50', '10', t('workout.log', { number: 1 }));
    expect(await screen.findByText(t('workout.progress', { done: 0, count: 2 }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.setNumber', { number: 2 }))).toBeOnTheScreen();
  });

  test('the panel closes without adding anything', async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'lat');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.close') }));
    expect(screen.queryByLabelText(t('workout.add.search'))).toBeNull();
    expect(screen.queryByText(latName)).toBeNull();
    expect(screen.getByRole('button', { name: t('workout.add.open') })).toBeOnTheScreen();
  });
});

describe("the user's own move (K-416, ADR-035)", () => {
  const LANDMINE: Move = { id: 'custom:1', nameKey: '', name: 'Landmine press', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] };

  test('found by the name they gave, added, and logged under its id; its name in the list, on the card and at the finish', async () => {
    mockOwn = [LANDMINE];
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'landmine');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.pick', { name: 'Landmine press' }) }));
    expect(screen.getAllByText('Landmine press').length).toBeGreaterThan(1);
    expect(screen.queryByText('custom:1')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '30');
    await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '10');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    expect(sets().at(-1)?.body).toMatchObject({ exerciseId: 'custom:1', loadKg: 30, reps: 10 });
    await fireEvent.press(await screen.findByText(t('workout.finish')));
    expect(await screen.findByLabelText(`Landmine press: ${t('workout.form.clean')}`)).toBeOnTheScreen();
  });
});

describe("creating the user's own move (K-416, ADR-035): the catalog's matches first, the engine's questions asked", () => {
  const answer = (question: string, choice: string) => fireEvent.press(screen.getByLabelText(`${t(question)} ${choice}`));
  const openCreate = async (name: string) => {
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), name);
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.create', { name }) }));
  };
  const answerAll = async () => {
    await answer('ownMove.kind', t('ownMove.kinds.COMPOUND'));
    await answer('ownMove.equipment', t('ownMove.equipments.BARBELL'));
    await answer('ownMove.unilateral', t('ownMove.no'));
  };
  const saved = (body: { clientId: string; name: string }) => ({ ...(body as object), id: 'custom:9' });
  beforeEach(() => {
    mockSave = async (body) => {
      const move = saved(body as { clientId: string; name: string });
      mockOwn = [ownMove(move as components['schemas']['CustomExercise'])];
      return { data: move, response: new Response(null, { status: 201 }) };
    };
  });

  test("a catalog move that matches the name is offered first, and picking it creates nothing", async () => {
    const T_BAR = { id: 't_bar_row', nameKey: 'exercises.t_bar_row.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, T_BAR] } };
    await show();
    await openCreate('Landmine row'); // the T-bar row's other name
    expect(screen.getByText(t('ownMove.similar'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.pick', { name: t('exercises.t_bar_row.name') }) }));
    expect(mockPOST).not.toHaveBeenCalled();
    expect(screen.getAllByText(t('exercises.t_bar_row.name')).length).toBeGreaterThan(1);
  });

  test('saved only when every question is answered; then it is in the session by its name, its sets under its id', async () => {
    await show();
    await openCreate('Landmine press');
    const save = screen.getByRole('button', { name: t('ownMove.save') });
    expect(save).toBeDisabled();
    await answerAll();
    await fireEvent.press(save);
    expect(mockPOST).toHaveBeenCalledWith('/v1/custom-exercises', {
      body: { clientId: expect.any(String), name: 'Landmine press', kind: 'COMPOUND', load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false },
    });
    expect(await screen.findAllByText('Landmine press')).not.toHaveLength(0);
    expect(screen.queryByText(t('ownMove.title'))).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '30');
    await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '10');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    expect(sets().at(-1)?.body).toMatchObject({ exerciseId: 'custom:9' });
  });

  test('the body as the equipment asks whether weight is added', async () => {
    await show();
    await openCreate('Ring dip');
    await answer('ownMove.kind', t('ownMove.kinds.COMPOUND'));
    await answer('ownMove.equipment', t('ownMove.equipments.BODYWEIGHT'));
    await answer('ownMove.unilateral', t('ownMove.no'));
    expect(screen.getByRole('button', { name: t('ownMove.save') })).toBeDisabled();
    await answer('ownMove.added', t('ownMove.addedYes'));
    await fireEvent.press(screen.getByRole('button', { name: t('ownMove.save') }));
    expect(mockPOST.mock.calls[0][1].body).toMatchObject({ load: 'BODYWEIGHT_PLUS_EXTERNAL', equipment: 'BODYWEIGHT' });
  });

  test('offline it says a connection is needed, keeps the answers, and a second try is the same move (one clientId)', async () => {
    let first = true;
    const online = mockSave;
    mockSave = async (body) => {
      if (first) {
        first = false;
        throw new TypeError('Network request failed');
      }
      return online(body);
    };
    await show();
    await openCreate('Landmine press');
    await answerAll();
    await fireEvent.press(screen.getByRole('button', { name: t('ownMove.save') }));
    expect(await screen.findByText(t('ownMove.offline'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('ownMove.save') }));
    expect(await screen.findAllByText('Landmine press')).not.toHaveLength(0);
    const [a, b] = mockPOST.mock.calls.map(([, init]) => (init.body as { clientId: string }).clientId);
    expect(a).toBe(b);
  });

  test('the name as corrected in the form is the one saved', async () => {
    await show();
    await openCreate('Landmin');
    await fireEvent.changeText(screen.getByLabelText(t('ownMove.name')), 'Landmine press');
    await answerAll();
    await fireEvent.press(screen.getByRole('button', { name: t('ownMove.save') }));
    expect(mockPOST.mock.calls[0][1].body).toMatchObject({ name: 'Landmine press' });
  });

  test("the user's own moves are offered too, so the same move is not made twice; moves in the session are not", async () => {
    mockOwn = [{ ...ownMove({ id: 'custom:1', clientId: 'c1', name: 'Landmine press', kind: 'COMPOUND', load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false }) }];
    await show();
    await openCreate('Landmine');
    expect(screen.getByRole('button', { name: t('workout.add.pick', { name: 'Landmine press' }) })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('ownMove.back') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'Bench');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.create', { name: 'Bench' }) }));
    expect(screen.queryByRole('button', { name: t('workout.add.pick', { name: 'Bench press' }) })).toBeNull();
  });

  test('nothing typed, nothing to create', async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    expect(screen.queryByRole('button', { name: /^Create / })).toBeNull();
  });

  test('saved, but the read of the own moves after it does not have it yet: added by its name all the same', async () => {
    mockSave = async (body) => ({ data: saved(body as { clientId: string; name: string }), response: new Response(null, { status: 201 }) });
    await show();
    await openCreate('Landmine press');
    await answerAll();
    await fireEvent.press(screen.getByRole('button', { name: t('ownMove.save') }));
    expect(await screen.findAllByText('Landmine press')).not.toHaveLength(0);
    expect(screen.queryByText('custom:9')).toBeNull();
    // Kept on the phone from the server's answer, for the next screen offline.
    expect(mockServices.training.saved).toHaveBeenCalledWith(expect.objectContaining({ id: 'custom:9', name: 'Landmine press' }));
  });

  test('two taps on Save in one frame send it once', async () => {
    await show();
    await openCreate('Landmine press');
    await answerAll();
    // The handler itself, twice in one step, before a render could disable the button.
    const press = (screen.getByRole('button', { name: t('ownMove.save') }).props as { onClick: (event: object) => void }).onClick;
    await act(async () => {
      press({ nativeEvent: {} });
      press({ nativeEvent: {} });
    });
    expect(mockPOST).toHaveBeenCalledTimes(1);
  });

  test('refused by the server: said, nothing added', async () => {
    mockSave = async () => ({ error: { code: 'VALIDATION_FAILED' }, response: new Response(null, { status: 400 }) });
    await show();
    await openCreate('Landmine press');
    await answerAll();
    await fireEvent.press(screen.getByRole('button', { name: t('ownMove.save') }));
    expect(await screen.findByText(t('ownMove.refused'))).toBeOnTheScreen();
    expect(screen.getByText(t('ownMove.title'))).toBeOnTheScreen();
  });
});

describe('supersets (K-416, ADR-035): an id on the sets, the partner next, the rest after the round', () => {
  const rowName = t('exercises.one_arm_dumbbell_row.name');
  const link = async () => {
    await fireEvent.press(await screen.findByRole('button', { name: t('superset.link') }));
    await fireEvent.press(screen.getByRole('button', { name: t('superset.pick', { name: rowName }) }));
  };
  const typeAndLog = async (button: string) => {
    await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '20');
    await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '10');
    await fireEvent.press(screen.getByText(button));
  };
  const rowSide = (side: 'LEFT' | 'RIGHT', number = 1) => t('workout.logSide', { number, side: t(`workout.sideName.${side}`) });

  test("linked, a set of one carries the superset's id and brings up the other — no rest until the round is done", async () => {
    await show();
    await link();
    expect(screen.getByText(t('superset.with', { names: rowName }))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    expect(await screen.findByText(rowSide('LEFT'))).toBeOnTheScreen();
    expect(screen.queryByText(/^Rest ·/)).toBeNull();
    await typeAndLog(rowSide('LEFT'));
    expect(await screen.findByText(rowSide('RIGHT'))).toBeOnTheScreen(); // both sides before the partner
    expect(screen.queryByText(/^Rest ·/)).toBeNull(); // no rest between the sides
    await typeAndLog(rowSide('RIGHT'));
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen(); // the bench again
    expect(screen.getByText(/^Rest ·/)).toBeOnTheScreen();
    const ids = sets().map((s) => s.body.supersetId);
    expect(ids[0]).toEqual(expect.any(String));
    expect(new Set(ids)).toEqual(new Set([ids[0]]));
    expect(sets().map((s) => s.body.exerciseId)).toEqual(['bench_press', 'one_arm_dumbbell_row', 'one_arm_dumbbell_row']);
  });

  test('opened again, the superset is read back from the sets: its line, and the next set under the same id', async () => {
    mockRecords = [
      ...mockRecords,
      record('set', 'b1', { clientId: 'b1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps: 8, rir: 1, supersetId: 'g1' }, 'w1'),
      record('set', 'r1', { clientId: 'r1', exerciseId: 'one_arm_dumbbell_row', setType: 'WORKING', loadKg: 20, reps: 10, rir: 1, side: 'LEFT', supersetId: 'g1' }, 'w1'),
      record('set', 'r2', { clientId: 'r2', exerciseId: 'one_arm_dumbbell_row', setType: 'WORKING', loadKg: 20, reps: 10, rir: 1, side: 'RIGHT', supersetId: 'g1' }, 'w1'),
    ];
    await show();
    expect(await screen.findByText(t('superset.with', { names: rowName }))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 2 })));
    expect(sets().at(-1)?.body).toMatchObject({ exerciseId: 'bench_press', supersetId: 'g1' });
  });

  test('a move already in a superset is not offered to another move', async () => {
    const LAT = { id: 'lat_pulldown', nameKey: 'exercises.lat_pulldown.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, LAT] } };
    await show();
    await link(); // the bench with the row
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'lat');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.pick', { name: t('exercises.lat_pulldown.name') }) }));
    expect(screen.queryByRole('button', { name: t('superset.link') })).toBeNull(); // nothing left to pair it with
  });

  test('picking a partner says what it is for, and can be left without linking', async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('superset.link') }));
    expect(screen.getByText(t('superset.choose'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('superset.pick', { name: 'Bench press' }) })).toBeNull(); // not with itself
    await fireEvent.press(screen.getByRole('button', { name: t('superset.close') }));
    expect(screen.queryByRole('button', { name: t('superset.pick', { name: rowName }) })).toBeNull();
    expect(screen.getByRole('button', { name: t('superset.link') })).toBeOnTheScreen();
  });

  const groupSet = (clientId: string, exerciseId: string, supersetId: string | undefined, side?: 'LEFT' | 'RIGHT') =>
    record(
      'set',
      clientId,
      { clientId, exerciseId, setType: 'WORKING', loadKg: 20, reps: 10, rir: 1, ...(side ? { side } : {}), ...(supersetId ? { supersetId } : {}) },
      'w1',
    );

  test("the round is the order it was started in, not linked in: the row first, the rest after the bench", async () => {
    await show();
    await link(); // linked on the bench's card
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${rowName}`) }));
    await typeAndLog(rowSide('LEFT'));
    await typeAndLog(rowSide('RIGHT'));
    expect(await screen.findByText(t('workout.log', { number: 1 }))).toBeOnTheScreen(); // the bench
    expect(screen.queryByText(/^Rest ·/)).toBeNull(); // mid-round
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    expect(await screen.findByText(/^Rest ·/)).toBeOnTheScreen();
  });

  test('the partner done: the rest after each set, the same move again; done too, the next move of the day', async () => {
    const RAISE = { id: 'lateral_raise', nameKey: 'exercises.lateral_raise.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    const three = { ...DAY, exercises: [...DAY.exercises, { exerciseId: 'lateral_raise', baseSets: 2, sets: 2, reps: { min: 10, max: 15 }, targetRir: 1 }] };
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [three] } }, exercises: { state: 'ready', value: [...EXERCISES, RAISE] } };
    mockRecords = [
      ...mockRecords,
      groupSet('b1', 'bench_press', 'g1'),
      ...['r1', 'r2'].flatMap((id) => [groupSet(`${id}L`, 'one_arm_dumbbell_row', 'g1', 'LEFT'), groupSet(`${id}R`, 'one_arm_dumbbell_row', 'g1', 'RIGHT')]),
    ];
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 2 })));
    expect(await screen.findByText(t('workout.log', { number: 3 }))).toBeOnTheScreen();
    expect(screen.getByText(/^Rest ·/)).toBeOnTheScreen();
    expect(sets().at(-1)?.body.supersetId).toBe('g1');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 3 })));
    expect(await screen.findByText(t('workout.log', { number: 1 }))).toBeOnTheScreen(); // the raise
    expect(screen.getAllByText(t('exercises.lateral_raise.name')).length).toBeGreaterThan(1);
  });

  test('a move outside the plan in a superset, its partner done: it stays, with the rest', async () => {
    const LAT = { id: 'lat_pulldown', nameKey: 'exercises.lat_pulldown.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, LAT] } };
    mockRecords = [...mockRecords, ...['b1', 'b2', 'b3'].map((id) => groupSet(id, 'bench_press', 'g1')), groupSet('l1', 'lat_pulldown', 'g1')];
    await show();
    await fireEvent.press((await screen.findAllByText(t('exercises.lat_pulldown.name')))[0]);
    await fireEvent.press(screen.getByText(t('workout.log', { number: 2 })));
    expect(await screen.findByText(t('workout.log', { number: 3 }))).toBeOnTheScreen();
    expect(screen.getByText(/^Rest ·/)).toBeOnTheScreen();
  });

  test('read back with one move done only, or unlinked and a set done since: no superset, opened again too', async () => {
    mockRecords = [...mockRecords, groupSet('b1', 'bench_press', 'g1')];
    await show();
    expect(await screen.findByRole('button', { name: t('superset.link') })).toBeOnTheScreen();
    expect(screen.queryByText(t('superset.with', { names: rowName }))).toBeNull();
  });

  test('unlinked after sets, a set done since: opened again, it stays unlinked', async () => {
    mockRecords = [
      ...mockRecords,
      groupSet('b1', 'bench_press', 'g1'),
      groupSet('r1L', 'one_arm_dumbbell_row', 'g1', 'LEFT'),
      groupSet('r1R', 'one_arm_dumbbell_row', 'g1', 'RIGHT'),
      groupSet('b2', 'bench_press', undefined),
    ];
    await show();
    expect(await screen.findByRole('button', { name: t('superset.link') })).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 3 })));
    expect(sets().at(-1)?.body.supersetId).toBeUndefined();
  });

  test('unlinked, the next set is no superset, with the rest; the link is offered again', async () => {
    await show();
    await link();
    await fireEvent.press(screen.getByRole('button', { name: t('superset.unlink') }));
    expect(screen.getByRole('button', { name: t('superset.link') })).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    expect(sets().at(-1)?.body.supersetId).toBeUndefined();
    expect(screen.getByText(/^Rest ·/)).toBeOnTheScreen();
    expect(screen.queryByText(t('superset.with', { names: rowName }))).toBeNull();
  });
});

describe('the rest in the background (K-411)', () => {
  test('a work set starts the rest and its alert, from the moment it was logged; the next set moves it', async () => {
    await show();
    const before = Date.now();
    await fireEvent.press(await screen.findByText('Log set 1'));
    await screen.findByText('Log set 2');
    expect(mockServices.restAlert.start).toHaveBeenCalledTimes(1);
    const [since] = mockServices.restAlert.start.mock.calls[0];
    expect(since).toBeGreaterThanOrEqual(before);
    expect(since).toBeLessThanOrEqual(Date.now());
    await fireEvent.press(screen.getByText('Log set 2'));
    await screen.findByText('Log set 3');
    expect(mockServices.restAlert.start).toHaveBeenCalledTimes(2);
  });

  test('leaving the session takes the alert away', async () => {
    await show();
    await fireEvent.press(await screen.findByText('Log set 1'));
    await screen.findByText('Log set 2');
    expect(mockServices.restAlert.stop).not.toHaveBeenCalled();
    await screen.unmount();
    expect(mockServices.restAlert.stop).toHaveBeenCalled();
  });

  test('a superset: no alert between partners, one when the round is done', async () => {
    const rowName = t('exercises.one_arm_dumbbell_row.name');
    const typeAndLog = async (button: string) => {
      await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '20');
      await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '10');
      await fireEvent.press(screen.getByText(button));
    };
    const rowSide = (side: 'LEFT' | 'RIGHT') => t('workout.logSide', { number: 1, side: t(`workout.sideName.${side}`) });
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('superset.link') }));
    await fireEvent.press(screen.getByRole('button', { name: t('superset.pick', { name: rowName }) }));
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(rowSide('LEFT'));
    await typeAndLog(rowSide('LEFT'));
    await screen.findByText(rowSide('RIGHT'));
    expect(mockServices.restAlert.start).not.toHaveBeenCalled();
    await typeAndLog(rowSide('RIGHT'));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(mockServices.restAlert.start).toHaveBeenCalledTimes(1);
  });
});
