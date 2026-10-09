/**
 * The session (K-405, prototype 2.4, B §6.5): the day's moves, the move under way with its rows — the server's next
 * target faint, last time beside it — and one tap logs the set as suggested, with the RIR picked (0, 1, 2+). A rest
 * timer after each set (G1 K-49: 2-3 min). Finishing asks whether each move's form was clean (G6 K-31). Everything goes
 * through the phone's queue (K-304), so it all works offline.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo, AppState } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import WorkoutScreen from '@/app/workout';
import { NoAnswer, type Outbound, createSyncQueue, recordClientId } from '@/sync/queue';
import { type LocalRecord, openRecordStore } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import { focusPalette, tokens } from '@/theme/tokens';
import { workoutParams } from '@/train/params';
import { createSetEdits } from '@/train/setEdits';
import { type Move, type TrainData, ownMove } from '@/train/trainData';

import { nodeSqlite } from './support/nodeSqlite';

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
  // Focused while mounted; mockBlur leaves the screen as a pushed one would (its cleanup).
  useFocusEffect: (effect: () => (() => void) | void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => {
      const cleanup = effect();
      mockBlur = cleanup ?? null;
      return cleanup;
    }, [effect]);
  },
}));
let mockBlur: (() => void) | null = null;
// The status bar over the focus mode (ADR-070 #4): what the screen asks of it, and whether it is there.
const mockStatusBar = jest.fn();
const mockStatusBars = { mounted: 0 };
jest.mock('expo-status-bar', () => ({
  StatusBar: (props: { style?: string }) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    mockStatusBar(props);
    useEffect(() => {
      mockStatusBars.mounted += 1;
      return () => {
        mockStatusBars.mounted -= 1;
      };
    }, []);
    return null;
  },
}));

const EXERCISES = [
  { id: 'bench_press', load: 'EXTERNAL', unilateral: false },
  { id: 'one_arm_dumbbell_row', load: 'EXTERNAL', unilateral: true },
] as Schemas['Exercise'][];
const DAY: Schemas['ProgramDay'] = {
  id: 'day-a',
  nameKey: 'programDays.upper_a.name',
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
  // As the queue does: a clientId already saved is not saved twice (false), the first copy stays.
  if (mockRecords.some((r) => r.clientId === clientId)) return false;
  mockRecords =[...mockRecords, { ...record(outbound.kind, clientId, outbound.body, parent), state: 'PENDING' }];
  return true;
};
const mockRecord = jest.fn(keep);
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
let mockPause: { workout: string; pause: { pausedAt: number | null; pausedMs: number } } | null = null;
let mockSkips: { workout: string; skips: Record<string, unknown> } | null = null;
let mockEditFails: Error | null = null;
const mockWorkoutRecords = jest.fn(async () => mockRecords);
let mockSave: (body: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
const mockPOST = jest.fn(async (_path: string, init: { body: unknown }) => mockSave(init.body));
let mockDelete: () => Promise<{ response: Response }> = async () => ({ response: new Response(null, { status: 204 }) });
const mockDELETE = jest.fn(async (_path: string, _init: unknown) => mockDelete());
const mockServices = {
  api: { POST: mockPOST, DELETE: mockDELETE },
  // A set of the session corrected or taken back on the phone (K-972): the store as the phone's.
  // A set corrected or deleted (K-972): the phone's records as setEdits leaves them (its own tests run the real store
  // and queue); `mockEditFails` makes the next change fail as given.
  workoutEdits: {
    change: jest.fn(async (clientId: string, next: unknown) => {
      if (mockEditFails !== null) throw mockEditFails;
      const old = mockRecords.find((r) => r.clientId === clientId) ?? null;
      mockRecords = next === null ? mockRecords.filter((r) => r.clientId !== clientId) : mockRecords.map((r) => (r.clientId === clientId ? { ...r, body: next } : r));
      return old;
    }),
    discard: jest.fn(async (workoutClientId: string) => {
      if (mockEditFails !== null) throw mockEditFails;
      mockRecords = mockRecords.filter((r) => r.clientId !== workoutClientId && r.parentClientId !== workoutClientId);
    }),
    restore: jest.fn(async (gone: LocalRecord) => {
      if (mockEditFails !== null) throw mockEditFails;
      mockRecords = [...mockRecords, { ...gone, clientId: `back-${gone.clientId}`, body: { ...(gone.body as object), clientId: `back-${gone.clientId}` } }].sort((x, y) => x.seq - y.seq);
    }),
  },
  training: { read: async () => mockData, own: async () => mockOwn, saved: jest.fn(async () => {}) },
  workoutRecords: () => mockWorkoutRecords(),
  queue: { record: (outbound: Outbound) => mockRecord(outbound) },
  report: jest.fn(),
  // The rest timer's voice in the background (K-411).
  restAlert: { start: jest.fn(async (_since: number) => {}), stop: jest.fn(async () => {}) },
  // What was skipped in the open session, kept with its workout (K-972).
  sessionSkips: {
    read: jest.fn(async (workout: string) => (mockSkips?.workout === workout ? mockSkips.skips : {})),
    keep: jest.fn(async (workout: string, skips: Record<string, unknown>) => {
      mockSkips = { workout, skips };
    }),
    forget: jest.fn(async () => {
      mockSkips = null;
    }),
  },
  // The open session's pause, kept with its workout (K-972).
  sessionPause: {
    read: jest.fn(async (workout: string) => (mockPause?.workout === workout ? mockPause.pause : { pausedAt: null, pausedMs: 0 })),
    keep: jest.fn(async (workout: string, pause: { pausedAt: number | null; pausedMs: number }) => {
      mockPause = { workout, pause };
    }),
    forget: jest.fn(async () => {
      mockPause = null;
    }),
  },
  // Apple Health writing (K-412): the switch decides inside; the screen only says a session finished.
  healthWriting: { workoutFinished: jest.fn(async (_workout: unknown) => {}) },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

function reset() {
  jest.clearAllMocks();
  mockParams = {};
  mockUnits = 'METRIC';
  mockWorkoutRecords.mockImplementation(async () => mockRecords);
  mockRecord.mockImplementation(keep);
  mockPause = null;
  mockSkips = null;
  mockEditFails = null;
  mockDelete = async () => ({ response: new Response(null, { status: 204 }) });
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
  mockOwn = [];
  mockRecords = [...lastWeek(), record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' })];
}
beforeEach(reset);

const show = () =>
  render(
    <ThemeProvider>
      <WorkoutScreen />
    </ThemeProvider>,
  );

// The screen's first render loads and compiles what it draws: ~2 s locally with two workers and no cache, past Jest's 5 s
// on CI's runner (three runs, 4 Oct). Paid once here, under its own budget, so no test carries it; each test still has 5 s.
const COLD_START_MS = 30_000;
beforeAll(async () => {
  reset();
  await (await show()).unmount();
}, COLD_START_MS);
const sets = () => mockRecord.mock.calls.map(([outbound]) => outbound).filter((o) => o.kind === 'set');
/**
 * End, then "Finish and save" (K-972: End offers three ways out; a session with nothing kept closes at once, with no
 * choice to make).
 */
const endAndFinish = async () => {
  await fireEvent.press(await screen.findByRole('button', { name: t('workout.endLabel') }));
  const finish = screen.queryByRole('button', { name: new RegExp(`^${t('workout.ending.finish')}`) });
  if (finish !== null) await fireEvent.press(finish);
};
/** A move picked by its dot (K-971: the moves are dots, each said by its name and status). */
const pickMove = async (name: string) =>
  fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, `) }));

// K-971 (ADR-075 #1): one set under way, filled with the suggestion; the rows of sets to do and the phone's last-time
// column are gone (the server's target line has its own tests below). Last time's sets still fill the suggestion
// (workout.test.ts).
test("the day's moves, and the move under way filled with the server's next target", async () => {
  await show();
  expect(await screen.findByText('Upper A')).toBeTruthy();
  expect(screen.getAllByText('Bench press').length).toBeGreaterThan(0);
  // K-971: the moves are dots, each said with its status.
  expect(screen.getByLabelText(t('workout.dot', { name: 'Bench press', status: '3 sets' }))).toBeTruthy(); // before any set
  expect(screen.getByText(t('workout.targetRir', { max: 1 }))).toBeTruthy();
  expect(screen.getByLabelText('Weight (kg)').props.value).toBe('62.5');
  expect(screen.getByLabelText('Reps').props.value).toBe('6');
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
  expect(screen.getByText('Rest · 2:00-3:00')).toBeTruthy();
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

test('what is typed and the RIR picked are what is logged; 2+ is logged as 2 (ADR-075 #2)', async () => {
  await show();
  await fireEvent.changeText(await screen.findByLabelText('Weight (kg)'), '60');
  await fireEvent.changeText(screen.getByLabelText('Reps'), '5');
  await fireEvent.press(screen.getByText('2+'));
  await fireEvent.press(screen.getByText('Log set 1'));
  expect(sets()[0].body).toMatchObject({ loadKg: 60, reps: 5, rir: 2 });
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
  await endAndFinish();
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
  await pickMove('One-arm dumbbell row');
  await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '20');
  await fireEvent.changeText(screen.getByLabelText('Reps'), '12');
  await fireEvent.press(screen.getByText('Log set 1 · left'));
  expect(sets()[0].body).toMatchObject({ exerciseId: 'one_arm_dumbbell_row', side: 'LEFT', loadKg: 20, reps: 12 });
  expect(await screen.findByText('Log set 1 · right')).toBeTruthy();
});

test("finishing asks about each move's form; a move marked not clean is sent, and the summary opens", async () => {
  await show();
  await fireEvent.press(await screen.findByText('Log set 1'));
  await endAndFinish();
  expect(screen.getByText('How was your form?')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bench press: Not clean'));
  await fireEvent.press(screen.getByText('Finish'));
  const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
  expect(finish).toMatchObject({ kind: 'finish', workoutClientId: 'w1', body: { uncleanExerciseIds: ['bench_press'] } });
  // The summary of what was done takes the session's place (K-406).
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/workout-end', params: { workout: 'w1' } });
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
  await endAndFinish();
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalled();
});

// K-971 (ADR-075 #1, C4): the done move stays with Next, which brings up the next move with sets left.
test('when the move picked is done, Next brings up the next move with sets left', async () => {
  await show();
  await pickMove('Bench press'); // its dot, picked by the user
  await fireEvent.press(screen.getByText('Log set 1'));
  await fireEvent.press(await screen.findByText('Log set 2'));
  await fireEvent.press(await screen.findByText('Log set 3'));
  await fireEvent.press(await screen.findByRole('button', { name: t('workout.next', { name: 'One-arm dumbbell row' }) }));
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
  await endAndFinish();
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
  await endAndFinish();
  await fireEvent.press(screen.getByLabelText('Bench press: Not clean'));
  await fireEvent.press(screen.getByLabelText('Bench press: Clean'));
  await fireEvent.press(screen.getByText('Finish'));
  const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
  expect(finish).toMatchObject({ body: { uncleanExerciseIds: [] } });
});

describe("warm-ups (K-417, G1 K-17): three before the day's first move, one before the others; easy, no RIR", () => {
  const GYM = { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25], dumbbellsKg: [], stackStepKg: null, machineStepsKg: {} };
  const BARBELL = EXERCISES.map((m) => ({ ...m, equipment: m.id === 'bench_press' ? 'BARBELL' : 'DUMBBELL' })) as Schemas['Exercise'][];
  // K-971 (simulator): folded to one line with its first one-tap log, so the set under way is in the first view.
  const openWarmups = async () => fireEvent.press(await screen.findByRole('button', { expanded: false, name: new RegExp(`^${t('workout.warmup.title')}, `) }));

  test('folded to one line until opened: its count and its next log; one logged, it stays open', async () => {
    await show();
    expect(await screen.findByText('Warm-up')).toBeTruthy();
    expect(screen.getByText(t('workout.sets', { count: 3 }))).toBeTruthy();
    expect(screen.queryByText('32.5 kg × 8')).toBeNull();
    expect(screen.getByText('Log warm-up 1')).toBeTruthy();
    await openWarmups();
    expect(screen.getByText('32.5 kg × 8')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { expanded: true, name: new RegExp(`^${t('workout.warmup.title')}, `) }));
    expect(screen.queryByText('32.5 kg × 8')).toBeNull(); // folded by the user, it stays folded
  });

  test('logged from the folded line, the warm-ups open: what was done and what is next', async () => {
    await show();
    await fireEvent.press(await screen.findByText('Log warm-up 1'));
    expect(await screen.findByText('32.5 kg × 8')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  test("the day's first move: three, climbing to the work load, each logged with one tap as a warm-up", async () => {
    await show();
    expect(await screen.findByText('Warm-up')).toBeTruthy();
    await openWarmups();
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
    await endAndFinish();
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
    await pickMove('One-arm dumbbell row');
    await openWarmups();
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
    await pickMove('One-arm dumbbell row');
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
    await pickMove('One-arm dumbbell row');
    expect(await screen.findByText('Log warm-up 1')).toBeTruthy();
    expect(screen.queryByText("That set couldn't be saved on the phone. Try again.")).toBeNull();
  });

  test('with the gym in use: loads its bar and plates make, and the plates a side for each and for the set under way', async () => {
    mockData = { ...mockData, exercises: { state: 'ready', value: BARBELL }, gym: GYM };
    await show();
    await openWarmups();
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
    // K-971: its dot and the card's title.
    expect(screen.getByRole('button', { name: new RegExp(`^${latName}, `) })).toBeOnTheScreen();
    expect(screen.getByText(latName)).toBeOnTheScreen();
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
    expect(await screen.findByRole('button', { name: new RegExp(`^${latName}, `) })).toBeOnTheScreen(); // its dot (K-971)
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
    // The dots keep the order they were added in (K-971: each said by its name, then its status).
    const names = ['Bench press', t('exercises.one_arm_dumbbell_row.name'), latName, t('exercises.bulgarian_split_squat.name')];
    const listed = screen
      .getAllByRole('button')
      .map((b) => names.find((n) => String(b.props.accessibilityLabel).startsWith(`${n}, `)))
      .filter((n) => n !== undefined);
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
    expect(screen.getByRole('button', { name: /^Landmine press, / })).toBeOnTheScreen(); // its dot (K-971)
    expect(screen.getByText('Landmine press')).toBeOnTheScreen(); // the card's title
    expect(screen.queryByText('custom:1')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '30');
    await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '10');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    expect(sets().at(-1)?.body).toMatchObject({ exerciseId: 'custom:1', loadKg: 30, reps: 10 });
    await endAndFinish();
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
    expect(screen.getByRole('button', { name: new RegExp(`^${t('exercises.t_bar_row.name')}, `) })).toBeOnTheScreen(); // its dot (K-971)
    expect(screen.getByText(t('exercises.t_bar_row.name'))).toBeOnTheScreen(); // the card's title
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

  // K-971 (C4): the group's last set brings no rest; Next names the next move of the day.
  test('the partner done: the rest after each set, the same move again; done too, Next to the next move of the day', async () => {
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
    const next = await screen.findByRole('button', { name: t('workout.next', { name: t('exercises.lateral_raise.name') }) });
    expect(screen.queryByText(/^Rest ·/)).toBeNull();
    await fireEvent.press(next);
    expect(await screen.findByText(t('workout.log', { number: 1 }))).toBeOnTheScreen(); // the raise
    expect(screen.getByText(t('exercises.lateral_raise.name'))).toBeOnTheScreen();
  });

  test('a move outside the plan in a superset, its partner done: it stays, with the rest', async () => {
    const LAT = { id: 'lat_pulldown', nameKey: 'exercises.lat_pulldown.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, LAT] } };
    mockRecords = [...mockRecords, ...['b1', 'b2', 'b3'].map((id) => groupSet(id, 'bench_press', 'g1')), groupSet('l1', 'lat_pulldown', 'g1')];
    await show();
    await pickMove(t('exercises.lat_pulldown.name'));
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
    // Round 2 begins: its first set ends the rest, so the last round's alert must not sound mid-round.
    const stopsBefore = mockServices.restAlert.stop.mock.calls.length;
    await fireEvent.press(screen.getByText(t('workout.log', { number: 2 })));
    await screen.findByText(t('workout.logSide', { number: 2, side: t('workout.sideName.LEFT') }));
    expect(mockServices.restAlert.stop.mock.calls.length).toBeGreaterThan(stopsBefore);
    expect(mockServices.restAlert.start).toHaveBeenCalledTimes(1); // and no new one mid-round
    expect(screen.queryByText(/^Rest ·/)).toBeNull(); // and the screen's timer of the last round goes with it
  });
});

describe('the finished session to Apple Health (K-412)', () => {
  test('finished with work in it: one workout, from its start to the finish, under its own id', async () => {
    await show();
    await fireEvent.press(await screen.findByText('Log set 1'));
    await endAndFinish();
    const before = Date.now();
    await fireEvent.press(screen.getByText('Finish'));
    expect(mockServices.healthWriting.workoutFinished).toHaveBeenCalledTimes(1);
    const [workout] = mockServices.healthWriting.workoutFinished.mock.calls[0] as unknown as [{ id: string; start: Date; end: Date }];
    expect(workout.id).toBe('w1');
    expect(workout.start).toEqual(new Date('2026-09-28T17:00:00Z'));
    expect(workout.end.getTime()).toBeGreaterThanOrEqual(before);
    const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
    expect(finish?.kind === 'finish' && finish.body.endedAt).toBe(workout.end.toISOString()); // the same moment as the finish
  });

  test('a finish the phone could not keep: nothing to write', async () => {
    await show();
    await fireEvent.press(await screen.findByText('Log set 1'));
    await endAndFinish();
    mockRecord.mockImplementation(async (outbound: Outbound) => {
      if (outbound.kind === 'finish') throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
      return keep(outbound);
    });
    await fireEvent.press(screen.getByText('Finish'));
    expect(mockServices.healthWriting.workoutFinished).not.toHaveBeenCalled();
  });

  test('finished before any set: nothing to write', async () => {
    await show();
    await endAndFinish();
    expect(mockServices.healthWriting.workoutFinished).not.toHaveBeenCalled();
  });
});

describe("today's session as the week has it (K-971, K-964, ADR-073 Ek 3): the server's moves, none picked on the phone", () => {
  const withWeek = (session: Partial<Schemas['WeekSession']>) => {
    const week: Schemas['WeekSession'][] = [{ programDayId: 'day-a', date: '2026-09-28', exerciseIds: ['bench_press', 'one_arm_dumbbell_row'], ...session }];
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, week } } };
  };

  test('the short version: only the moves the server lists, and the count is theirs', async () => {
    withWeek({ short: true, exerciseIds: ['bench_press'] });
    await show();
    expect(await screen.findByText(t('workout.progressOne', { done: 0 }))).toBeOnTheScreen();
    expect(screen.queryByText(t('exercises.one_arm_dumbbell_row.name'))).toBeNull();
  });

  test('the session under way keeps the list of the day it started on, after midnight too (K-961)', async () => {
    // w1 started 2026-09-28; today is later: the list is still that day's.
    withWeek({ short: true, exerciseIds: ['bench_press'] });
    await show();
    expect(await screen.findByText(t('workout.progressOne', { done: 0 }))).toBeOnTheScreen();
  });

  test('opened on another day than the week has its session on: the day as planned, the short version was for that day only', async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    withWeek({ short: true, exerciseIds: ['bench_press'] }); // 2026-09-28, long past
    await show();
    expect(await screen.findByText(t('workout.progress', { done: 0, count: 2 }))).toBeOnTheScreen();
  });

  test("opened on the server's today (the phone's clock on another day, travelling): today's short version, as the Train card shows it", async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    withWeek({ short: true, exerciseIds: ['bench_press'] });
    mockData = { ...mockData, program: { state: 'ready', value: { ...(mockData.program as { value: Schemas['Program'] }).value, today: '2026-09-28' } } };
    await show();
    expect(await screen.findByText(t('workout.progressOne', { done: 0 }))).toBeOnTheScreen();
  });

  test("a move swapped for today stands in its place and starts with no target; the move it replaced is not in the session", async () => {
    const DB = { id: 'dumbbell_bench_press', nameKey: 'exercises.dumbbell_bench_press.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, DB] } };
    withWeek({
      exerciseIds: ['dumbbell_bench_press', 'one_arm_dumbbell_row'],
      swaps: [{ insteadOf: 'bench_press', exercise: { exerciseId: 'dumbbell_bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 } }],
    });
    await show();
    expect((await screen.findAllByText(t('exercises.dumbbell_bench_press.name'))).length).toBeGreaterThan(0);
    expect(screen.queryByText('Bench press')).toBeNull();
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe(''); // no target, no history of its own
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '24');
    await fireEvent.press(screen.getByText('Log set 1'));
    expect(sets()[0].body).toMatchObject({ exerciseId: 'dumbbell_bench_press', loadKg: 24 });
  });
});

describe('the focus mode session (K-971, ADR-075 #1-#2, ADR-070 #4)', () => {
  const rowName = t('exercises.one_arm_dumbbell_row.name');
  const dot = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}, `) });
  const clock = () => screen.getByTestId('session-clock').props.children as string;
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  const rowSide = (number: number, side: 'LEFT' | 'RIGHT') => t('workout.logSide', { number, side: t(`workout.sideName.${side}`) });
  const typeAndLog = async (button: string) => {
    await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '20');
    await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '10');
    await fireEvent.press(await screen.findByText(button));
  };

  test('dark whatever the appearance picked, with light status bar text', async () => {
    await render(
      <ThemeProvider scheme="light">
        <WorkoutScreen />
      </ThemeProvider>,
    );
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.getByTestId('screen')).toHaveStyle({ backgroundColor: focusPalette.background });
    expect(mockStatusBar).toHaveBeenLastCalledWith(expect.objectContaining({ style: 'light' }));
  });

  test('a session opened from a day starts at 0:00: the last workout, finished, is not carried over', async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(clock()).toBe('0:00');
  });

  test('its first set keeps the moment the session was opened as its start, so the time runs on without a jump', async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    jest.useFakeTimers({ advanceTimers: true });
    try {
      const opened = Date.now();
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      // A minute and a half of warming up before the first set.
      jest.setSystemTime(opened + 90_000);
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      await screen.findByText(t('workout.log', { number: 2 }));
      await act(async () => jest.advanceTimersByTime(1000));
      const workout = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'workout');
      const startedAt = workout?.kind === 'workout' ? Date.parse(workout.body.startedAt) : NaN;
      expect(startedAt).toBeGreaterThanOrEqual(opened);
      expect(startedAt).toBeLessThan(opened + 5_000);
      expect(clock()).toMatch(/^1:3\d$/);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a session open past the server closing it (unfinished_session_close_hours) shows no time: its end is K-972', async () => {
    const hours = workoutParams.unfinishedSessionCloseHours;
    mockRecords = [...lastWeek(), record('workout', 'w2', { clientId: 'w2', startedAt: minutesAgo(hours * 60 + 5), programDayId: 'day-a' })];
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.queryByTestId('session-clock')).toBeNull();
  });

  test('the keyboard does not hide the dock: the page and the dock rise above it', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    // The rise itself (iOS padding) is the device's to show; here, that the dock and the page are inside what rises.
    const avoiding = within(screen.getByTestId('keyboard-avoiding'));
    expect(avoiding.getByTestId('dock')).toBeOnTheScreen();
    expect(avoiding.getByTestId('session-scroll')).toBeOnTheScreen();
  });

  test('the light status bar is only while the session is in front: a screen opened from it gets its own', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(mockStatusBars.mounted).toBe(1);
    await act(async () => mockBlur?.());
    expect(mockStatusBars.mounted).toBe(0);
  });

  test('the rest has a place of its own at the top, the same size with or without it, so the page does not move', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    const slot = () => screen.getByTestId('rest-slot');
    expect(slot()).toHaveStyle({ minHeight: tokens.size.touch + tokens.space.sm * 2 });
    expect(within(slot()).queryByTestId('rest')).toBeNull();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(within(slot()).getByTestId('rest')).toBeOnTheScreen();
    expect(slot()).toHaveStyle({ minHeight: tokens.size.touch + tokens.space.sm * 2 });
  });

  test("the superset link sits with the move's other links, not over the set", async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(within(screen.getByTestId('move-head')).getByRole('button', { name: t('superset.link') })).toBeOnTheScreen();
  });

  test('in a superset up next is the partner, not the next move of the day', async () => {
    const RAISE = { id: 'lateral_raise', nameKey: 'exercises.lateral_raise.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    const three = { ...DAY, exercises: [...DAY.exercises, { exerciseId: 'lateral_raise', baseSets: 2, sets: 2, reps: { min: 10, max: 15 }, targetRir: 1 }] };
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [three] } }, exercises: { state: 'ready', value: [...EXERCISES, RAISE] } };
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('superset.link') }));
    await fireEvent.press(screen.getByRole('button', { name: t('superset.pick', { name: t('exercises.lateral_raise.name') }) }));
    expect(within(screen.getByTestId('up-next')).getByText(t('exercises.lateral_raise.name'))).toBeOnTheScreen();
  });

  test('with many moves each dot stays a full touch target, and the dots wrap', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(dot('Bench press')).toHaveStyle({ minWidth: tokens.size.touch });
    expect(screen.getByTestId('move-dots')).toHaveStyle({ flexWrap: 'wrap' });
  });

  test('opened again (the app closed mid-session), the session goes on: its real time, its sets done, the next set', async () => {
    mockRecords = [
      ...lastWeek(),
      record('workout', 'w2', { clientId: 'w2', startedAt: minutesAgo(12), programDayId: 'day-a' }),
      record('set', 'b1', { clientId: 'b1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 62.5, reps: 7, rir: 1, side: 'BOTH' }, 'w2'),
    ];
    await show();
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
    expect(clock()).toMatch(/^12:0\d$/);
    expect(screen.getByLabelText(t('workout.doneSet', { number: 1, set: '62.5 kg × 7', left: '1' }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.setOf', { number: 2, count: 3 }))).toBeOnTheScreen();
  });

  test('the rest is at the top, outside the scrolled page, and covers nothing; Log set sits in a fixed dock', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    const page = screen.getByTestId('session-scroll');
    expect(screen.getByTestId('rest')).toBeOnTheScreen();
    expect(within(page).queryByTestId('rest')).toBeNull();
    expect(screen.getByTestId('rest')).not.toHaveStyle({ position: 'absolute' });
    expect(within(screen.getByTestId('dock')).getByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
    expect(within(page).queryByText(t('workout.log', { number: 2 }))).toBeNull();
  });

  test('the rest can be ended: its timer and its alert go', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByTestId('rest');
    mockServices.restAlert.stop.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.rest.endLabel') }));
    expect(screen.queryByTestId('rest')).toBeNull();
    expect(mockServices.restAlert.stop).toHaveBeenCalled();
  });

  test("C4: after a move's last set no rest comes up; Next names the next move, and after the last move, Finish", async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 2 })));
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 3 })));
    const next = await screen.findByRole('button', { name: t('workout.next', { name: rowName }) });
    expect(screen.queryByTestId('rest')).toBeNull();
    expect(mockServices.restAlert.start).toHaveBeenCalledTimes(2); // after sets 1 and 2 only
    expect(screen.queryByText(t('workout.log', { number: 1 }))).toBeNull(); // the bench stays on screen, done
    await fireEvent.press(next);
    await typeAndLog(rowSide(1, 'LEFT'));
    await typeAndLog(rowSide(1, 'RIGHT'));
    await typeAndLog(rowSide(2, 'LEFT'));
    await typeAndLog(rowSide(2, 'RIGHT'));
    expect(await within(screen.getByTestId('dock')).findByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
    expect(screen.queryByTestId('rest')).toBeNull();
  });

  test('up next names the move after this one', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    const upNext = within(screen.getByTestId('up-next'));
    expect(upNext.getByText(rowName)).toBeOnTheScreen();
    expect(upNext.getByText(t('workout.upNext'))).toBeOnTheScreen();
  });

  test('a dot for each move says its name and where it stands; the one under way is selected, a tap picks another', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(dot('Bench press')).toBeSelected();
    expect(dot(rowName)).not.toBeSelected();
    expect(screen.getByLabelText(t('workout.dot', { name: rowName, status: t('workout.sets', { count: 2 }) }))).toBeOnTheScreen();
    await fireEvent.press(dot(rowName));
    expect(screen.getByText(rowSide(1, 'LEFT'))).toBeOnTheScreen();
  });

  test("the target line: the server's next set to beat, and last time's best", async () => {
    const withBest = { ...DAY, exercises: [{ ...DAY.exercises[0], lastBestSet: { loadKg: 60, reps: 8, rir: 1 } }, DAY.exercises[1]] };
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [withBest] } } };
    await show();
    const goal = within(await screen.findByTestId('goal'));
    expect(goal.getByText(t('workout.goal.beat'))).toBeOnTheScreen();
    expect(goal.getByText('62.5 kg × 6')).toBeOnTheScreen();
    expect(goal.getByText(t('workout.goal.last', { set: '60 kg × 8' }))).toBeOnTheScreen();
  });

  test('with a load to start from and no session before: start here, over the range', async () => {
    await show();
    const goal = within(await screen.findByTestId('goal'));
    expect(goal.getByText(t('workout.goal.start'))).toBeOnTheScreen();
    expect(goal.getByText('62.5 kg × 6-10')).toBeOnTheScreen();
  });

  test('no load known: the range alone', async () => {
    await show();
    await pickMove(rowName);
    const goal = within(await screen.findByTestId('goal'));
    expect(goal.getByText(t('workout.goal.first'))).toBeOnTheScreen();
    expect(goal.getByText(t('workout.goal.reps', { reps: '8-12' }))).toBeOnTheScreen();
  });

  describe('the weight and the reps: steppers, or typed', () => {
    const load = () => screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') }));
    const reps = () => screen.getByLabelText(t('workout.repsLabel'));
    const press = (key: string) => fireEvent.press(screen.getByRole('button', { name: t(key) }));

    test('without a gym, a step is the smallest pair of plates either way; the reps one at a time', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await press('workout.stepper.moreLoad');
      expect(load().props.value).toBe('65');
      await press('workout.stepper.lessLoad');
      await press('workout.stepper.lessLoad');
      expect(load().props.value).toBe('60');
      await press('workout.stepper.moreReps');
      expect(reps().props.value).toBe('7');
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(sets()[0].body).toMatchObject({ loadKg: 60, reps: 7 });
    });

    test('at a gym with no small plates a step goes to the next load it makes; any weight can still be typed', async () => {
      const GYM = { barKg: 20, platesKg: [20, 10, 5], dumbbellsKg: [], stackStepKg: null, machineStepsKg: {} };
      const BARBELL = EXERCISES.map((m) => ({ ...m, equipment: m.id === 'bench_press' ? 'BARBELL' : 'DUMBBELL' })) as Schemas['Exercise'][];
      const at100 = { ...DAY, exercises: [{ ...DAY.exercises[0], nextLoadKg: 100 }, DAY.exercises[1]] };
      mockData = { ...mockData, exercises: { state: 'ready', value: BARBELL }, gym: GYM, program: { state: 'ready', value: { ...PROGRAM, days: [at100] } } };
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await press('workout.stepper.moreLoad');
      expect(load().props.value).toBe('110');
      await press('workout.stepper.lessLoad');
      expect(load().props.value).toBe('100');
      await press('workout.stepper.lessLoad');
      expect(load().props.value).toBe('90');
      await fireEvent.changeText(load(), '102.5');
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(sets()[0].body).toMatchObject({ loadKg: 102.5 });
    });

    test("the weight as everywhere else: 75, not 75.0", async () => {
      const at75 = { ...DAY, exercises: [{ ...DAY.exercises[0], nextLoadKg: 75 }, DAY.exercises[1]] };
      mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [at75] } } };
      await show();
      expect((await screen.findByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') }))).props.value).toBe('75');
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(sets()[0].body).toMatchObject({ loadKg: 75 });
    });

    test('less and more are drawn, not typed characters; VoiceOver says what they do', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      for (const key of ['workout.stepper.lessLoad', 'workout.stepper.moreLoad', 'workout.stepper.lessReps', 'workout.stepper.moreReps']) {
        expect(within(screen.getByRole('button', { name: t(key) })).queryByText(/./)).toBeNull();
      }
    });

    test('a lb user at a kg gym: each less goes down a load the gym makes, and what is logged is that load', async () => {
      mockUnits = 'IMPERIAL';
      const GYM = { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25], dumbbellsKg: [], stackStepKg: null, machineStepsKg: {} };
      const BARBELL = EXERCISES.map((m) => ({ ...m, equipment: m.id === 'bench_press' ? 'BARBELL' : 'DUMBBELL' })) as Schemas['Exercise'][];
      const at = { ...DAY, exercises: [{ ...DAY.exercises[0], nextLoadKg: 102.5 }, DAY.exercises[1]] };
      mockData = { ...mockData, exercises: { state: 'ready', value: BARBELL }, gym: GYM, program: { state: 'ready', value: { ...PROGRAM, days: [at] } } };
      const lb = () => screen.getByLabelText(t('workout.loadLabel', { unit: t('units.lbUnit') }));
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(lb().props.value).toBe('226');
      await press('workout.stepper.lessLoad');
      expect(lb().props.value).toBe('220.5'); // 100 kg
      await press('workout.stepper.lessLoad');
      expect(lb().props.value).toBe('215'); // 97.5 kg
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(sets()[0].body).toMatchObject({ loadKg: 97.5 });
    });

    test("a metric user at a gym of lb dumbbells: more moves on, and what is logged is the dumbbell, not the rounded number", async () => {
      const LB_DB = { barKg: null, platesKg: [], dumbbellsKg: [11.34, 13.61, 15.88], stackStepKg: null, machineStepsKg: {} };
      const DUMBBELLS = EXERCISES.map((m) => ({ ...m, equipment: 'DUMBBELL' })) as Schemas['Exercise'][];
      const at = { ...DAY, exercises: [{ ...DAY.exercises[0], nextLoadKg: 11.34 }, DAY.exercises[1]] };
      mockData = { ...mockData, exercises: { state: 'ready', value: DUMBBELLS }, gym: LB_DB, program: { state: 'ready', value: { ...PROGRAM, days: [at] } } };
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(load().props.value).toBe('11.3');
      await press('workout.stepper.moreLoad');
      expect(load().props.value).toBe('13.6');
      await press('workout.stepper.moreLoad');
      expect(load().props.value).toBe('15.9');
      await press('workout.stepper.lessLoad');
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(sets()[0].body).toMatchObject({ loadKg: 13.61 });
    });

    test('reps typed past the most a set takes: less brings them down to it', async () => {
      await show();
      await fireEvent.changeText(await screen.findByLabelText(t('workout.repsLabel')), '999');
      await press('workout.stepper.lessReps');
      expect(reps().props.value).toBe(String(workoutParams.maxReps));
    });

    test('fewer reps stops at one', async () => {
      await show();
      await fireEvent.changeText(await screen.findByLabelText(t('workout.repsLabel')), '1');
      expect(screen.getByRole('button', { name: t('workout.stepper.lessReps') })).toBeDisabled();
    });

    test('reps left is picked from 0, 1 and 2+, with the aim beside it', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(screen.getByText(t('workout.rir.short'))).toBeOnTheScreen();
      expect(screen.getByText(t('workout.targetRir', { max: 1 }))).toBeOnTheScreen();
      for (const choice of ['0', '1', '2+']) expect(screen.getByRole('button', { name: choice })).toBeOnTheScreen();
    });
  });
});

describe('Pause and Resume (K-972, ADR-075 #5): the time stops, and goes on from where it stopped', () => {
  const clockSeconds = () => {
    const [minutes, seconds] = (screen.getByTestId('session-clock').props.children as string).split(':').map(Number);
    return minutes * 60 + seconds;
  };
  const open = (minutes: number) => {
    const startedAt = new Date(Date.now() - minutes * 60_000).toISOString();
    mockRecords = [...lastWeek(), record('workout', 'w2', { clientId: 'w2', startedAt, programDayId: 'day-a' })];
    return Date.parse(startedAt);
  };
  const pause = () => fireEvent.press(screen.getByRole('button', { name: t('workout.pauseLabel') }));
  const resume = () => fireEvent.press(within(screen.getByTestId('session-header')).getByRole('button', { name: t('workout.resumeLabel') }));
  const tick = async (ms: number) => {
    jest.setSystemTime(Date.now() + ms);
    await act(async () => jest.advanceTimersByTime(1000));
  };

  test('paused, the time stands still; resumed, it goes on from there', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    try {
      open(5);
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await pause();
      const stopped = clockSeconds();
      await tick(60_000);
      expect(clockSeconds()).toBe(stopped);
      await resume();
      await tick(5_000);
      expect(clockSeconds() - stopped).toBeGreaterThanOrEqual(5);
      expect(clockSeconds() - stopped).toBeLessThan(10);
    } finally {
      jest.useRealTimers();
    }
  });

  test('paused is plain to see, the rest ends with its alert, and the pause is kept with its workout', async () => {
    open(5);
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByTestId('rest');
    mockServices.restAlert.stop.mockClear();
    await pause();
    expect(within(screen.getByTestId('rest-slot')).getByText(t('workout.paused'))).toBeOnTheScreen();
    expect(screen.queryByTestId('rest')).toBeNull();
    expect(mockServices.restAlert.stop).toHaveBeenCalled();
    expect(within(screen.getByTestId('session-header')).getByRole('button', { name: t('workout.resumeLabel') })).toBeOnTheScreen();
    expect(mockPause).toEqual({ workout: 'w2', pause: { pausedAt: expect.any(Number), pausedMs: 0 } });
    await resume();
    expect(screen.queryByText(t('workout.paused'))).toBeNull();
    expect(mockPause?.pause.pausedAt).toBeNull();
  });

  test('closed while paused, the session opens paused, its time where it stopped', async () => {
    const startedAt = open(12);
    mockPause = { workout: 'w2', pause: { pausedAt: startedAt + 2 * 60_000, pausedMs: 0 } };
    await show();
    await screen.findByText(t('workout.paused'));
    expect(clockSeconds()).toBe(120);
  });

  test('a pause of another workout is not this one\'s', async () => {
    open(3);
    mockPause = { workout: 'w0', pause: { pausedAt: Date.now() - 60_000, pausedMs: 0 } };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.queryByText(t('workout.paused'))).toBeNull();
  });

  test('a set logged while paused means the session goes on: it resumes', async () => {
    open(5);
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await pause();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(screen.queryByText(t('workout.paused'))).toBeNull();
    expect(mockPause?.pause.pausedAt).toBeNull();
  });

  test('paused before the first set and still paused: the first set starts the workout with the pause kept, then goes on', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    try {
      mockRecords = lastWeek();
      mockParams = { day: 'day-a' };
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await pause();
      jest.setSystemTime(Date.now() + 30_000);
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      await screen.findByText(t('workout.log', { number: 2 }));
      const workout = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'workout');
      expect(mockPause?.workout).toBe(workout?.kind === 'workout' ? workout.body.clientId : 'none');
      expect(mockPause?.pause.pausedAt).toBeNull();
      expect(mockPause?.pause.pausedMs).toBeGreaterThanOrEqual(30_000);
      expect(mockPause?.pause.pausedMs).toBeLessThan(35_000);
    } finally {
      jest.useRealTimers();
    }
  });

  test('resumed, a rest the pause ended does not come back, nor its alert', async () => {
    open(5);
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByTestId('rest');
    expect(mockServices.restAlert.start).toHaveBeenCalledTimes(1);
    await pause();
    await resume();
    expect(screen.queryByTestId('rest')).toBeNull();
    expect(mockServices.restAlert.start).toHaveBeenCalledTimes(1);
  });

  test('paused while the set is being kept: no rest starts inside the pause', async () => {
    open(5);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockRecord.mockImplementationOnce(async (outbound: Outbound) => {
      await gate;
      return keep(outbound);
    });
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await pause();
    await act(async () => release());
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(screen.queryByTestId('rest')).toBeNull();
    expect(mockServices.restAlert.start).not.toHaveBeenCalled();
    expect(screen.getByText(t('workout.paused'))).toBeOnTheScreen();
  });

  test('a warm-up logged while paused: the session goes on', async () => {
    open(5);
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await pause();
    await fireEvent.press(screen.getByText('Log warm-up 1'));
    await screen.findByText('Log warm-up 2');
    expect(screen.queryByText(t('workout.paused'))).toBeNull();
  });

  test('one Resume, the header\'s, a full touch target; the paused line only says so', async () => {
    open(5);
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.getByRole('button', { name: t('workout.pauseLabel') })).toHaveStyle({ minHeight: tokens.size.touch });
    await pause();
    expect(within(screen.getByTestId('rest-slot')).queryByRole('button')).toBeNull();
    expect(screen.getAllByRole('button', { name: t('workout.resumeLabel') })).toHaveLength(1);
  });

  test('pausing and resuming are said (K-815), and the time says it is paused', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    try {
      open(5);
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await pause();
      expect(said).toHaveBeenLastCalledWith(t('workout.paused'));
      const time = screen.getByTestId('session-clock').props.children as string;
      expect(screen.getByLabelText(t('workout.clock.pausedLabel', { time }))).toBeOnTheScreen();
      await resume();
      expect(said).toHaveBeenLastCalledWith(t('workout.resumed'));
    } finally {
      said.mockRestore();
    }
  });

  test('resumed, the time goes on from where it stood: it never steps back to a tick before', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    try {
      open(5);
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await pause();
      const stopped = clockSeconds();
      jest.setSystemTime(Date.now() + 60_000); // no tick in between
      await resume();
      await act(async () => jest.advanceTimersByTime(0));
      expect(clockSeconds()).toBe(stopped);
    } finally {
      jest.useRealTimers();
    }
  });

  test('back in front after a while, the time is the real one at once', async () => {
    const listen = jest.spyOn(AppState, 'addEventListener');
    jest.useFakeTimers({ advanceTimers: true });
    try {
      open(5);
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      const before = clockSeconds();
      jest.setSystemTime(Date.now() + 10 * 60_000); // the app was away: no tick
      const onChange = listen.mock.calls.map(([, handler]) => handler).at(-1);
      await act(async () => onChange?.('active'));
      expect(clockSeconds() - before).toBeGreaterThanOrEqual(600);
      expect(clockSeconds() - before).toBeLessThan(605);
    } finally {
      jest.useRealTimers();
      // Not restored: AppState's listener is jest-expo's mock, and restoring it would leave it returning nothing.
    }
  });
});

describe('Skip set and Skip move (K-972, ADR-075 #5): nothing is sent, no catch-up, and both can be undone', () => {
  const rowName = t('exercises.one_arm_dumbbell_row.name');
  const skipSet = () => fireEvent.press(within(screen.getByTestId('dock')).getByRole('button', { name: t('workout.skipSetLabel') }));
  const dot = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}, `) });
  const skipMove = (name: string) =>
    fireEvent.press(within(screen.getByTestId('move-head')).getByRole('button', { name: t('workout.skipMoveLabel', { name }) }));

  test('a set skipped is a grey Skipped row, never a set; the next set is under way, with no rest', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await skipSet();
    expect(screen.getByLabelText(t('workout.skippedSet', { number: '1' }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
    expect(sets()).toEqual([]);
    expect(screen.queryByTestId('rest')).toBeNull();
    expect(screen.getByText(t('workout.setSkipped'))).toBeOnTheScreen();
  });

  test('undone, the skipped set is the one under way again', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await skipSet();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    expect(screen.getByText(t('workout.log', { number: 1 }))).toBeOnTheScreen();
    expect(screen.queryByLabelText(t('workout.skippedSet', { number: '1' }))).toBeNull();
  });

  test("the move's last set skipped: no rest, Next names the next move (C4)", async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 2 })));
    await screen.findByText(t('workout.log', { number: 3 }));
    await skipSet();
    expect(await screen.findByRole('button', { name: t('workout.next', { name: rowName }) })).toBeOnTheScreen();
    expect(screen.queryByTestId('rest')).toBeNull();
  });

  test('a move skipped: its dot says so, the next move comes up, nothing is sent; undone, it is back', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await skipMove('Bench press');
    expect(screen.getByLabelText(t('workout.dot', { name: 'Bench press', status: t('workout.statusSkipped') }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.logSide', { number: 1, side: t('workout.sideName.LEFT') }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.moveSkipped'))).toBeOnTheScreen();
    expect(sets()).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    expect(screen.getByLabelText(t('workout.dot', { name: 'Bench press', status: t('workout.sets', { count: 3 }) }))).toBeOnTheScreen();
  });

  test('Skip set is in the dock under Log set; Skip move with the move, far from it', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(within(screen.getByTestId('dock')).getByRole('button', { name: t('workout.skipSetLabel') })).toBeOnTheScreen();
    expect(within(screen.getByTestId('dock')).queryByRole('button', { name: t('workout.skipMoveLabel', { name: 'Bench press' }) })).toBeNull();
    expect(within(screen.getByTestId('move-head')).getByRole('button', { name: t('workout.skipMoveLabel', { name: 'Bench press' }) })).toBeOnTheScreen();
  });

  test('a move outside the plan has no set to skip: there is no count', async () => {
    const LAT = { id: 'lat_pulldown', nameKey: 'exercises.lat_pulldown.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, LAT] } };
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'lat');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.pick', { name: t('exercises.lat_pulldown.name') }) }));
    expect(within(screen.getByTestId('dock')).queryByRole('button', { name: t('workout.skipSetLabel') })).toBeNull();
  });

  test('in a superset a set skipped brings up the partner, as a set logged does', async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('superset.link') }));
    await fireEvent.press(screen.getByRole('button', { name: t('superset.pick', { name: rowName }) }));
    await skipSet();
    expect(await screen.findByText(t('workout.logSide', { number: 1, side: t('workout.sideName.LEFT') }))).toBeOnTheScreen();
  });

  test('a one-sided set skipped skips both its sides; its warm-up stays to do', async () => {
    mockRecords = [
      ...lastWeek(),
      record('set', 's9', { clientId: 's9', exerciseId: 'one_arm_dumbbell_row', setType: 'WORKING', loadKg: 20, reps: 10, side: 'LEFT' }, 'w0'),
      record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' }),
    ];
    await show();
    await pickMove(rowName);
    await skipSet();
    expect(screen.getByLabelText(t('workout.skippedSet', { number: `1${t('workout.side.LEFT')}` }))).toBeOnTheScreen();
    expect(screen.getByLabelText(t('workout.skippedSet', { number: `1${t('workout.side.RIGHT')}` }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.logSide', { number: 2, side: t('workout.sideName.LEFT') }))).toBeOnTheScreen();
    expect(screen.getByText('Log warm-up 1')).toBeOnTheScreen();
  });

  test('after a skip the next set is logged as it is: its own number, the suggestion', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await skipSet();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 2 })));
    expect(sets()).toEqual([
      { kind: 'set', workoutClientId: 'w1', body: { clientId: expect.any(String), exerciseId: 'bench_press', setType: 'WORKING', loadKg: 62.5, reps: 6, rir: 1, side: 'BOTH' } },
    ]);
  });

  test('a skip is said (K-815); its Undo is a full touch target', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    try {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await skipSet();
      expect(said).toHaveBeenLastCalledWith(t('workout.setSkipped'));
      expect(screen.getByRole('button', { name: t('workout.undoLabel') })).toHaveStyle({ minHeight: tokens.size.touch });
    } finally {
      said.mockRestore();
    }
  });

  test('a move skipped and undone: back on that move', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await skipMove('Bench press');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    expect(dot('Bench press')).toBeSelected();
    expect(screen.getByText(t('workout.log', { number: 1 }))).toBeOnTheScreen();
  });

  test('a skipped move opened says so, and can be brought back', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await skipMove('Bench press');
    await fireEvent.press(dot('Bench press'));
    expect(screen.getByText(t('workout.moveIsSkipped'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.bringBack') }));
    expect(screen.getByText(t('workout.log', { number: 1 }))).toBeOnTheScreen();
  });

  test('skipped before the first set: the workout that set starts keeps the skip', async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await skipSet();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 2 })));
    await screen.findByText(t('workout.log', { number: 3 }));
    const workout = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'workout');
    expect(mockSkips).toEqual({ workout: workout?.kind === 'workout' ? workout.body.clientId : 'none', skips: { bench_press: { sets: [{ side: 'BOTH', set: 0 }], move: false } } });
  });

  test("another workout's skips are not this one's", async () => {
    mockSkips = { workout: 'w0', skips: { bench_press: { sets: [{ side: 'BOTH', set: 0 }], move: false } } };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.queryByLabelText(t('workout.skippedSet', { number: '1' }))).toBeNull();
  });

  test('finished, its skips are forgotten', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    await skipSet();
    await endAndFinish();
    await fireEvent.press(screen.getByText('Finish'));
    expect(mockServices.sessionSkips.forget).toHaveBeenCalled();
  });

  test('kept with the workout: opened again, what was skipped still is', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await skipSet();
    expect(mockSkips).toEqual({ workout: 'w1', skips: { bench_press: { sets: [{ side: 'BOTH', set: 0 }], move: false } } });
    await screen.unmount();
    await show();
    expect(await screen.findByLabelText(t('workout.skippedSet', { number: '1' }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
  });
});

describe('a set done, corrected or deleted in the session (K-972, ADR-075 #5)', () => {
  const editSet = (number: number, set: string, left = '1') =>
    fireEvent.press(screen.getByRole('button', { name: t('workout.doneSet', { number: String(number), set, left }) }));
  const inEditor = () => within(screen.getByTestId('edit-set'));
  const threeDone = () => {
    mockRecords = [
      ...lastWeek(),
      record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' }),
      ...[8, 7, 6].map((reps, i) =>
        record('set', `b${i + 1}`, { clientId: `b${i + 1}`, exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps, rir: 1, side: 'BOTH' }, 'w1'),
      ),
    ];
  };

  test('the second of three corrected: the same set, in its place, its new reps; nothing sent', async () => {
    threeDone();
    await show();
    await pickMove('Bench press');
    await editSet(2, '60 kg × 7');
    expect(inEditor().getByRole('header')).toBeOnTheScreen();
    await fireEvent.press(inEditor().getByRole('button', { name: t('workout.stepper.moreReps') }));
    await fireEvent.press(inEditor().getByRole('button', { name: t('workout.edit.done') }));
    expect(mockServices.workoutEdits.change).toHaveBeenCalledWith('b2', expect.objectContaining({ clientId: 'b2', reps: 8, loadKg: 60 }));
    expect(await screen.findByLabelText(t('workout.doneSet', { number: '2', set: '60 kg × 8', left: '1' }))).toBeOnTheScreen();
    expect(screen.getByLabelText(t('workout.doneSet', { number: '3', set: '60 kg × 6', left: '1' }))).toBeOnTheScreen();
    expect(sets()).toEqual([]);
  });

  test('deleted: said, gone, and Undo brings it back in its place', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    try {
      threeDone();
      await show();
      await pickMove('Bench press');
      await editSet(2, '60 kg × 7');
      await fireEvent.press(inEditor().getByRole('button', { name: t('workout.edit.delete') }));
      expect(await screen.findByText(t('workout.setDeleted'))).toBeOnTheScreen();
      expect(said).toHaveBeenCalledWith(t('workout.setDeleted'));
      expect(screen.getByLabelText(t('workout.doneSet', { number: '2', set: '60 kg × 6', left: '1' }))).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
      expect(await screen.findByLabelText(t('workout.doneSet', { number: '2', set: '60 kg × 7', left: '1' }))).toBeOnTheScreen();
    } finally {
      said.mockRestore();
    }
  });

  test('an Undo that fails is said, and offered again', async () => {
    threeDone();
    await show();
    await pickMove('Bench press');
    await editSet(1, '60 kg × 8');
    await fireEvent.press(inEditor().getByRole('button', { name: t('workout.edit.delete') }));
    await screen.findByText(t('workout.setDeleted'));
    mockEditFails = Object.assign(new Error('disk'), { name: 'StoreFailed' });
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    expect(await screen.findByText(t('workout.undoFailed'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('workout.undoLabel') })).toBeOnTheScreen();
  });

  test('offline: a connection is needed, nothing is forgotten here', async () => {
    threeDone();
    mockEditFails = new TypeError('Network request failed');
    await show();
    await pickMove('Bench press');
    await editSet(1, '60 kg × 8');
    await fireEvent.press(inEditor().getByRole('button', { name: t('workout.edit.delete') }));
    expect(await screen.findByText(t('workout.edit.offline'))).toBeOnTheScreen();
    expect(mockRecords.filter((r) => r.kind === 'set' && r.parentClientId === 'w1')).toHaveLength(3);
  });

  test('a change that fails otherwise (the server refused, the store failed) says so; the set stays', async () => {
    threeDone();
    mockEditFails = Object.assign(new Error('HTTP_500'), { name: 'DeleteRefused' });
    await show();
    await pickMove('Bench press');
    await editSet(1, '60 kg × 8');
    await fireEvent.press(inEditor().getByRole('button', { name: t('workout.stepper.lessReps') }));
    await fireEvent.press(inEditor().getByRole('button', { name: t('workout.edit.done') }));
    expect(await screen.findByText(t('workout.edit.failed'))).toBeOnTheScreen();
    expect(screen.getByLabelText(t('workout.doneSet', { number: '1', set: '60 kg × 8', left: '1' }))).toBeOnTheScreen();
  });

  test("the editor is its own move's: another move's dot closes it, and nothing is saved with that move's load", async () => {
    threeDone();
    await show();
    await pickMove('Bench press');
    await editSet(1, '60 kg × 8');
    await pickMove(t('exercises.one_arm_dumbbell_row.name'));
    expect(screen.queryByTestId('edit-set')).toBeNull();
    await pickMove('Bench press');
    expect(screen.queryByTestId('edit-set')).toBeNull();
    expect(mockServices.workoutEdits.change).not.toHaveBeenCalled();
  });

  test('a set logged meanwhile closes the editor, the set being corrected left as it was', async () => {
    threeDone();
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [{ ...DAY, exercises: [{ ...DAY.exercises[0], sets: 4 }, DAY.exercises[1]] }] } } };
    await show();
    await screen.findByText(t('workout.log', { number: 4 }));
    await editSet(1, '60 kg × 8');
    expect(screen.getByTestId('edit-set')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 4 })));
    await screen.findByRole('button', { name: t('workout.next', { name: t('exercises.one_arm_dumbbell_row.name') }) });
    expect(screen.queryByTestId('edit-set')).toBeNull();
  });

  test('a one-sided set is corrected on its side', async () => {
    mockRecords = [
      ...lastWeek(),
      record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' }),
      record('set', 'r1', { clientId: 'r1', exerciseId: 'one_arm_dumbbell_row', setType: 'WORKING', loadKg: 20, reps: 10, rir: 1, side: 'LEFT' }, 'w1'),
    ];
    await show();
    await pickMove(t('exercises.one_arm_dumbbell_row.name'));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.doneSet', { number: `1${t('workout.side.LEFT')}`, set: '20 kg × 10', left: '1' }) }));
    await fireEvent.press(inEditor().getByRole('button', { name: t('workout.stepper.lessReps') }));
    await fireEvent.press(inEditor().getByRole('button', { name: t('workout.edit.done') }));
    expect(mockServices.workoutEdits.change).toHaveBeenCalledWith('r1', expect.objectContaining({ side: 'LEFT', reps: 9 }));
  });

  test('closed without a change: nothing changes', async () => {
    threeDone();
    await show();
    await pickMove('Bench press');
    await editSet(1, '60 kg × 8');
    await fireEvent.press(inEditor().getByRole('button', { name: t('workout.edit.done') }));
    expect(screen.queryByTestId('edit-set')).toBeNull();
    expect(mockServices.workoutEdits.change).not.toHaveBeenCalled();
  });
});

describe('End: finish and save, fill in the rest later, or discard (K-972, ADR-075 #5, K-998)', () => {
  const end = async () => fireEvent.press(await screen.findByRole('button', { name: t('workout.endLabel') }));
  const choose = (key: string) => fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t(key)}`) }));
  const started = (minutes: number) => {
    const startedAt = new Date(Date.now() - minutes * 60_000).toISOString();
    mockRecords = [
      ...lastWeek(),
      record('workout', 'w2', { clientId: 'w2', startedAt, programDayId: 'day-a' }),
      record('set', 'b1', { clientId: 'b1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps: 8, rir: 1, side: 'BOTH' }, 'w2'),
    ];
    return Date.parse(startedAt);
  };

  test('End offers the three, each saying what it does', async () => {
    started(20);
    await show();
    await end();
    expect(screen.getByText(t('workout.ending.title'))).toBeOnTheScreen();
    for (const key of ['workout.ending.finishNote', 'workout.ending.laterNote', 'workout.ending.discardNote']) expect(screen.getByText(t(key))).toBeOnTheScreen();
    await choose('workout.ending.back');
    expect(screen.getByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
  });

  test('fill in the rest later: nothing is finished, the session is left open and counts; it says so', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    try {
      started(20);
      await show();
      await end();
      await choose('workout.ending.later');
      expect(mockRecord.mock.calls.map(([o]) => o.kind)).not.toContain('finish');
      expect(mockServices.workoutEdits.discard).not.toHaveBeenCalled();
      expect(mockBack).toHaveBeenCalled();
      const laterSaid = t('workout.ending.laterSaid', { hours: workoutParams.unfinishedSessionCloseHours });
      expect(said).toHaveBeenLastCalledWith(laterSaid);
      // The server closes it after unfinished_session_close_hours, not at the end of the week.
      expect(laterSaid).toContain(String(workoutParams.unfinishedSessionCloseHours));
      expect(laterSaid).not.toMatch(/this week/i);
    } finally {
      said.mockRestore();
    }
  });

  test('discard asks once more; kept, nothing changes', async () => {
    started(20);
    await show();
    await end();
    await choose('workout.ending.discard');
    expect(screen.getByRole('button', { name: t('workout.ending.confirm') })).toBeOnTheScreen();
    await choose('workout.ending.keep');
    expect(mockServices.workoutEdits.discard).not.toHaveBeenCalled();
  });

  test('discarded on the phone: the workout and its sets are gone, nothing sent; Undo brings it all back', async () => {
    started(20);
    mockRecords = mockRecords.map((r) => (r.clientId === 'w2' || r.clientId === 'b1' ? { ...r, state: 'PENDING' } : r));
    await show();
    await end();
    await choose('workout.ending.discard');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
    expect(await screen.findByText(t('workout.ending.discarded'))).toBeOnTheScreen();
    expect(mockServices.workoutEdits.discard).toHaveBeenCalledWith('w2');
    expect(mockRecords.filter((r) => r.clientId === 'w2' || r.parentClientId === 'w2')).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
    const back = mockRecord.mock.calls.map(([o]) => o);
    expect(back.map((o) => o.kind)).toEqual(['workout', 'set']);
    expect(back[1]).toMatchObject({ body: { exerciseId: 'bench_press', loadKg: 60, reps: 8, rir: 1 } });
  });

  test('discarded once the server has it: deleted there too; Close leaves', async () => {
    started(20);
    mockRecords = mockRecords.map((r) => (r.clientId === 'w2' ? { ...r, serverId: 'srv-w2' } : r));
    await show();
    await end();
    await choose('workout.ending.discard');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
    expect(await screen.findByText(t('workout.ending.discarded'))).toBeOnTheScreen();
    expect(mockServices.workoutEdits.discard).toHaveBeenCalledWith('w2');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.close') }));
    expect(mockBack).toHaveBeenCalled();
  });

  test('discarded offline once the server has it: it says a connection is needed and keeps the workout', async () => {
    started(20);
    mockRecords = mockRecords.map((r) => (r.clientId === 'w2' ? { ...r, serverId: 'srv-w2' } : r));
    mockEditFails = new TypeError('Network request failed');
    await show();
    await end();
    await choose('workout.ending.discard');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
    expect(await screen.findByText(t('workout.ending.offline'))).toBeOnTheScreen();
    expect(mockRecords.some((r) => r.clientId === 'w2')).toBe(true);
  });

  test('finished after a pause: the time paused goes with it, and Apple Health gets the active time', async () => {
    const startedAt = started(30);
    mockPause = { workout: 'w2', pause: { pausedAt: null, pausedMs: 10 * 60_000 } };
    await show();
    await endAndFinish();
    await fireEvent.press(await screen.findByText('Finish'));
    const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
    expect(finish?.kind === 'finish' && finish.body.pausedSeconds).toBe(600);
    const [workout] = mockServices.healthWriting.workoutFinished.mock.calls[0] as unknown as [{ start: Date; end: Date }];
    expect(workout.start.getTime()).toBe(startedAt);
    const active = workout.end.getTime() - workout.start.getTime();
    expect(active).toBeGreaterThanOrEqual(20 * 60_000);
    expect(active).toBeLessThan(21 * 60_000);
  });

  test('a pause longer than the session itself (a clock set back, a stale copy): never more than its length, and no zero-length workout to Health', async () => {
    const startedAt = started(20);
    mockPause = { workout: 'w2', pause: { pausedAt: null, pausedMs: 60 * 60_000 } };
    await show();
    await endAndFinish();
    await fireEvent.press(await screen.findByText('Finish'));
    const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
    const length = Date.now() - startedAt;
    const sent = finish?.kind === 'finish' ? (finish.body.pausedSeconds ?? -1) : -1;
    expect(sent).toBeGreaterThan(20 * 60 - 10);
    expect(sent).toBeLessThanOrEqual(Math.ceil(length / 1000));
    expect(mockServices.healthWriting.workoutFinished).not.toHaveBeenCalled();
  });

  describe('Fill in the rest later pauses the clock (K-972 review): the time away is not training time', () => {
    const HOURS = 60 * 60_000;
    test('left, it begins a pause kept with its workout', async () => {
      started(20);
      await show();
      await end();
      await choose('workout.ending.later');
      expect(mockPause?.workout).toBe('w2');
      expect(typeof mockPause?.pause.pausedAt).toBe('number');
      expect(Math.abs((mockPause?.pause.pausedAt ?? 0) - Date.now())).toBeLessThan(5_000);
    });

    test('opened again hours later it is paused, and Finish counts only the time before it was left', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      try {
        const startedAt = started(20);
        await show();
        await end();
        await choose('workout.ending.later');
        const left = mockPause?.pause.pausedAt ?? 0;
        await screen.unmount();
        jest.setSystemTime(left + 3.5 * HOURS);
        await show();
        // Paused as it was left: Resume is offered.
        expect(await screen.findByRole('button', { name: t('workout.resumeLabel') })).toBeOnTheScreen();
        await endAndFinish();
        await fireEvent.press(await screen.findByText('Finish'));
        const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
        const sent = finish?.kind === 'finish' ? (finish.body.pausedSeconds ?? 0) : 0;
        expect(sent).toBeGreaterThanOrEqual(3.5 * 3600);
        expect(sent).toBeLessThan(3.5 * 3600 + 10);
        // Health gets the 20 minutes, not the 3 hours 50.
        const [workout] = mockServices.healthWriting.workoutFinished.mock.calls[0] as unknown as [{ start: Date; end: Date }];
        expect(workout.start.getTime()).toBe(startedAt);
        expect(workout.end.getTime() - workout.start.getTime()).toBeLessThan(21 * 60_000);
      } finally {
        jest.useRealTimers();
      }
    });

    test('opened again, a set logged goes on from that tap', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      try {
        started(20);
        await show();
        await end();
        await choose('workout.ending.later');
        const left = mockPause?.pause.pausedAt ?? 0;
        await screen.unmount();
        jest.setSystemTime(left + 3 * HOURS);
        await show();
        await fireEvent.press(await screen.findByText(t('workout.log', { number: 2 })));
        expect(mockPause?.pause.pausedAt).toBeNull();
        expect(mockPause?.pause.pausedMs).toBeGreaterThanOrEqual(3 * HOURS);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('a workout left open past the time the server keeps one (K-961): the server closed it', () => {
    const stale = () => {
      const startedAt = new Date(Date.now() - (workoutParams.unfinishedSessionCloseHours * 60 + 5) * 60_000).toISOString();
      mockRecords = [
        ...lastWeek(),
        record('workout', 'w2', { clientId: 'w2', startedAt, programDayId: 'day-a' }),
        record('set', 'b1', { clientId: 'b1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps: 8, rir: 1, side: 'BOTH' }, 'w2'),
      ];
    };

    test('opened on a day, it does not hold the screen: a new workout starts for that day', async () => {
      stale();
      mockParams = { day: 'day-a' };
      await show();
      await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
      const began = mockRecord.mock.calls.map(([o]) => o).filter((o) => o.kind === 'workout');
      expect(began).toHaveLength(1);
      expect(sets()[0].workoutClientId).toBe(began[0].kind === 'workout' ? began[0].body.clientId : '');
      expect(sets()[0].workoutClientId).not.toBe('w2');
    });

    test('opened to continue it (no day), End offers Finish and Discard only: nothing is left to fill in later', async () => {
      stale();
      await show();
      await end();
      expect(screen.getByRole('button', { name: new RegExp(`^${t('workout.ending.finish')}`) })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: new RegExp(`^${t('workout.ending.discard')}`) })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: new RegExp(`^${t('workout.ending.later')}`) })).toBeNull();
    });
  });

  describe('Discard, its question and what it leaves (K-972 review)', () => {
    const discardNow = async () => {
      await end();
      await choose('workout.ending.discard');
      await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
    };

    test('it asks the question in words, then the two answers', async () => {
      started(20);
      await show();
      await end();
      await choose('workout.ending.discard');
      expect(screen.getByText(t('workout.ending.discardAsk'))).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: t('workout.ending.confirm') })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: t('workout.ending.keep') })).toBeOnTheScreen();
    });

    test('Discard, Keep it and Close are full touch targets (44 pt), not the small button', async () => {
      started(20);
      await show();
      await end();
      await choose('workout.ending.discard');
      // The medium button: a vertical padding that, with its text, is past 44 pt; the small one is about 34.
      for (const name of [t('workout.ending.confirm'), t('workout.ending.keep')]) {
        expect(screen.getByRole('button', { name })).toHaveStyle({ paddingVertical: tokens.space.md });
      }
      await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
      await screen.findByText(t('workout.ending.discarded'));
      expect(screen.getByRole('button', { name: t('workout.ending.close') })).toHaveStyle({ paddingVertical: tokens.space.md });
    });

    test("discarded, it is said for VoiceOver, and the clock's Pause is not live on the Undo screen", async () => {
      const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      try {
        started(20);
        await show();
        await discardNow();
        await screen.findByText(t('workout.ending.discarded'));
        expect(said).toHaveBeenLastCalledWith(t('workout.ending.discarded'));
        expect(screen.queryByRole('button', { name: t('workout.pauseLabel') })).toBeNull();
        expect(screen.queryByRole('button', { name: t('workout.resumeLabel') })).toBeNull();
      } finally {
        said.mockRestore();
      }
    });

    test('offline with a workout that may be on the server: it says may, not sent', async () => {
      started(20);
      mockEditFails = new TypeError('Network request failed');
      await show();
      await discardNow();
      expect(await screen.findByText(t('workout.ending.offline'))).toBeOnTheScreen();
      expect(t('workout.ending.offline')).toMatch(/may already be/);
      expect(t('workout.ending.offline')).not.toMatch(/already sent/);
    });

    test('Undo that fails half way says so, and trying again brings back one workout, not two', async () => {
      started(20);
      mockRecords = [
        ...mockRecords,
        record('set', 'b2', { clientId: 'b2', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps: 7, rir: 1, side: 'BOTH' }, 'w2'),
      ];
      await show();
      await discardNow();
      await screen.findByText(t('workout.ending.discarded'));
      // The second set cannot be kept, once.
      let calls = 0;
      mockRecord.mockImplementation(async (outbound: Outbound) => {
        calls += 1;
        if (calls === 3) throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
        return keep(outbound);
      });
      await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
      expect(await screen.findByText(t('workout.undoFailed'))).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
      await screen.findByText(t('workout.log', { number: 3 }));
      const workouts = mockRecords.filter((r) => r.kind === 'workout' && r.clientId !== 'w0' && r.clientId !== 'w1');
      expect(workouts).toHaveLength(1);
      const mine = mockRecords.filter((r) => r.kind === 'set' && r.parentClientId === workouts[0].clientId);
      expect(mine.map((r) => (r.body as { reps: number }).reps)).toEqual([8, 7]);
    });
  });
});

describe('a workout discarded and brought back, on the real record store and queue (K-972 review)', () => {
  const original = { workoutEdits: mockServices.workoutEdits };
  afterEach(() => {
    Object.assign(mockServices, original);
  });

  async function real({ reachable = true }: { reachable?: boolean } = {}) {
    const store = await openRecordStore(nodeSqlite());
    const deleted: string[] = [];
    const queue = createSyncQueue({
      store,
      send: async (outbound) => {
        if (!reachable) throw new NoAnswer('offline');
        const id = `srv-${recordClientId(outbound)}`;
        return { status: 201, id, body: { id } };
      },
      report: () => undefined,
    });
    let n = 0;
    const edits = createSetEdits({
      store,
      queue,
      deleteOnServer: async () => undefined,
      deleteWorkoutOnServer: async (id) => {
        deleted.push(id);
      },
      newClientId: () => `edit-${++n}`,
    });
    mockRecord.mockImplementation((outbound: Outbound) => queue.record(outbound));
    mockWorkoutRecords.mockImplementation(() => store.all());
    Object.assign(mockServices, { workoutEdits: edits });
    // A workout 20 minutes in, two sets done, as the screen would have kept them.
    await queue.record({ kind: 'workout', body: { clientId: 'w2', startedAt: new Date(Date.now() - 20 * 60_000).toISOString(), programDayId: 'day-a' } });
    for (const [id, reps] of [['b1', 8], ['b2', 7]] as const) {
      await queue.record({ kind: 'set', workoutClientId: 'w2', body: { clientId: id, exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps, rir: 1, side: 'BOTH' } });
    }
    await queue.drain();
    return { store, deleted, queue };
  }
  const discardIt = async () => {
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.endLabel') }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t('workout.ending.discard')}`) }));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
  };
  const workoutsOf = async (store: Awaited<ReturnType<typeof openRecordStore>>) => (await store.all()).filter((r) => r.kind === 'workout');
  const repsOf = async (store: Awaited<ReturnType<typeof openRecordStore>>) =>
    (await store.all()).filter((r) => r.kind === 'set').map((r) => (r.body as { reps: number }).reps);

  test('discarded, it is deleted on the server and gone here; Undo brings back one workout with both sets', async () => {
    const { store, deleted } = await real();
    await show();
    await discardIt();
    await screen.findByText(t('workout.ending.discarded'));
    expect(deleted).toEqual(['srv-w2']);
    expect(await store.all()).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    await screen.findByText(t('workout.log', { number: 3 }));
    expect((await workoutsOf(store)).map((r) => r.clientId)).not.toContain('w2');
    expect(await workoutsOf(store)).toHaveLength(1);
    expect(await repsOf(store)).toEqual([8, 7]);
  });

  test('Undo that fails on the second set, tried again: one workout and two sets, never a second workout', async () => {
    const { store, queue } = await real();
    await show();
    await discardIt();
    await screen.findByText(t('workout.ending.discarded'));
    let calls = 0;
    mockRecord.mockImplementation(async (outbound: Outbound) => {
      calls += 1;
      if (calls === 3) throw Object.assign(new Error('disk'), { name: 'StoreFailed' });
      return queue.record(outbound);
    });
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    expect(await screen.findByText(t('workout.undoFailed'))).toBeOnTheScreen();
    expect(await workoutsOf(store)).toHaveLength(1); // the workout and its first set are kept
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    await screen.findByText(t('workout.log', { number: 3 }));
    expect(await workoutsOf(store)).toHaveLength(1);
    expect(await repsOf(store)).toEqual([8, 7]);
  });

  test('recorded while the server could not be reached: Discard says it may be there, and nothing is lost', async () => {
    const { store, deleted } = await real({ reachable: false });
    await show();
    await discardIt();
    expect(await screen.findByText(t('workout.ending.offline'))).toBeOnTheScreen();
    expect(deleted).toEqual([]);
    expect((await workoutsOf(store)).map((r) => r.clientId)).toEqual(['w2']);
    expect(await repsOf(store)).toEqual([8, 7]);
  });
});
