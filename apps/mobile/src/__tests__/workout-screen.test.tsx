/**
 * The session (K-405, prototype 2.4, B §6.5): the day's moves, the move under way with its rows — the server's next
 * target faint, last time beside it — and one tap logs the set as suggested, with the RIR picked (0, 1, 2+). A rest
 * timer after each set (G1 K-49: 2-3 min). Finishing asks whether each move's form was clean (G6 K-31). Everything goes
 * through the phone's queue (K-304), so it all works offline.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, Keyboard, ScrollView, StyleSheet } from 'react-native';

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
import { formatLoad } from '@/units/units';

import { haptics } from '@/train/haptics';
import { nodeSqlite } from './support/nodeSqlite';
import { WithSaved } from './support/saved';
import { answerAlert } from './support/systemChoices';

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
let mockSwaps: { workout: string; swaps: Record<string, string> } | null = null;
let mockLeft: { workout: string; left: string[] } | null = null;
// The planned moves put behind and the moves found taken, kept beside the swaps (Taken, ADR-090 Ek 2).
let mockMore: { workout: string; behind: string[]; taken: string[] } | null = null;
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
    // A record taken back while it was never sent (K-973: the cardio), as setEdits does it.
    forgetUnsent: jest.fn(async (clientId: string) => {
      const found = mockRecords.find((r) => r.clientId === clientId);
      if (found === undefined || found.state !== 'PENDING' || found.attempted === true) return false;
      mockRecords = mockRecords.filter((r) => r.clientId !== clientId);
      return true;
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
  // The moves swapped in the open session, kept with its workout (K-972).
  sessionSwaps: {
    read: jest.fn(async (workout: string) => (mockSwaps?.workout === workout ? mockSwaps.swaps : {})),
    // The moves swapped away from, kept beside the swaps (K-973).
    readLeft: jest.fn(async (workout: string) => (mockLeft?.workout === workout ? mockLeft.left : [])),
    readBehind: jest.fn(async (workout: string) => (mockMore?.workout === workout ? mockMore.behind : [])),
    readTaken: jest.fn(async (workout: string) => (mockMore?.workout === workout ? mockMore.taken : [])),
    keep: jest.fn(async (workout: string, swaps: Record<string, string>, left: string[] = [], more: { behind?: string[]; taken?: string[] } = {}) => {
      mockSwaps = { workout, swaps };
      mockLeft = { workout, left };
      mockMore = { workout, behind: more.behind ?? [], taken: more.taken ?? [] };
    }),
    forget: jest.fn(async () => {
      mockSwaps = null;
      mockLeft = null;
      mockMore = null;
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
  mockSwaps = null;
  mockMore = null;
  mockLeft = null;
  mockEditFails = null;
  mockDelete = async () => ({ response: new Response(null, { status: 204 }) });
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: EXERCISES }, kept: false };
  mockOwn = [];
  mockRecords = [...lastWeek(), record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' })];
}
beforeEach(reset);
// Finishing early with moves left asks once with the system alert (Evre 7 C2); the tests that finish answer it with Finish unless they test the question.
beforeEach(() => {
  answerAlert('confirm');
});

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

/** The move's More menu (ADR-070 Ek 2 #1, K-1047): the rarer actions of the move (Superset, Skip move) are rows in it. */
const openMore = async () => fireEvent.press(await screen.findByRole('button', { name: t('workout.more') }));
const more = async (row: string) => {
  await openMore();
  await fireEvent.press(screen.getByRole('button', { name: row }));
};
/** The shared Stepper's own words for its buttons (ADR-070 Ek 2 #5), where the screen's "Less weight" / "More reps" were. */
const stepName = (which: 'moreLoad' | 'lessLoad' | 'moreReps' | 'lessReps') =>
  t(which.startsWith('more') ? 'stepper.increase' : 'stepper.decrease', {
    label: which.endsWith('Load') ? t('workout.loadLabel', { unit: t(mockUnits === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit') }) : t('workout.repsLabel'),
  });

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
  expect(within(screen.getByTestId('rest')).getByText('2:00')).toBeTruthy(); // counts down from the band's low end
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

  // K1 (Evre 7 C, the walk of 30 Oct): "209.4 lb" over "25 + 10 + 2.5 kg a side" was two units on one card. A lb user whose gym is still the
  // kilo default reads the standard US rack, for the load as it reads in lb (140 lb: a 45 lb bar, 47.5 lb a side).
  test('in lb at a kg gym, the load and the plates are both in lb: the standard US rack', async () => {
    mockUnits = 'IMPERIAL';
    mockData = { ...mockData, exercises: { state: 'ready', value: BARBELL }, gym: GYM };
    await show();
    expect(await screen.findByText('45 + 2.5 lb a side')).toBeTruthy(); // 140 lb, the 62.5 kg under way
    expect(screen.queryByText(/kg a side/)).toBeNull();
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

  test("after a set of the added move its card stays for the sets it has, the plan's moves wait", async () => {
    await show();
    await addByName('lat', latName);
    await logTyped('50', '10', t('workout.log', { number: 1 }));
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 2 })));
    expect(sets().map((s) => s.body.exerciseId)).toEqual(['lat_pulldown', 'lat_pulldown']);
  });

  // Evre 7 (issue 684): Levent's workout of 29 Oct had 41 work sets of one added move (standing calf raise), the plan's last two moves never
  // done, no finish. A move added outside the plan had no set count ("as many as the user does"), so the card never said done, the
  // dock never offered Next or Finish, and the only way out was the grey End.
  test('an added move has the sets of an added move, like any move: after the last, no more Log set; Next names the plan\'s next move', async () => {
    await show();
    await addByName('lat', latName);
    await logTyped('50', '10', t('workout.log', { number: 1 }));
    expect(await screen.findByText(t('workout.setOf', { number: 2, count: workoutParams.addedMoveSets }))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 2 })));
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 3 })));
    expect(screen.queryByText(t('workout.log', { number: 4 }))).toBeNull();
    const next = await screen.findByRole('button', { name: /^Next: / });
    expect(sets().map((s) => s.body.exerciseId)).toEqual(['lat_pulldown', 'lat_pulldown', 'lat_pulldown']);
    await fireEvent.press(next);
    expect(await screen.findByText(t('workout.log', { number: 1 }))).toBeOnTheScreen();
    expect(screen.getAllByText('Bench press').length).toBeGreaterThan(0);
  });

  test('"One more set" gives the added move one more row, and after it the move is done again', async () => {
    await show();
    await addByName('lat', latName);
    await logTyped('50', '10', t('workout.log', { number: 1 }));
    await fireEvent.press(screen.getByText(t('workout.log', { number: 2 })));
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 3 })));
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.oneMore') }));
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 4 })));
    expect(screen.queryByText(t('workout.log', { number: 5 }))).toBeNull();
    expect(await screen.findByRole('button', { name: /^Next: / })).toBeOnTheScreen();
  });

  test('a session that already holds 41 sets of one added move (the phone of 29 Oct): the move is done, the plan goes on, Finish is there', async () => {
    mockRecords = [
      ...mockRecords,
      ...Array.from({ length: 41 }, (_, i) => record('set', `c${i}`, { clientId: `c${i}`, exerciseId: 'lat_pulldown', setType: 'WORKING', loadKg: 7.5, reps: 4 + (i % 3), rir: 1 }, 'w1')),
    ];
    await show();
    // The added move is done (its dot says so); the plan's first move is the set under way, and Finish is on the page.
    expect(await screen.findByRole('button', { name: t('workout.dot', { name: latName, status: t('workout.allDone') }) })).toBeOnTheScreen();
    expect(await screen.findByText(t('workout.log', { number: 1 }))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
  });

  test('Finish workout is on the page whenever something is logged, not only under End: visible mid-session, and it asks about form', async () => {
    await show();
    expect(screen.queryByRole('button', { name: t('workout.finish') })).toBeNull(); // nothing logged: End closes it, nothing to finish
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.finish') }));
    expect(await screen.findByText('How was your form?')).toBeOnTheScreen();
  });

  // Evre 7 C2 and C4 (interruptions): finishing with moves left asks once, with the system alert, and keeping going changes nothing.
  test('Finish with moves left asks once ("N moves left"); "Keep going" leaves the session as it was', async () => {
    const alert = answerAlert('keep');
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.finish') }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(String(alert.mock.calls[0][0])).toMatch(/moves? left/);
    expect(screen.queryByText('How was your form?')).toBeNull();
    expect(screen.getByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
    expect(sets()).toHaveLength(1);
  });

  test('Finish anyway goes on to the finish, with what was logged', async () => {
    answerAlert('confirm');
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.finish') }));
    expect(await screen.findByText('How was your form?')).toBeOnTheScreen();
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

  test("the progress counts the plan's moves only; an added move says its set and how many it has", async () => {
    await show();
    await addByName('lat', latName);
    await logTyped('50', '10', t('workout.log', { number: 1 }));
    expect(await screen.findByText(t('workout.progress', { done: 0, count: 2 }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.setOf', { number: 2, count: workoutParams.addedMoveSets }))).toBeOnTheScreen();
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
    await more(t('superset.link'));
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
    expect(screen.queryByTestId('rest')).toBeNull();
    await typeAndLog(rowSide('LEFT'));
    expect(await screen.findByText(rowSide('RIGHT'))).toBeOnTheScreen(); // both sides before the partner
    expect(screen.queryByTestId('rest')).toBeNull(); // no rest between the sides
    await typeAndLog(rowSide('RIGHT'));
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen(); // the bench again
    expect(screen.getByTestId('rest')).toBeOnTheScreen();
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
    expect(screen.queryByRole('button', { name: t('workout.more') })).toBeNull(); // and nothing else in the menu: no menu
  });

  test('picking a partner says what it is for, and can be left without linking', async () => {
    await show();
    await more(t('superset.link'));
    expect(screen.getByText(t('superset.choose'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('superset.pick', { name: 'Bench press' }) })).toBeNull(); // not with itself
    await fireEvent.press(screen.getByRole('button', { name: t('superset.close') }));
    expect(screen.queryByRole('button', { name: t('superset.pick', { name: rowName }) })).toBeNull();
    await openMore();
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
    expect(screen.queryByTestId('rest')).toBeNull(); // mid-round
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    expect(await screen.findByTestId('rest')).toBeOnTheScreen();
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
    expect(screen.getByTestId('rest')).toBeOnTheScreen();
    expect(sets().at(-1)?.body.supersetId).toBe('g1');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 3 })));
    const next = await screen.findByRole('button', { name: t('workout.next', { name: t('exercises.lateral_raise.name') }) });
    expect(screen.queryByTestId('rest')).toBeNull();
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
    expect(screen.getByTestId('rest')).toBeOnTheScreen();
  });

  test('read back with one move done only, or unlinked and a set done since: no superset, opened again too', async () => {
    mockRecords = [...mockRecords, groupSet('b1', 'bench_press', 'g1')];
    await show();
    await openMore();
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
    await openMore();
    expect(await screen.findByRole('button', { name: t('superset.link') })).toBeOnTheScreen();
    await openMore(); // closed again: the menu is no part of the set
    await fireEvent.press(screen.getByText(t('workout.log', { number: 3 })));
    expect(sets().at(-1)?.body.supersetId).toBeUndefined();
  });

  test('unlinked, the next set is no superset, with the rest; the link is offered again', async () => {
    await show();
    await link();
    await more(t('superset.unlink'));
    await openMore();
    expect(screen.getByRole('button', { name: t('superset.link') })).toBeOnTheScreen();
    await openMore();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    expect(sets().at(-1)?.body.supersetId).toBeUndefined();
    expect(screen.getByTestId('rest')).toBeOnTheScreen();
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
    await more(t('superset.link'));
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
    expect(screen.queryByTestId('rest')).toBeNull(); // and the screen's timer of the last round goes with it
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

  // K-1048 (changed from "the rest has a place of its own at the top, the same size with or without it"): that reserved ~60 pt
  // under the header on every first view, an empty band over the progress dots. The rest takes room only while it shows.
  test('the rest takes room only while it shows: no slot, no band, with none; it is there with the rest and goes with it', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.queryByTestId('rest-slot')).toBeNull();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(within(screen.getByTestId('rest-slot')).getByTestId('rest')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('rest-slot').props.style)?.minHeight).toBeUndefined();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.rest.endLabel') }));
    expect(screen.queryByTestId('rest-slot')).toBeNull();
  });

  test("the superset link is a row of the move's More menu, with the move and not over the set (K-1047)", async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.queryByRole('button', { name: t('superset.link') })).toBeNull(); // closed: one row of links
    await openMore();
    expect(within(screen.getByTestId('move-head')).getByRole('button', { name: t('superset.link') })).toBeOnTheScreen();
  });

  test('in a superset up next is the partner, not the next move of the day', async () => {
    const RAISE = { id: 'lateral_raise', nameKey: 'exercises.lateral_raise.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    const three = { ...DAY, exercises: [...DAY.exercises, { exerciseId: 'lateral_raise', baseSets: 2, sets: 2, reps: { min: 10, max: 15 }, targetRir: 1 }] };
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [three] } }, exercises: { state: 'ready', value: [...EXERCISES, RAISE] } };
    await show();
    await more(t('superset.link'));
    await fireEvent.press(screen.getByRole('button', { name: t('superset.pick', { name: t('exercises.lateral_raise.name') }) }));
    expect(within(screen.getByTestId('up-next')).getByText(t('exercises.lateral_raise.name'))).toBeOnTheScreen();
  });

  test('each dot stays a full-height touch target, and the dots share one line, never wrapped (ADR-087 #3)', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(dot('Bench press')).toHaveStyle({ minHeight: tokens.size.touch, flex: 1 });
    expect(screen.getByTestId('move-dots')).not.toHaveStyle({ flexWrap: 'wrap' });
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

  // Evre 7 C2 (Hevy's PREVIOUS): the set under way says what the same set was last time, beside the numbers to type.
  test('the set under way says its PREVIOUS: the same set last time, in the unit of the person', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    const previous = within(screen.getByTestId('previous-set'));
    expect(previous.getByText(t('workout.previous'))).toBeOnTheScreen();
    expect(previous.getByText('57.5 kg × 8')).toBeOnTheScreen();
  });

  test('a lb person reads the previous set to the nearest 5 lb (57.5 kg is 126.8 lb to the decimal, 125 lb on a rack)', async () => {
    mockUnits = 'IMPERIAL';
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(within(screen.getByTestId('previous-set')).getByText('125 lb × 8')).toBeOnTheScreen();
  });

  test('a set kept is felt once (a light tick)', async () => {
    const tick = jest.spyOn(haptics, 'setDone');
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(tick).toHaveBeenCalledTimes(1);
    tick.mockRestore();
  });

  // Evre 7 C2 (the walk: "the timer bar pushes the set card down ~55 pt, taps land on the wrong target"): the rest is the dock's first
  // line, so it comes and goes at the foot and the set card above it never moves; it counts DOWN, with 15 seconds a tap either way.
  test('the rest is in the dock above Log set, counting down from the band, 15 seconds longer or shorter a tap', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    const dock = within(screen.getByTestId('dock'));
    expect(dock.getByTestId('rest')).toBeOnTheScreen();
    expect(within(screen.getByTestId('session-scroll')).queryByTestId('rest')).toBeNull();
    const rest = within(screen.getByTestId('rest'));
    expect(rest.getByText('2:00')).toBeTruthy();
    await fireEvent.press(rest.getByRole('button', { name: t('workout.rest.moreLabel', { seconds: 15 }) }));
    expect(rest.getByText('2:15')).toBeTruthy();
    await fireEvent.press(rest.getByRole('button', { name: t('workout.rest.lessLabel', { seconds: 15 }) }));
    await fireEvent.press(rest.getByRole('button', { name: t('workout.rest.lessLabel', { seconds: 15 }) }));
    expect(rest.getByText('1:45')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain('2:00-3:00');
  });

  test('past its end the rest says so calmly and waits (no negative time, nothing blames a longer rest)', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    try {
      await show();
      await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
      await screen.findByText(t('workout.log', { number: 2 }));
      await act(async () => jest.advanceTimersByTime((workoutParams.restSecondsMin + 30) * 1000));
      const rest = within(screen.getByTestId('rest'));
      expect(rest.getByText('0:00')).toBeTruthy();
      expect(rest.getByText(t('workout.rest.over'))).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  test('the rest is outside the scrolled page and covers nothing; Log set sits in a fixed dock', async () => {
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
    const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

    test('without a gym, a step is the smallest pair of plates either way; the reps one at a time', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await press(stepName('moreLoad'));
      expect(load().props.value).toBe('65');
      await press(stepName('lessLoad'));
      await press(stepName('lessLoad'));
      expect(load().props.value).toBe('60');
      await press(stepName('moreReps'));
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
      await press(stepName('moreLoad'));
      expect(load().props.value).toBe('110');
      await press(stepName('lessLoad'));
      expect(load().props.value).toBe('100');
      await press(stepName('lessLoad'));
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
      for (const which of ['lessLoad', 'moreLoad', 'lessReps', 'moreReps'] as const) {
        expect(within(screen.getByRole('button', { name: stepName(which) })).queryByText(/./)).toBeNull();
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
      expect(lb().props.value).toBe('225');
      await press(stepName('lessLoad'));
      expect(lb().props.value).toBe('220'); // 100 kg
      await press(stepName('lessLoad'));
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
      await press(stepName('moreLoad'));
      expect(load().props.value).toBe('13.6');
      await press(stepName('moreLoad'));
      expect(load().props.value).toBe('15.9');
      await press(stepName('lessLoad'));
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(sets()[0].body).toMatchObject({ loadKg: 13.61 });
    });

    test('reps typed past the most a set takes: less brings them down to it', async () => {
      await show();
      await fireEvent.changeText(await screen.findByLabelText(t('workout.repsLabel')), '999');
      await press(stepName('lessReps'));
      expect(reps().props.value).toBe(String(workoutParams.maxReps));
    });

    test('fewer reps stops at one', async () => {
      await show();
      await fireEvent.changeText(await screen.findByLabelText(t('workout.repsLabel')), '1');
      expect(screen.getByRole('button', { name: stepName('lessReps') })).toBeDisabled();
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
  const skipMove = (name: string) => more(t('workout.skipMoveLabel', { name }));

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
    // Skip move is a row of the move's More menu (ADR-070 Ek 2 #1), with the move and not in the dock.
    await openMore();
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
    await more(t('superset.link'));
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
    await fireEvent.press(inEditor().getByRole('button', { name: stepName('moreReps') }));
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
    await fireEvent.press(inEditor().getByRole('button', { name: stepName('lessReps') }));
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
    await fireEvent.press(inEditor().getByRole('button', { name: stepName('lessReps') }));
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

  // K1 (Evre 7 C, the walk: End had a sentence under each choice): the rows are short; what each does is said to VoiceOver (the label).
  test('End offers the three as short rows; what each does is in its spoken label, not written under it', async () => {
    started(20);
    await show();
    await end();
    expect(screen.getByText(t('workout.ending.title'))).toBeOnTheScreen();
    for (const key of ['workout.ending.finishNote', 'workout.ending.laterNote', 'workout.ending.discardNote']) expect(screen.queryByText(t(key))).toBeNull();
    expect(screen.getByRole('button', { name: `${t('workout.ending.finish')}. ${t('workout.ending.finishNote')}` })).toBeOnTheScreen();
    await choose('workout.ending.back');
    expect(screen.getByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
  });

  test('Discard this workout is the menu\'s destructive action: the warning colour as words, no fill (ADR-070 Ek 2 #1)', async () => {
    started(20);
    await show();
    await end();
    const discard = screen.getByRole('button', { name: new RegExp(`^${t('workout.ending.discard')}`) });
    expect(StyleSheet.flatten(discard.props.style).backgroundColor).toBeUndefined();
    expect(within(discard).getByText(t('workout.ending.discard'))).toHaveStyle({ color: focusPalette.warn });
    // The way out is not drawn as the destructive one, and nothing in the menu is a filled primary.
    expect(within(screen.getByRole('button', { name: t('workout.ending.back') })).getByText(t('workout.ending.back'))).not.toHaveStyle({ color: focusPalette.warn });
    await fireEvent.press(discard);
    expect(within(screen.getByRole('button', { name: t('workout.ending.confirm') })).getByText(t('workout.ending.confirm'))).toHaveStyle({ color: focusPalette.warn });
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
      // The medium button, not the small one (about 34 pt): the destructive and the secondary roles are at least size.touch tall by
      // their own minimum height (ADR-070 Ek 2 #1: the old warn is words with no box, so the padding no longer makes the height).
      const touchTall = (name: string) =>
        expect(StyleSheet.flatten(screen.getByRole('button', { name }).props.style).minHeight).toBeGreaterThanOrEqual(tokens.size.touch);
      for (const name of [t('workout.ending.confirm'), t('workout.ending.keep')]) touchTall(name);
      await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
      await screen.findByText(t('workout.ending.discarded'));
      touchTall(t('workout.ending.close'));
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

describe('a move swapped inside the session (K-972, ADR-073 #6, ADR-075 #5): this workout only, on the phone, offline', () => {
  const DUMBBELL = t('exercises.dumbbell_bench_press.name');
  const INCLINE = t('exercises.incline_dumbbell_press.name');
  const PUSH_UP = t('exercises.push_up.name');
  const ROW = t('exercises.one_arm_dumbbell_row.name');
  const CATALOG = [
    ...EXERCISES,
    { id: 'dumbbell_bench_press', load: 'EXTERNAL', unilateral: false },
    { id: 'incline_dumbbell_press', load: 'EXTERNAL', unilateral: false },
    { id: 'push_up', load: 'BODYWEIGHT', unilateral: false },
  ] as Schemas['Exercise'][];
  // The server's options for bench: the row is on the day already.
  const programWith = (benchOptions: string[]): Schemas['Program'] => ({
    ...PROGRAM,
    days: [
      {
        ...DAY,
        exercises: [
          { ...DAY.exercises[0], lighterLoadKg: 60, heavierLoadKg: 65, calibrationStepKg: 2.5, lastBestSet: { loadKg: 60, reps: 8, rir: 1 }, swapOptions: benchOptions },
          { ...DAY.exercises[1], swapOptions: [] },
        ],
      },
    ],
  });
  beforeEach(() => {
    mockData = {
      program: { state: 'ready', value: programWith(['dumbbell_bench_press', 'incline_dumbbell_press', 'one_arm_dumbbell_row', 'push_up']) },
      exercises: { state: 'ready', value: CATALOG },
      kept: false,
    };
  });
  const head = () => within(screen.getByTestId('move-head'));
  const openSwap = async (name = 'Bench press') => fireEvent.press(await screen.findByRole('button', { name: t('swap.label', { move: name }) }));
  const option = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });
  const swapTo = async (name: string, from = 'Bench press') => {
    await openSwap(from);
    await fireEvent.press(option(name));
  };

  test("a planned move has Swap with it; the sheet offers the server's options for it, not the moves the session has", async () => {
    await show();
    await openSwap();
    expect(screen.getByText(t('swap.title', { move: 'Bench press' }))).toBeOnTheScreen();
    // K1 (Evre 7 C): the two lines of explanation over the options are gone; the options are the sheet.
    expect(screen.queryByText(t('swap.why'))).toBeNull();
    expect(screen.queryByText(t('workout.swapToday'))).toBeNull();
    for (const name of [DUMBBELL, INCLINE, PUSH_UP]) expect(option(name)).toBeOnTheScreen();
    // K1 (Evre 7 C4): the sheet is over the session, whose page stays behind it; the options are looked for in the sheet.
    const sheet = within(screen.getByTestId('swap-sheet'));
    expect(sheet.queryByRole('button', { name: new RegExp(`^${ROW}`) })).toBeNull(); // on the day already
    expect(sheet.queryByRole('button', { name: /^Bench press/ })).toBeNull(); // not itself
    // Closed, the session is as it was.
    await fireEvent.press(screen.getByRole('button', { name: t('swap.close') }));
    expect(screen.getByText(t('workout.log', { number: 1 }))).toBeOnTheScreen();
  });

  // K-1047 (ADR-070 Ek 2 #1, prototype 8 › `.acts`): one row of text buttons and More, not a wrapped row of five links.
  test('the header is one row of text buttons: How to, History, Swap, Taken, and More', async () => {
    await show();
    const row = within(await screen.findByTestId('move-links'));
    const labelled = (name: string) => row.getByRole('button', { name });
    const how = labelled(t('demo.openLabel', { exercise: 'Bench press' }));
    const buttons = [how, labelled(t('history.openLabel', { exercise: 'Bench press' })), labelled(t('swap.label', { move: 'Bench press' })),
      labelled(t('taken.openLabel', { move: 'Bench press' })),
      labelled(t('workout.more')),
    ];
    expect(row.getAllByRole('button')).toHaveLength(5);
    for (const button of buttons) {
      // Text buttons: words in the accent, no fill, no outline (the Button's text role).
      expect(StyleSheet.flatten(button.props.style).backgroundColor).toBeUndefined();
      expect(StyleSheet.flatten(button.props.style).borderWidth ?? 0).toBe(0);
      expect(within(button).getByText(/./)).toHaveStyle({ color: focusPalette.accent });
    }
    for (const text of [t('demo.open'), t('history.open'), t('workout.swap'), t('taken.open'), t('workout.more')]) expect(row.getByText(text)).toBeOnTheScreen();
    // The rarer ones are not in the row.
    expect(row.queryByText(t('superset.link'))).toBeNull();
    expect(row.queryByText(t('workout.skipMove'))).toBeNull();
    expect(screen.queryByTestId('more-menu')).toBeNull();
  });

  test('the three links keep their targets', async () => {
    await show();
    await screen.findByTestId('move-links');
    await fireEvent.press(screen.getByRole('button', { name: t('history.openLabel', { exercise: 'Bench press' }) }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/exercise-history', params: { exercise: 'bench_press' } });
    await fireEvent.press(screen.getByRole('button', { name: t('demo.openLabel', { exercise: 'Bench press' }) }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/exercise', params: { exercise: 'bench_press' } });
  });

  test('no Swap where there is nothing to swap for: no options, or every option is on the day already', async () => {
    mockData = { ...mockData, program: { state: 'ready', value: programWith(['one_arm_dumbbell_row']) } };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.queryByRole('button', { name: t('swap.label', { move: 'Bench press' }) })).toBeNull();
    await pickMove(ROW); // the row has none at all
    expect(screen.queryByRole('button', { name: t('swap.label', { move: ROW }) })).toBeNull();
  });

  test('no Swap on a move outside the plan', async () => {
    mockRecords = [
      ...lastWeek(),
      record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' }),
      record('set', 'p1', { clientId: 'p1', exerciseId: 'push_up', setType: 'WORKING', loadKg: 0, reps: 12, rir: 1, side: 'BOTH' }, 'w1'),
    ];
    await show();
    await pickMove(PUSH_UP);
    expect(screen.queryByRole('button', { name: t('swap.label', { move: PUSH_UP }) })).toBeNull();
  });

  test("the new move takes the old one's place with its sets, range and aim, and no target of its own; nothing is sent", async () => {
    await show();
    await swapTo(DUMBBELL);
    expect(head().getByText(DUMBBELL)).toBeOnTheScreen();
    expect(screen.getByText(t('workout.setOf', { number: 1, count: 3 }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.targetRir', { max: 1 }))).toBeOnTheScreen();
    // No target: the old move's 62.5 kg and its best set are not the new move's; the range alone is the aim.
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe('');
    expect(within(screen.getByTestId('goal')).getByText(t('workout.goal.first'))).toBeOnTheScreen();
    expect(screen.queryByText(t('workout.goal.beat'))).toBeNull();
    expect(screen.getByLabelText(t('workout.dot', { name: DUMBBELL, status: t('workout.sets', { count: 3 }) }))).toBeOnTheScreen();
    expect(screen.queryByLabelText(t('workout.dot', { name: 'Bench press', status: t('workout.sets', { count: 3 }) }))).toBeNull();
    // The server refuses it once the workout has started: the phone does not ask.
    expect(mockPOST).not.toHaveBeenCalled();
    expect(mockDELETE).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  test('the sets are logged under the new move, with the aim of the planned one', async () => {
    await show();
    await swapTo(DUMBBELL);
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '30');
    await fireEvent.changeText(screen.getByLabelText('Reps'), '10');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    expect(sets()).toEqual([
      {
        kind: 'set',
        workoutClientId: 'w1',
        body: { clientId: expect.any(String), exerciseId: 'dumbbell_bench_press', setType: 'WORKING', loadKg: 30, reps: 10, rir: 1, side: 'BOTH' },
      },
    ]);
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
  });

  test('the new move never done before starts with no weight: the sheet says to pick it', async () => {
    await show();
    await swapTo(DUMBBELL);
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe('');
    expect(screen.getByLabelText('Reps').props.value).toBe('6'); // the planned range's bottom
    // The next set carries what was just lifted: that is this session's, not a guess.
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '30');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe('30');
  });

  // ADR-075 Ek 8 (review of K-973): only a move with no history at all is picked; one done before starts from its own last time.
  test('the new move done before, on this phone, starts with its own last weight', async () => {
    mockRecords = [
      ...lastWeek(),
      record('set', 's7', { clientId: 's7', exerciseId: 'dumbbell_bench_press', setType: 'WORKING', loadKg: 32.5, reps: 12 }, 'w0'),
      record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' }),
    ];
    await show();
    await swapTo(DUMBBELL);
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe('32.5');
    expect(screen.getByRole('button', { name: t('workout.log', { number: 1 }) })).toBeEnabled();
  });

  test('it works offline: the phone has everything it needs', async () => {
    mockData = { ...mockData, kept: true };
    await show();
    await swapTo(DUMBBELL);
    expect(head().getByText(DUMBBELL)).toBeOnTheScreen();
    expect(mockPOST).not.toHaveBeenCalled();
  });

  test('a swap is said (K-815), with its Undo; undone, the planned move is back with its target', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    try {
      await show();
      await swapTo(DUMBBELL);
      expect(said).toHaveBeenLastCalledWith(t('workout.swapped', { name: DUMBBELL }));
      expect(screen.getByText(t('workout.swapped', { name: DUMBBELL }))).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: t('workout.undoLabel') })).toHaveStyle({ minHeight: tokens.size.touch });
      await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
      expect(head().getByText('Bench press')).toBeOnTheScreen();
      expect(screen.getByLabelText('Weight (kg)').props.value).toBe('62.5');
      expect(mockSwaps).toEqual({ workout: 'w1', swaps: {} });
    } finally {
      said.mockRestore();
    }
  });

  test('a swapped move offers the planned move first, "Back to the planned move"; taking it restores the target', async () => {
    await show();
    await swapTo(DUMBBELL);
    await openSwap(DUMBBELL);
    const options = screen.getAllByTestId('swap-option');
    expect(options[0].props.accessibilityLabel).toBe(`Bench press. ${t('swap.back')}`);
    expect(options.map((o) => o.props.accessibilityLabel)).not.toContain(DUMBBELL); // the move it is now is not offered again
    await fireEvent.press(options[0]);
    expect(head().getByText('Bench press')).toBeOnTheScreen();
    expect(screen.getByText(t('workout.swappedBack', { name: 'Bench press' }))).toBeOnTheScreen();
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe('62.5');
    expect(mockSwaps).toEqual({ workout: 'w1', swaps: {} });
  });

  test('swapped again, it is still the planned move that is swapped: one entry, the last move', async () => {
    await show();
    await swapTo(DUMBBELL);
    await swapTo(INCLINE, DUMBBELL);
    expect(head().getByText(INCLINE)).toBeOnTheScreen();
    expect(mockSwaps).toEqual({ workout: 'w1', swaps: { bench_press: 'incline_dumbbell_press' } });
  });

  test('kept with the workout: opened again, the swap still is, and Back is still offered', async () => {
    await show();
    await swapTo(DUMBBELL);
    expect(mockSwaps).toEqual({ workout: 'w1', swaps: { bench_press: 'dumbbell_bench_press' } });
    await screen.unmount();
    await show();
    expect(await within(await screen.findByTestId('move-head')).findByText(DUMBBELL)).toBeOnTheScreen();
    await openSwap(DUMBBELL);
    expect(screen.getAllByTestId('swap-option')[0].props.accessibilityLabel).toBe(`Bench press. ${t('swap.back')}`);
  });

  test("another workout's swaps are not this one's", async () => {
    mockSwaps = { workout: 'w0', swaps: { bench_press: 'dumbbell_bench_press' } };
    await show();
    expect(await within(await screen.findByTestId('move-head')).findByText('Bench press')).toBeOnTheScreen();
  });

  test('swapped before the first set: the workout that set starts keeps the swap, and the set is the new move', async () => {
    mockRecords = lastWeek();
    mockParams = { day: 'day-a' };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await swapTo(DUMBBELL);
    expect(mockRecord).not.toHaveBeenCalled(); // an empty workout is no session
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '30');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    const workout = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'workout');
    expect(mockSwaps).toEqual({ workout: workout?.kind === 'workout' ? workout.body.clientId : 'none', swaps: { bench_press: 'dumbbell_bench_press' } });
    expect(sets()[0].body).toMatchObject({ exerciseId: 'dumbbell_bench_press' });
  });

  test('the sets already done of the old move stay on it: it is still in the session, to carry on', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    await swapTo(DUMBBELL);
    expect(head().getByText(DUMBBELL)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Bench press, / })).toBeOnTheScreen();
    expect(sets()).toHaveLength(1);
    expect(sets()[0].body).toMatchObject({ exerciseId: 'bench_press' });
    // Back to the planned move: its set is there again, the next is its second.
    await openSwap(DUMBBELL);
    await fireEvent.press(screen.getAllByTestId('swap-option')[0]);
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
  });

  test('a set logged ends the Undo of the swap: the move has sets now', async () => {
    await show();
    await swapTo(DUMBBELL);
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '30');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(screen.queryByRole('button', { name: t('workout.undoLabel') })).toBeNull();
  });

  test('finished, its swaps are forgotten', async () => {
    await show();
    await swapTo(DUMBBELL);
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '30');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    await endAndFinish();
    await fireEvent.press(screen.getByText('Finish'));
    expect(mockServices.sessionSwaps.forget).toHaveBeenCalled();
  });

  test('discarded, its swaps are forgotten, and Undo brings them back with the new workout', async () => {
    await show();
    await swapTo(DUMBBELL);
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '30');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.endLabel') }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t('workout.ending.discard')}`) }));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
    await screen.findByText(t('workout.ending.discarded'));
    expect(mockServices.sessionSwaps.forget).toHaveBeenCalled();
    expect(mockSwaps).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(mockSwaps).toEqual({ workout: expect.not.stringMatching(/^w1$/), swaps: { bench_press: 'dumbbell_bench_press' } });
  });

  // K1 (Evre 7 C4): the sheet is over the session now (it no longer takes the page's place or hides the dock); End still works under it.
  test('the sheet is over the session: End still works from it', async () => {
    await show();
    await openSwap();
    expect(screen.getByTestId('swap-sheet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.endLabel') }));
    expect(screen.getByText(t('workout.ending.title'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.back') }));
    expect(screen.getByText(t('workout.log', { number: 1 }))).toBeOnTheScreen();
  });

  test('every option is a full touch target with a name for VoiceOver', async () => {
    await show();
    await openSwap();
    const options = screen.getAllByTestId('swap-option');
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) {
      expect(o).toHaveStyle({ minHeight: tokens.size.touch });
      expect(o.props.accessibilityRole).toBe('button');
    }
  });
  describe('a swap inside a superset: the new move takes the old one\'s place in the round', () => {
    const linkWithRow = async () => {
      await more(t('superset.link'));
      await fireEvent.press(screen.getByRole('button', { name: t('superset.pick', { name: ROW }) }));
    };
    const typeAndLog = async (button: string, kg = '20') => {
      await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), kg);
      await fireEvent.changeText(screen.getByLabelText('Reps'), '10');
      await fireEvent.press(await screen.findByText(button));
    };
    const side = (number: number, which: 'LEFT' | 'RIGHT') => t('workout.logSide', { number, side: t(`workout.sideName.${which}`) });
    const upNext = () => within(screen.getByTestId('up-next'));
    const partnerLine = (name: string) => t('superset.with', { names: name });
    const ids = () => sets().map((s) => s.body.supersetId);

    test('under way: after the partner it is the swapped move that comes next, not the one it replaced', async () => {
      await show();
      await linkWithRow();
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 }))); // the bench, set 1
      await typeAndLog(side(1, 'LEFT'));
      await typeAndLog(side(1, 'RIGHT'));
      await screen.findByText(t('workout.log', { number: 2 })); // the bench again
      await swapTo(DUMBBELL);
      expect(screen.getByText(partnerLine(ROW))).toBeOnTheScreen(); // the superset goes with it
      await typeAndLog(t('workout.log', { number: 1 }), '30'); // the dumbbell press, set 1 of its own
      expect(await screen.findByText(side(2, 'LEFT'))).toBeOnTheScreen();
      expect(screen.getByText(partnerLine(DUMBBELL))).toBeOnTheScreen(); // not "Bench press"
      expect(upNext().getByText(DUMBBELL)).toBeOnTheScreen();
      await typeAndLog(side(2, 'LEFT'));
      await typeAndLog(side(2, 'RIGHT'));
      expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
      expect(head().getByText(DUMBBELL)).toBeOnTheScreen();
      expect(sets().map((s) => s.body.exerciseId)).toEqual([
        'bench_press',
        'one_arm_dumbbell_row',
        'one_arm_dumbbell_row',
        'dumbbell_bench_press',
        'one_arm_dumbbell_row',
        'one_arm_dumbbell_row',
      ]);
      expect(new Set(ids()).size).toBe(1); // one superset all along
      expect(ids()[0]).toEqual(expect.any(String));
    });

    test('before any set: the superset made is the new move\'s, and no ghost group holds the old one', async () => {
      await show();
      await linkWithRow();
      await swapTo(DUMBBELL);
      expect(screen.getByText(partnerLine(ROW))).toBeOnTheScreen();
      await typeAndLog(t('workout.log', { number: 1 }), '30');
      expect(await screen.findByText(side(1, 'LEFT'))).toBeOnTheScreen(); // the partner follows
      expect(screen.getByText(partnerLine(DUMBBELL))).toBeOnTheScreen();
      expect(upNext().getByText(DUMBBELL)).toBeOnTheScreen();
      expect(sets()[0].body).toMatchObject({ exerciseId: 'dumbbell_bench_press', supersetId: expect.any(String) });
      await typeAndLog(side(1, 'LEFT'));
      await typeAndLog(side(1, 'RIGHT'));
      expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
      expect(head().getByText(DUMBBELL)).toBeOnTheScreen();
      expect(new Set(ids()).size).toBe(1);
    });

    test('a link made on the swapped move goes with the planned move\'s place: Back keeps it', async () => {
      await show();
      await swapTo(DUMBBELL);
      await linkWithRow();
      expect(screen.getByText(partnerLine(ROW))).toBeOnTheScreen();
      await openSwap(DUMBBELL);
      await fireEvent.press(screen.getAllByTestId('swap-option')[0]);
      expect(head().getByText('Bench press')).toBeOnTheScreen();
      expect(screen.getByText(partnerLine(ROW))).toBeOnTheScreen();
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(await screen.findByText(side(1, 'LEFT'))).toBeOnTheScreen();
      expect(sets()[0].body).toMatchObject({ exerciseId: 'bench_press', supersetId: expect.any(String) });
    });

    test('Undo of the swap gives the superset back as it was', async () => {
      await show();
      await linkWithRow();
      await swapTo(DUMBBELL);
      await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
      expect(head().getByText('Bench press')).toBeOnTheScreen();
      expect(screen.getByText(partnerLine(ROW))).toBeOnTheScreen();
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(await screen.findByText(side(1, 'LEFT'))).toBeOnTheScreen();
      expect(screen.getByText(partnerLine('Bench press'))).toBeOnTheScreen();
      expect(sets()[0].body).toMatchObject({ exerciseId: 'bench_press', supersetId: expect.any(String) });
    });

    test('Back to the planned move after sets of the new one: the round goes on with the planned move', async () => {
      await show();
      await linkWithRow();
      await swapTo(DUMBBELL);
      await typeAndLog(t('workout.log', { number: 1 }), '30');
      await typeAndLog(side(1, 'LEFT'));
      await typeAndLog(side(1, 'RIGHT'));
      await screen.findByText(t('workout.log', { number: 2 }));
      await openSwap(DUMBBELL);
      await fireEvent.press(screen.getAllByTestId('swap-option')[0]);
      expect(head().getByText('Bench press')).toBeOnTheScreen();
      expect(screen.getByText(partnerLine(ROW))).toBeOnTheScreen();
      await typeAndLog(t('workout.log', { number: 1 }), '60');
      expect(await screen.findByText(side(2, 'LEFT'))).toBeOnTheScreen();
      expect(sets().at(-1)?.body).toMatchObject({ exerciseId: 'bench_press', supersetId: expect.any(String) });
    });
  });

  test('the planned moves count: a move swapped after a set of it is still one done', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(screen.getByText(t('workout.progress', { done: 1, count: 2 }))).toBeOnTheScreen();
    await swapTo(DUMBBELL);
    expect(screen.getByText(t('workout.progress', { done: 1, count: 2 }))).toBeOnTheScreen();
  });

  test('the planned moves count: sets of the swapped-in move make the place one done', async () => {
    await show();
    await swapTo(DUMBBELL);
    expect(screen.getByText(t('workout.progress', { done: 0, count: 2 }))).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '30');
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(screen.getByText(t('workout.progress', { done: 1, count: 2 }))).toBeOnTheScreen();
  });

  test('a swap kept that the plan does not offer (or the phone has no move for) is no swap', async () => {
    mockSwaps = { workout: 'w1', swaps: { bench_press: 'not_in_the_catalog' } };
    await show();
    expect(await within(await screen.findByTestId('move-head')).findByText('Bench press')).toBeOnTheScreen();
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe('62.5');
    await screen.unmount();
    mockSwaps = { workout: 'w1', swaps: { bench_press: 'barbell_squat_not_offered' } };
    mockData = { ...mockData, exercises: { state: 'ready', value: [...CATALOG, { id: 'barbell_squat_not_offered', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise']] } };
    await show();
    expect(await within(await screen.findByTestId('move-head')).findByText('Bench press')).toBeOnTheScreen();
  });
});

// K-973 (ADR-075 #3, Ek 1, Ek 8; user test 8 Oct): a move with no target starts with no weight picked, Log set waits for one,
// the first set says whether the weight is found or light, and "Too heavy?" offers the server's lighter load. The phone
// picks among the server's values and works none out.
describe('a move with no target: pick a weight, then the weight is found (K-973)', () => {
  const NEW_BENCH: Schemas['PlannedExercise'] = { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, calibrationStepKg: 2.5 };
  const withBench = (bench: Schemas['PlannedExercise']) => {
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [{ ...DAY, exercises: [bench, DAY.exercises[1]] }] } } };
  };
  const load = (unit = 'units.kgUnit') => screen.getByLabelText(t('workout.loadLabel', { unit: t(unit) }));
  const logButton = (number = 1) => screen.getByRole('button', { name: t('workout.log', { number }) });
  const type = async (kg: string, reps = '8', rir?: string) => {
    await fireEvent.changeText(load(), kg);
    await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), reps);
    if (rir !== undefined) await fireEvent.press(screen.getByRole('button', { name: rir }));
    await fireEvent.press(logButton());
  };
  const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
  // The first session of the move: the phone has nothing of it (the default records have the bench done last week).
  beforeEach(() => {
    withBench(NEW_BENCH);
    mockRecords = mockRecords.filter((r) => r.clientId === 'w1');
  });

  test('the weight starts empty and says so: "Pick a weight", and Log set is off with the reason', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(load().props.value).toBe('');
    expect(load().props.placeholder).toBe(t('workout.pick.placeholder'));
    expect(screen.getByText(t('workout.pick.caption'))).toBeOnTheScreen();
    expect(logButton()).toBeDisabled();
    expect(screen.getByText(t('workout.pick.why'))).toBeOnTheScreen();
    expect(within(screen.getByTestId('dock')).getByRole('button', { name: t('workout.log', { number: 1 }) })).toBeOnTheScreen();
    await fireEvent.press(logButton());
    expect(sets()).toEqual([]);
    expect(screen.queryByText(t('workout.invalid'))).toBeNull();
  });

  test('a weight picked turns Log set on, and the reason goes', async () => {
    await show();
    await fireEvent.changeText(await screen.findByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '40');
    expect(logButton()).toBeEnabled();
    expect(screen.queryByText(t('workout.pick.why'))).toBeNull();
  });

  test('the first tap on more weight is the smallest pair of plates without a gym', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await press(stepName('moreLoad'));
    expect(load().props.value).toBe(String(workoutParams.loadStep.kg));
    expect(logButton()).toBeEnabled();
  });

  test('the first tap on more weight is the empty bar at a gym with one', async () => {
    const GYM = { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25], dumbbellsKg: [], stackStepKg: null, machineStepsKg: {} };
    mockData = { ...mockData, gym: GYM, exercises: { state: 'ready', value: EXERCISES.map((m) => ({ ...m, equipment: 'BARBELL' })) as Schemas['Exercise'][] } };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await press(stepName('moreLoad'));
    expect(load().props.value).toBe('20');
  });

  // K-1047 (ADR-070 Ek 2 #5): the empty value stays typeable; the first tap starts from the empty bar on a barbell move, from
  // the smallest step on any other. No table of starts per equipment exists, so none is made up: the bar is the onboarding's
  // (starting_weight_stepper), the step is the stepper's.
  describe('the first weight with no target and no gym (K-1047)', () => {
    const equipped = (equipment: string) => {
      mockData = { ...mockData, exercises: { state: 'ready', value: EXERCISES.map((m) => ({ ...m, equipment })) as Schemas['Exercise'][] } };
    };

    test('a barbell move starts from the empty bar: 20 kg', async () => {
      equipped('BARBELL');
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await press(stepName('moreLoad'));
      expect(load().props.value).toBe('20');
      await press(stepName('moreLoad'));
      expect(load().props.value).toBe('22.5');
      await fireEvent.press(logButton());
      expect(sets()[0].body).toMatchObject({ loadKg: 22.5 });
    });

    test('a barbell move for a lb user starts from the 45 lb bar, and logs it in kg', async () => {
      mockUnits = 'IMPERIAL';
      equipped('BARBELL');
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await press(stepName('moreLoad'));
      expect(load('units.lbUnit').props.value).toBe('45');
      await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '8');
      await fireEvent.press(logButton());
      expect(sets()[0].body).toMatchObject({ loadKg: 20.41 });
    });

    test.each(['PLATE_LOADED', 'MACHINE', 'CABLE', 'DUMBBELL'])('%s starts from the smallest step, not from a bar', async (equipment) => {
      equipped(equipment);
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await press(stepName('moreLoad'));
      expect(load().props.value).toBe(String(workoutParams.loadStep.kg));
    });

    test('the empty weight can be typed instead, with a comma', async () => {
      equipped('BARBELL');
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(load().props.value).toBe('');
      await fireEvent.changeText(load(), '62,5');
      expect(logButton()).toBeEnabled();
      await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '8');
      await fireEvent.press(logButton());
      expect(sets()[0].body).toMatchObject({ loadKg: 62.5, reps: 8 });
    });

    test('cleared again, the weight is empty and the button waits for one', async () => {
      equipped('BARBELL');
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await fireEvent.changeText(load(), '60');
      await fireEvent.changeText(load(), '');
      expect(load().props.value).toBe('');
      expect(logButton()).toBeDisabled();
      expect(screen.getByText(t('workout.pick.why'))).toBeOnTheScreen();
    });
  });

  test('the first tap on more weight is the lightest dumbbell at a rack', async () => {
    const RACK = { barKg: null, platesKg: [], dumbbellsKg: [4, 6, 8, 10], stackStepKg: null, machineStepsKg: {} };
    mockData = { ...mockData, gym: RACK, exercises: { state: 'ready', value: EXERCISES.map((m) => ({ ...m, equipment: 'DUMBBELL' })) as Schemas['Exercise'][] } };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await press(stepName('moreLoad'));
    expect(load().props.value).toBe('4');
  });

  // Review of K-973 (ADR-075 Ek 8): the server sends a calibration step with every move that has no target, an isolation move
  // at each session. Only a move never done is picked and found; one done before starts from its last weight, as it always did.
  test('a move done before (a second session) starts with its last weight: nothing to pick, no weight found', async () => {
    mockRecords = [...lastWeek(), record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' })];
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(load().props.value).toBe('57.5');
    expect(logButton()).toBeEnabled();
    expect(screen.queryByText(t('workout.pick.why'))).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '1' }));
    await fireEvent.press(logButton());
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(screen.queryByText(/Starting weight found/)).toBeNull();
    expect(sets()[0].body).toMatchObject({ loadKg: 57.5 });
  });

  test("a move the server says was done (its last best set) starts with that weight, though this phone kept nothing", async () => {
    withBench({ ...NEW_BENCH, lastBestSet: { loadKg: 60, reps: 8, rir: 1 } });
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(load().props.value).toBe('60');
    expect(logButton()).toBeEnabled();
  });

  test('the weight found: after a set in the range with 1 rep left, the screen says the starting weight is found', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.queryByTestId('insight')).toBeNull();
    await type('40', '8', '1');
    expect(await screen.findByText(t('workout.calibrate.found', { load: '40 kg' }))).toBeOnTheScreen();
    expect(screen.queryByText(t('workout.calibrate.light', { load: '42.5 kg' }))).toBeNull();
  });

  test('2+ reps left: the weight is light, and the next set is offered one step heavier, to take or keep', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await type('40', '8', '2+');
    expect(await screen.findByText(t('workout.calibrate.light', { load: '42.5 kg' }))).toBeOnTheScreen();
    expect(screen.queryByText(t('workout.calibrate.found', { load: '40 kg' }))).toBeNull();
    expect(load().props.value).toBe('40'); // the next set carries the weight just lifted until the person takes the offer
    await fireEvent.press(screen.getByRole('button', { name: t('workout.tooHeavy.use', { load: '42.5 kg' }) }));
    expect(load().props.value).toBe('42.5');
    expect(screen.queryByText(t('workout.calibrate.light', { load: '42.5 kg' }))).toBeNull();
    await fireEvent.press(logButton(2));
    expect(sets()[1].body).toMatchObject({ loadKg: 42.5 });
  });

  test('keeping the weight puts the offer away, and the set is logged at it', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await type('40', '8', '2+');
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.tooHeavy.keep', { load: '40 kg' }) }));
    expect(screen.queryByText(t('workout.calibrate.light', { load: '42.5 kg' }))).toBeNull();
    expect(load().props.value).toBe('40');
    await fireEvent.press(logButton(2));
    expect(sets()[1].body).toMatchObject({ loadKg: 40 });
  });

  test('Keep is for the move: the rows after it do not ask again', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await type('40', '8', '2+');
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.tooHeavy.keep', { load: '40 kg' }) }));
    await fireEvent.press(logButton(2)); // the same 40 kg, 8 reps, 2+ left
    await screen.findByText(t('workout.log', { number: 3 }));
    expect(screen.queryByText(t('workout.calibrate.light', { load: '42.5 kg' }))).toBeNull();
    expect(screen.queryByRole('button', { name: t('workout.tooHeavy.keep', { load: '40 kg' }) })).toBeNull();
  });

  test('the offer buttons are full touch targets', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await type('40', '8', '2+');
    expect(await screen.findByRole('button', { name: t('workout.tooHeavy.use', { load: '42.5 kg' }) })).toHaveStyle({ minHeight: tokens.size.touch });
    expect(screen.getByRole('button', { name: t('workout.tooHeavy.keep', { load: '40 kg' }) })).toHaveStyle({ minHeight: tokens.size.touch });
  });

  describe('a one-sided move: each side reads its own sets', () => {
    const ROW = t('exercises.one_arm_dumbbell_row.name');
    const sideButton = (number: number, which: 'LEFT' | 'RIGHT') => t('workout.logSide', { number, side: t(`workout.sideName.${which}`) });
    const logSide = async (number: number, which: 'LEFT' | 'RIGHT') => {
      await fireEvent.changeText(load(), '20');
      await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '10');
      await fireEvent.press(screen.getByRole('button', { name: '2+' }));
      await fireEvent.press(screen.getByRole('button', { name: sideButton(number, which) }));
    };
    const light = t('workout.calibrate.light', { load: '22.5 kg' });
    beforeEach(() => {
      mockData = {
        ...mockData,
        program: { state: 'ready', value: { ...PROGRAM, days: [{ ...DAY, exercises: [DAY.exercises[0], { ...DAY.exercises[1], calibrationStepKg: 2.5 }] }] } },
      };
    });

    test("the right side's first set is not offered a heavier weight from the left side's set", async () => {
      await show();
      await pickMove(ROW);
      await logSide(1, 'LEFT');
      expect(await screen.findByText(sideButton(1, 'RIGHT'))).toBeOnTheScreen();
      await fireEvent.changeText(load(), '20'); // the weight the left side was done with
      expect(screen.queryByText(light)).toBeNull();
      expect(screen.queryByText(/Starting weight found/)).toBeNull();
    });

    test("Keep on one side does not put the other side's offer away", async () => {
      await show();
      await pickMove(ROW);
      await logSide(1, 'LEFT');
      await logSide(1, 'RIGHT');
      expect(await screen.findByText(light)).toBeOnTheScreen(); // the left side, set 2: its own set said light
      await fireEvent.press(screen.getByRole('button', { name: t('workout.tooHeavy.keep', { load: '20 kg' }) }));
      await fireEvent.press(screen.getByRole('button', { name: sideButton(2, 'LEFT') }));
      expect(await screen.findByText(sideButton(2, 'RIGHT'))).toBeOnTheScreen();
      expect(screen.getByText(light)).toBeOnTheScreen(); // the right side, set 2: its own set said light, not kept
    });
  });

  describe('a move with an added load (bodyweight plus weight): the body alone is a start', () => {
    const PULL = { id: 'pull_up', nameKey: 'exercises.pull_up.name', load: 'BODYWEIGHT_PLUS_EXTERNAL', unilateral: false } as Schemas['Exercise'];
    const added = () => screen.getByLabelText(t('workout.addedLabel', { unit: t('units.kgUnit') }));
    beforeEach(() => {
      mockData = {
        ...mockData,
        exercises: { state: 'ready', value: [...EXERCISES, PULL] },
        program: {
          state: 'ready',
          value: { ...PROGRAM, days: [{ ...DAY, exercises: [{ exerciseId: 'pull_up', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, calibrationStepKg: 2.5 }, DAY.exercises[1]] }] },
        },
      };
    });

    test('it starts at 0, not "Pick a weight": Log set is on and the set goes as the body alone', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(added().props.value).toBe('0');
      expect(screen.queryByText(t('workout.pick.why'))).toBeNull();
      expect(screen.queryByText(t('workout.pick.caption'))).toBeNull();
      expect(logButton()).toBeEnabled();
      await fireEvent.press(screen.getByRole('button', { name: '1' }));
      await fireEvent.press(logButton());
      await screen.findByText(t('workout.log', { number: 2 }));
      expect(sets()[0].body).toMatchObject({ exerciseId: 'pull_up', loadKg: 0 });
      expect(screen.queryByText(/Starting weight found/)).toBeNull(); // 0 kg is no weight found
    });

    test('the field left empty is the body alone too', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await fireEvent.changeText(added(), '');
      expect(logButton()).toBeEnabled();
      expect(screen.queryByText(t('workout.pick.why'))).toBeNull();
      await fireEvent.press(logButton());
      await screen.findByText(t('workout.log', { number: 2 }));
      expect(sets()[0].body).toMatchObject({ loadKg: 0 });
    });

    test('2+ reps left at the body alone still offers a first added weight', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await fireEvent.press(screen.getByRole('button', { name: '2+' }));
      await fireEvent.press(logButton());
      expect(await screen.findByText(t('workout.calibrate.light', { load: '2.5 kg' }))).toBeOnTheScreen();
    });
  });

  test("the offer is the gym's heavier load within the server's step; none where the gym makes nothing inside it", async () => {
    const SPARSE = { barKg: 20, platesKg: [20, 10, 5], dumbbellsKg: [], stackStepKg: null, machineStepsKg: {} };
    mockData = { ...mockData, gym: SPARSE, exercises: { state: 'ready', value: EXERCISES.map((m) => ({ ...m, equipment: 'BARBELL' })) as Schemas['Exercise'][] } };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await type('40', '8', '2+');
    expect(await screen.findByText(t('workout.calibrate.found', { load: '40 kg' }))).toBeOnTheScreen();
    expect(screen.queryByText(/Next set/)).toBeNull();
  });

  test('a move with a target is not calibrated: 2+ reps left says nothing of a heavier weight', async () => {
    withBench({ ...NEW_BENCH, nextLoadKg: 62.5, nextReps: 6 });
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await fireEvent.press(screen.getByRole('button', { name: '2+' }));
    await fireEvent.press(logButton());
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(screen.queryByText(/Next set/)).toBeNull();
    expect(screen.queryByText(/Starting weight found/)).toBeNull();
  });

  test('the word follows the sets as they are: the set deleted, the word goes', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await type('40', '8', '1');
    await screen.findByText(t('workout.calibrate.found', { load: '40 kg' }));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.doneSet', { number: '1', set: '40 kg × 8', left: '1' }) }));
    await fireEvent.press(within(screen.getByTestId('edit-set')).getByRole('button', { name: t('workout.edit.delete') }));
    await waitFor(() => expect(screen.queryByText(t('workout.calibrate.found', { load: '40 kg' }))).toBeNull());
  });

  test('a lb user reads the word in lb', async () => {
    mockUnits = 'IMPERIAL';
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await fireEvent.changeText(load('units.lbUnit'), '90');
    await fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '8');
    await fireEvent.press(screen.getByRole('button', { name: '1' }));
    await fireEvent.press(logButton());
    expect(await screen.findByText(t('workout.calibrate.found', { load: formatLoad(90 * 0.45359237, 'IMPERIAL') }))).toBeOnTheScreen();
  });
});

describe('"Too heavy?": the server\'s lighter load, to take or keep (K-973, G1 decision #61)', () => {
  const TARGET: Schemas['PlannedExercise'] = { ...DAY.exercises[0], lighterLoadKg: 60, heavierLoadKg: 65 };
  const load = () => screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') }));
  const link = () => screen.getByRole('button', { name: t('workout.tooHeavy.label') });
  const withBench = (bench: Schemas['PlannedExercise']) => {
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [{ ...DAY, exercises: [bench, DAY.exercises[1]] }] } } };
  };
  beforeEach(() => withBench(TARGET));

  test('a link with the weight, far from both skips; a full touch target', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(link()).toBeOnTheScreen();
    expect(link()).toHaveStyle({ minHeight: tokens.size.touch });
    expect(screen.getByText(t('workout.tooHeavy.link'))).toBeOnTheScreen();
    expect(within(screen.getByTestId('dock')).queryByText(t('workout.tooHeavy.link'))).toBeNull(); // Skip set is there
    expect(within(screen.getByTestId('move-head')).queryByText(t('workout.tooHeavy.link'))).toBeNull(); // Skip move is there
  });

  test('asked: the advice and the two ways out, the lighter weight and the one shown', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.queryByText(t('workout.tooHeavy.ask'))).toBeNull();
    await fireEvent.press(link());
    expect(screen.getByText(t('workout.tooHeavy.ask'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('workout.tooHeavy.use', { load: '60 kg' }) })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('workout.tooHeavy.keep', { load: '62.5 kg' }) })).toBeOnTheScreen();
  });

  test('both ways out are full touch targets', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await fireEvent.press(link());
    expect(screen.getByRole('button', { name: t('workout.tooHeavy.use', { load: '60 kg' }) })).toHaveStyle({ minHeight: tokens.size.touch });
    expect(screen.getByRole('button', { name: t('workout.tooHeavy.keep', { load: '62.5 kg' }) })).toHaveStyle({ minHeight: tokens.size.touch });
  });

  test('Use takes the lighter weight; the set is logged at it and the next one carries it', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await fireEvent.press(link());
    await fireEvent.press(screen.getByRole('button', { name: t('workout.tooHeavy.use', { load: '60 kg' }) }));
    expect(load().props.value).toBe('60');
    expect(screen.queryByText(t('workout.tooHeavy.ask'))).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 1 }) }));
    expect(sets()[0].body).toMatchObject({ loadKg: 60 });
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(load().props.value).toBe('60');
  });

  test('Keep leaves the weight as it is and puts the question away', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await fireEvent.press(link());
    await fireEvent.press(screen.getByRole('button', { name: t('workout.tooHeavy.keep', { load: '62.5 kg' }) }));
    expect(load().props.value).toBe('62.5');
    expect(screen.queryByText(t('workout.tooHeavy.ask'))).toBeNull();
  });

  test('no link where the server has no lighter load, or the weight shown is not above it', async () => {
    withBench({ ...DAY.exercises[0] });
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(screen.queryByText(t('workout.tooHeavy.link'))).toBeNull();
    await screen.unmount();
    withBench(TARGET);
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await fireEvent.changeText(load(), '57.5');
    expect(screen.queryByText(t('workout.tooHeavy.link'))).toBeNull();
  });

  test('the asking is said (K-815), and it is the weight in the user\'s unit', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    try {
      mockUnits = 'IMPERIAL';
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await fireEvent.press(link());
      expect(said).toHaveBeenLastCalledWith(t('workout.tooHeavy.ask'));
      expect(screen.getByRole('button', { name: t('workout.tooHeavy.use', { load: formatLoad(60, 'IMPERIAL') }) })).toBeOnTheScreen();
    } finally {
      said.mockRestore();
    }
  });
});

describe('the target line when the target is last time (K-973)', () => {
  const withBench = (bench: Schemas['PlannedExercise']) => {
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [{ ...DAY, exercises: [bench, DAY.exercises[1]] }] } } };
  };

  test('the target is the best set of last time: it is not beaten and last time at once', async () => {
    withBench({ ...DAY.exercises[0], lastBestSet: { loadKg: 62.5, reps: 6, rir: 1 } });
    await show();
    const goal = within(await screen.findByTestId('goal'));
    expect(goal.getByText(t('workout.goal.again'))).toBeOnTheScreen();
    expect(goal.getByText('62.5 kg × 6')).toBeOnTheScreen();
    expect(goal.queryByText(t('workout.goal.beat'))).toBeNull();
    expect(goal.queryByText(/Last:/)).toBeNull();
  });

  test('a target past last time is still beat last time, with last time beside it', async () => {
    withBench({ ...DAY.exercises[0], lastBestSet: { loadKg: 62.5, reps: 5, rir: 1 } });
    await show();
    const goal = within(await screen.findByTestId('goal'));
    expect(goal.getByText(t('workout.goal.beat'))).toBeOnTheScreen();
    expect(goal.getByText(t('workout.goal.last', { set: '62.5 kg × 5' }))).toBeOnTheScreen();
  });

  test('a move with its last time and no target: last time, and the weight to pick', async () => {
    withBench({ exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, lastBestSet: { loadKg: 60, reps: 8, rir: 1 }, calibrationStepKg: 2.5 });
    await show();
    const goal = within(await screen.findByTestId('goal'));
    expect(goal.getByText(t('workout.goal.lastTime'))).toBeOnTheScreen();
    expect(goal.getByText('60 kg × 8')).toBeOnTheScreen();
    expect(goal.getByText(t('workout.goal.pick'))).toBeOnTheScreen();
    expect(goal.queryByText(t('workout.goal.beat'))).toBeNull();
  });
});

describe('a swapped move starts with the server\'s table for it (K-973, ADR-075 Ek 7, Ek 8)', () => {
  const DUMBBELL = t('exercises.dumbbell_bench_press.name');
  const INCLINE = t('exercises.incline_dumbbell_press.name');
  const CATALOG = [
    ...EXERCISES,
    { id: 'dumbbell_bench_press', load: 'EXTERNAL', unilateral: false },
    { id: 'incline_dumbbell_press', load: 'EXTERNAL', unilateral: false },
  ] as Schemas['Exercise'][];
  const TABLES = [
    { exerciseId: 'dumbbell_bench_press', lastBestSet: { loadKg: 30, reps: 10, rir: 1 }, lighterLoadKg: 27.5, heavierLoadKg: 32.5, calibrationStepKg: 2.5 },
    { exerciseId: 'incline_dumbbell_press', calibrationStepKg: 2.5 },
  ];
  const serve = (tables: typeof TABLES | undefined) => {
    mockData = {
      program: {
        state: 'ready',
        value: {
          ...PROGRAM,
          days: [
            {
              ...DAY,
              exercises: [
                { ...DAY.exercises[0], swapOptions: ['dumbbell_bench_press', 'incline_dumbbell_press'], ...(tables === undefined ? {} : { swapTables: tables }) },
                { ...DAY.exercises[1], swapOptions: [] },
              ],
            },
          ],
        },
      },
      exercises: { state: 'ready', value: CATALOG },
      kept: false,
    };
  };
  const load = () => screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') }));
  const swapTo = async (name: string, from = 'Bench press') => {
    await fireEvent.press(await screen.findByRole('button', { name: t('swap.label', { move: from }) }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
  };

  test("its own last time, and its weight (the server's best set of it); a move never done: no weight, and Log set waiting for one", async () => {
    serve(TABLES);
    await show();
    await swapTo(DUMBBELL);
    expect(load().props.value).toBe('30');
    expect(screen.getByRole('button', { name: t('workout.log', { number: 1 }) })).toBeEnabled();
    const goal = within(screen.getByTestId('goal'));
    expect(goal.getByText(t('workout.goal.lastTime'))).toBeOnTheScreen();
    expect(goal.getByText('30 kg × 10')).toBeOnTheScreen();
    await swapTo(INCLINE, DUMBBELL);
    expect(load().props.value).toBe('');
    expect(screen.getByRole('button', { name: t('workout.log', { number: 1 }) })).toBeDisabled();
  });

  test('"Too heavy?" is the new move\'s own lighter load', async () => {
    serve(TABLES);
    await show();
    await swapTo(DUMBBELL);
    await fireEvent.press(screen.getByRole('button', { name: t('workout.tooHeavy.label') }));
    expect(screen.getByRole('button', { name: t('workout.tooHeavy.use', { load: '27.5 kg' }) })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('workout.tooHeavy.keep', { load: '30 kg' }) })).toBeOnTheScreen();
  });

  test('2+ reps left on the first set offers the new move\'s calibration step', async () => {
    serve(TABLES);
    await show();
    await swapTo(INCLINE);
    await fireEvent.changeText(load(), '24');
    await fireEvent.press(screen.getByRole('button', { name: '2+' }));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 1 }) }));
    expect(await screen.findByText(t('workout.calibrate.light', { load: '26.5 kg' }))).toBeOnTheScreen();
  });

  test('the planned move\'s own target is not the new move\'s: back to the planned move, its target is back', async () => {
    serve(TABLES);
    await show();
    await swapTo(DUMBBELL);
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    expect(load().props.value).toBe('62.5');
    expect(within(screen.getByTestId('goal')).getByText(t('workout.goal.start'))).toBeOnTheScreen();
  });

  test('an older server sends no tables: the move starts bare, as before, with no Too heavy? and no offer', async () => {
    serve(undefined);
    await show();
    await swapTo(DUMBBELL);
    expect(load().props.value).toBe('');
    expect(within(screen.getByTestId('goal')).getByText(t('workout.goal.first'))).toBeOnTheScreen();
    await fireEvent.changeText(load(), '30');
    expect(screen.queryByText(t('workout.tooHeavy.link'))).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '2+' }));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 1 }) }));
    await screen.findByText(t('workout.log', { number: 2 }));
    expect(screen.queryByText(/Next set/)).toBeNull();
  });
});

describe('the moves swapped away from (K-973, ADR-075 Ek 7, Ek 8)', () => {
  const DUMBBELL = t('exercises.dumbbell_bench_press.name');
  const INCLINE = t('exercises.incline_dumbbell_press.name');
  const ROW = t('exercises.one_arm_dumbbell_row.name');
  const CATALOG = [
    ...EXERCISES,
    { id: 'dumbbell_bench_press', load: 'EXTERNAL', unilateral: false },
    { id: 'incline_dumbbell_press', load: 'EXTERNAL', unilateral: false },
  ] as Schemas['Exercise'][];
  beforeEach(() => {
    mockData = {
      program: {
        state: 'ready',
        value: {
          ...PROGRAM,
          days: [{ ...DAY, exercises: [{ ...DAY.exercises[0], swapOptions: ['dumbbell_bench_press', 'incline_dumbbell_press'] }, { ...DAY.exercises[1], swapOptions: [] }] }],
        },
      },
      exercises: { state: 'ready', value: CATALOG },
      kept: false,
    };
  });
  const swapTo = async (name: string, from = 'Bench press') => {
    await fireEvent.press(await screen.findByRole('button', { name: t('swap.label', { move: from }) }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
  };
  const typeAndLog = async (button: string, kg = '20') => {
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), kg);
    await fireEvent.changeText(screen.getByLabelText('Reps'), '10');
    await fireEvent.press(await screen.findByText(button));
  };
  const side = (number: number, which: 'LEFT' | 'RIGHT') => t('workout.logSide', { number, side: t(`workout.sideName.${which}`) });
  const partnerLine = (name: string) => t('superset.with', { names: name });

  test('kept with the swaps: the move left, and the one it was swapped for in turn', async () => {
    await show();
    await swapTo(DUMBBELL);
    expect(mockLeft).toEqual({ workout: 'w1', left: ['bench_press'] });
    await typeAndLog(t('workout.log', { number: 1 }), '30');
    await screen.findByText(t('workout.log', { number: 2 }));
    await swapTo(INCLINE, DUMBBELL);
    expect(mockSwaps).toEqual({ workout: 'w1', swaps: { bench_press: 'incline_dumbbell_press' } });
    expect(mockLeft).toEqual({ workout: 'w1', left: ['bench_press', 'dumbbell_bench_press'] });
  });

  test('a swap\'s Undo keeps what was kept before it', async () => {
    await show();
    await swapTo(DUMBBELL);
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    expect(mockSwaps).toEqual({ workout: 'w1', swaps: {} });
    expect(mockLeft).toEqual({ workout: 'w1', left: [] });
  });

  test('opened again, the move swapped away from is not a member of the superset it left', async () => {
    await show();
    await more(t('superset.link'));
    await fireEvent.press(screen.getByRole('button', { name: t('superset.pick', { name: ROW }) }));
    await swapTo(DUMBBELL);
    await typeAndLog(t('workout.log', { number: 1 }), '30'); // the dumbbell press, set 1 of its own
    await typeAndLog(side(1, 'LEFT'));
    await typeAndLog(side(1, 'RIGHT'));
    await screen.findByText(t('workout.log', { number: 2 }));
    await swapTo(INCLINE, DUMBBELL); // swapped again: the dumbbell press is out of the round, its sets carry the superset
    await typeAndLog(t('workout.log', { number: 1 }), '25');
    await typeAndLog(side(2, 'LEFT'));
    await typeAndLog(side(2, 'RIGHT'));
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
    expect(screen.getByText(partnerLine(ROW))).toBeOnTheScreen();
    await screen.unmount();
    await show();
    expect(await screen.findByText(partnerLine(ROW))).toBeOnTheScreen();
  });

  test('added again with Add a move: its sets are open after the screen is opened again', async () => {
    // The add panel names every move it lists.
    mockData = { ...mockData, exercises: { state: 'ready', value: CATALOG.map((m) => ({ ...m, nameKey: `exercises.${m.id}.name` })) as Schemas['Exercise'][] } };
    await show();
    await swapTo(DUMBBELL); // the bench is out of the session, with no sets
    await typeAndLog(t('workout.log', { number: 1 }), '30');
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'bench');
    await fireEvent.press(screen.getByRole('button', { name: t('workout.add.pick', { name: 'Bench press' }) }));
    expect(mockLeft).toEqual({ workout: 'w1', left: [] }); // no longer a move left
    await typeAndLog(t('workout.log', { number: 1 }), '60');
    await screen.findByText(t('workout.log', { number: 2 }));
    await screen.unmount();
    await show();
    await pickMove('Bench press');
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen(); // open, not closed as a move left
  });

  test('a move swapped away from, its sets done, holds back neither the finish nor the next move', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 }))); // the bench, set 1
    await screen.findByText(t('workout.log', { number: 2 }));
    await swapTo(DUMBBELL);
    await typeAndLog(t('workout.log', { number: 1 }), '30');
    await typeAndLog(t('workout.log', { number: 2 }), '30');
    await typeAndLog(t('workout.log', { number: 3 }), '30');
    await pickMove(ROW);
    await typeAndLog(side(1, 'LEFT'));
    await typeAndLog(side(1, 'RIGHT'));
    await typeAndLog(side(2, 'LEFT'));
    await typeAndLog(side(2, 'RIGHT'));
    const dock = within(await screen.findByTestId('dock'));
    expect(await dock.findByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
    expect(dock.queryByRole('button', { name: t('workout.next', { name: 'Bench press' }) })).toBeNull();
  });

  test('its dot is there, with the sets it has, done', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    await swapTo(DUMBBELL);
    await pickMove('Bench press');
    expect(screen.getByLabelText(t('workout.doneSet', { number: '1', set: '62.5 kg × 6', left: '1' }))).toBeOnTheScreen();
    expect(screen.queryByText(t('workout.log', { number: 2 }))).toBeNull(); // no open row to log
  });
});

// K-973 (ADR-075 #4): the analysis line after the sets of a move, the server's numbers in en.json templates; read from the
// sets as they are, so a set corrected, deleted or skipped changes it by itself.
describe('the analysis line after the sets (K-973, ADR-075 #4)', () => {
  const BENCH: Schemas['PlannedExercise'] = {
    ...DAY.exercises[0],
    nextLoadKg: 62.5,
    nextReps: 7,
    lastBestSet: { loadKg: 62.5, reps: 6, rir: 1 },
    nextLoadAtTopKg: 65,
  };
  const serve = (bench: Schemas['PlannedExercise'], extra: Partial<Schemas['Program']> = {}) => {
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, ...extra, days: [{ ...DAY, exercises: [bench, DAY.exercises[1]] }] } } };
  };
  const reps = () => screen.getByLabelText(t('workout.repsLabel'));
  const logWith = async (n: number, count?: string) => {
    if (count !== undefined) await fireEvent.changeText(reps(), count);
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.log', { number: n }) }));
  };
  beforeEach(() => serve(BENCH));

  test("after a set: reps against last time, and what the server says comes at the top", async () => {
    await show();
    await logWith(1);
    expect(await screen.findByText("+1 rep vs last time.")).toBeOnTheScreen();
  });

  test('it sits in the page between the sets done and the set under way, not in the dock', async () => {
    await show();
    await logWith(1);
    const line = await screen.findByTestId('insight');
    expect(within(screen.getByTestId('dock')).queryByTestId('insight')).toBeNull();
    expect(line.props.accessibilityLabel).toBe("+1 rep vs last time.");
  });

  test('the best set of the move today, not the last one: 9 then 6 still reads the 9', async () => {
    await show();
    await logWith(1, '9');
    await screen.findByText("+3 reps vs last time.");
    await logWith(2, '6');
    await screen.findByText(t('workout.log', { number: 3 }));
    expect(screen.getByText("+3 reps vs last time.")).toBeOnTheScreen();
  });

  test('a set deleted takes the line with it; a set corrected changes it', async () => {
    await show();
    await logWith(1, '9');
    await screen.findByText("+3 reps vs last time.");
    const doneRow = () => screen.getByRole('button', { name: t('workout.doneSet', { number: '1', set: '62.5 kg × 9', left: '1' }) });
    await fireEvent.press(doneRow());
    const editor = within(screen.getByTestId('edit-set'));
    await fireEvent.press(editor.getByRole('button', { name: stepName('lessReps') }));
    await fireEvent.press(editor.getByRole('button', { name: t('workout.edit.done') }));
    expect(await screen.findByText("+2 reps vs last time.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('workout.doneSet', { number: '1', set: '62.5 kg × 8', left: '1' }) }));
    await fireEvent.press(within(screen.getByTestId('edit-set')).getByRole('button', { name: t('workout.edit.delete') }));
    await waitFor(() => expect(screen.queryByTestId('insight')).toBeNull());
  });

  test('a set skipped is no set: no line', async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.skipSetLabel') }));
    expect(screen.queryByTestId('insight')).toBeNull();
  });

  test('the same as last time, fewer reps, no earlier session, below the range', async () => {
    await show();
    await logWith(1, '6');
    expect(await screen.findByText(t('workout.insight.same'))).toBeOnTheScreen();
    await screen.unmount();
    mockRecords = [...lastWeek(), record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' })];
    serve({ ...BENCH, lastBestSet: { loadKg: 62.5, reps: 8, rir: 1 } });
    await show();
    await logWith(1, '7');
    expect(await screen.findByText(t('workout.insight.logged'))).toBeOnTheScreen();
    await screen.unmount();
    mockRecords = [...lastWeek(), record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' })];
    const { lastBestSet: _none, ...first } = BENCH;
    serve(first);
    await show();
    await logWith(1, '7');
    expect(await screen.findByText(t('workout.insight.logged'))).toBeOnTheScreen();
    await screen.unmount();
    mockRecords = [...lastWeek(), record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' })];
    serve(BENCH);
    await show();
    await logWith(1, '5');
    expect(await screen.findByText(t('workout.insight.below'))).toBeOnTheScreen();
  });

  test('a move whose load the weekly call holds: said again, as called', async () => {
    serve(BENCH, { loadHeldSince: '2026-10-05' });
    await show();
    await logWith(1, '8');
    expect(await screen.findByText(t('workout.insight.held', { reps: 8 }))).toBeOnTheScreen();
  });

  test('the weight of the next session only once every planned set is at the top: one set there promises nothing', async () => {
    await show();
    await logWith(1, '10');
    expect(await screen.findByText('+4 reps vs last time.')).toBeOnTheScreen();
    expect(screen.queryByText(/next time/)).toBeNull();
    await logWith(2, '10');
    await screen.findByText(t('workout.log', { number: 3 }));
    expect(screen.queryByText(/next time/)).toBeNull();
    await logWith(3, '10');
    expect(await screen.findByText('+4 reps vs last time. Top of the range: 65 kg next time.')).toBeOnTheScreen();
  });

  test('every set done but the last short of the top: still no weight', async () => {
    await show();
    await logWith(1, '10');
    await logWith(2, '10');
    await logWith(3, '9');
    expect(await screen.findByText('+4 reps vs last time.')).toBeOnTheScreen();
    expect(screen.queryByText(/next time/)).toBeNull();
  });

  test('a lb user reads the weight in lb', async () => {
    mockUnits = 'IMPERIAL';
    await show();
    await logWith(1, '10');
    await logWith(2, '10');
    await logWith(3, '10');
    expect(await screen.findByText(`+4 reps vs last time. Top of the range: ${formatLoad(65, 'IMPERIAL')} next time.`)).toBeOnTheScreen();
  });

  test('"again, as called" only for the weight of last time at the weight called; a lighter weight is logged', async () => {
    serve(BENCH, { loadHeldSince: '2026-10-05' });
    await show();
    await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '60');
    await logWith(1, '8');
    expect(await screen.findByText(t('workout.insight.logged'))).toBeOnTheScreen();
    expect(screen.queryByText(t('workout.insight.held', { reps: 8 }))).toBeNull();
  });

  test('a move with no target gets the calibration\'s words, not this line', async () => {
    serve({ ...BENCH, nextLoadKg: undefined, nextReps: undefined, nextLoadAtTopKg: undefined, lastBestSet: undefined, calibrationStepKg: 2.5 });
    // Its first session: the phone has nothing of it.
    mockRecords = mockRecords.filter((r) => r.clientId === 'w1');
    await show();
    await fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '40');
    await logWith(1, '8');
    expect(await screen.findByText(t('workout.calibrate.found', { load: '40 kg' }))).toBeOnTheScreen();
    expect(screen.queryByText(t('workout.insight.logged'))).toBeNull();
  });
});

// K-973 (ADR-074 #3, ADR-075 #6): after the last move, the cardio the program plans after the weights today is the session's
// last step: Done, Later today or Skip today, then Finish. Time, not calories; the done is kept on the phone first.
describe('the last step: cardio (K-973, ADR-074 #3, ADR-075 #6)', () => {
  const CARDIO: Schemas['ProgramCardio'] = {
    source: 'GENERATED',
    minutes: 30,
    sessionsPerWeek: 3,
    sessions: [{ weekday: 'MONDAY', place: 'AFTER_LIFT' }],
    doneThisWeek: 0,
    afterLiftOverLine: false,
  };
  // One move of one set: the first set done is the last move done. The session's own day is its start's (a Monday).
  const ONE_SET = { ...DAY.exercises[0], baseSets: 1, sets: 1 };
  const serve = (cardio: Schemas['ProgramCardio'] | undefined, extra: Partial<Schemas['Program']> = {}) => {
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, ...extra, cardio, days: [{ ...DAY, exercises: [ONE_SET] }] } } };
  };
  const dock = () => within(screen.getByTestId('dock'));
  const cardioRecords = () => mockRecord.mock.calls.map(([o]) => o).filter((o) => o.kind === 'cardio');
  const lastSet = async () => fireEvent.press(await screen.findByRole('button', { name: t('workout.log', { number: 1 }) }));
  const toCardio = async () => {
    await lastSet();
    await fireEvent.press(await dock().findByRole('button', { name: t('workout.cardio.next') }));
  };
  beforeEach(() => serve(CARDIO));

  test('after the last move the dock says Next: cardio instead of Finish workout', async () => {
    await show();
    await lastSet();
    expect(await dock().findByRole('button', { name: t('workout.cardio.next') })).toBeOnTheScreen();
    expect(dock().queryByRole('button', { name: t('workout.finish') })).toBeNull();
  });

  test('the step: cardio, easy, its minutes, the pace; Done, Later today, Skip today, Finish; no calorie number', async () => {
    await show();
    await toCardio();
    expect(screen.getByText(t('workout.cardio.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.cardio.length', { minutes: 30 }))).toBeOnTheScreen();
    expect(screen.getByText(t('workout.cardio.talk'))).toBeOnTheScreen();
    expect(dock().getByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) })).toBeOnTheScreen();
    expect(dock().getByRole('button', { name: t('workout.cardio.later') })).toBeOnTheScreen();
    expect(dock().getByRole('button', { name: t('workout.cardio.skip') })).toBeOnTheScreen();
    expect(dock().getByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
    expect(screen.queryByText(/kcal|calorie/i)).toBeNull();
  });

  test('Done is kept on the phone first: the day, the minutes, typed; offline too; and said', async () => {
    mockData = { ...mockData, kept: true };
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    try {
      await show();
      await toCardio();
      await fireEvent.press(dock().getByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) }));
      expect(cardioRecords()).toEqual([{ kind: 'cardio', body: { clientId: expect.any(String), day: '2026-09-28', minutes: 30, source: 'MANUAL' } }]);
      expect(await screen.findByText(t('workout.cardio.loggedSaid', { minutes: 30 }))).toBeOnTheScreen();
      expect(said).toHaveBeenCalledWith(t('workout.cardio.loggedSaid', { minutes: 30 }));
      expect(mockPOST).not.toHaveBeenCalled();
      // Done once: it is not offered again, and the way on is Finish.
      expect(dock().queryByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) })).toBeNull();
      expect(dock().getByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
    } finally {
      said.mockRestore();
    }
  });

  test('two taps in one frame log it once', async () => {
    await show();
    await toCardio();
    const done = dock().getByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) });
    await fireEvent.press(done);
    await fireEvent.press(done);
    expect(cardioRecords()).toHaveLength(1);
  });

  test('Later today and Skip today send nothing and need no catch-up; Finish is the way on', async () => {
    await show();
    await toCardio();
    await fireEvent.press(dock().getByRole('button', { name: t('workout.cardio.later') }));
    expect(screen.getByText(t('workout.cardio.laterSaid'))).toBeOnTheScreen();
    await fireEvent.press(dock().getByRole('button', { name: t('workout.cardio.skip') }));
    expect(screen.getByText(t('workout.cardio.skipSaid'))).toBeOnTheScreen();
    expect(screen.queryByText(t('workout.cardio.laterSaid'))).toBeNull();
    expect(cardioRecords()).toEqual([]);
    expect(dock().getByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
  });

  // Final walk of phase 7 (#684): a choice can be taken back, and one primary button shows at a time.
  const filled = () => screen.getAllByRole('button').filter((b) => StyleSheet.flatten(b.props.style)?.backgroundColor === focusPalette.cta).map((b) => b.props.accessibilityLabel);

  test('Later today and Skip today offer Undo (the Undo bar), and undone, the step is as it was', async () => {
    await show();
    await toCardio();
    await fireEvent.press(dock().getByRole('button', { name: t('workout.cardio.later') }));
    const bar = within(screen.getByTestId('undo-bar'));
    expect(bar.getByText(t('workout.cardio.laterSaid'))).toBeOnTheScreen();
    expect(screen.getAllByText(t('workout.cardio.laterSaid'))).toHaveLength(1);
    await fireEvent.press(bar.getByRole('button', { name: t('workout.undoLabel') }));
    expect(screen.queryByTestId('undo-bar')).toBeNull();
    expect(screen.queryByText(t('workout.cardio.laterSaid'))).toBeNull();
    await fireEvent.press(dock().getByRole('button', { name: t('workout.cardio.skip') }));
    expect(within(screen.getByTestId('undo-bar')).getByText(t('workout.cardio.skipSaid'))).toBeOnTheScreen();
  });

  test('one primary button at a time: Done until a choice is made, then Finish workout', async () => {
    await show();
    await toCardio();
    expect(filled()).toEqual([t('workout.cardio.done', { minutes: 30 })]);
    await fireEvent.press(dock().getByRole('button', { name: t('workout.cardio.later') }));
    expect(filled()).toEqual([t('workout.finish')]);
  });

  test('a choice made, Next: cardio does not come back; the moves are one tap away on their dots', async () => {
    await show();
    await toCardio();
    await fireEvent.press(dock().getByRole('button', { name: t('workout.cardio.skip') }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp('^Bench press, ') }));
    expect(screen.getByTestId('move-head')).toBeOnTheScreen();
    expect(dock().queryByRole('button', { name: t('workout.cardio.next') })).toBeNull();
    expect(dock().getByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
  });

  test('Finish from the step finishes the workout (the form question first, as always)', async () => {
    await show();
    await toCardio();
    await fireEvent.press(dock().getByRole('button', { name: t('workout.finish') }));
    expect(await screen.findByText(t('workout.form.title'))).toBeOnTheScreen();
  });

  test('a cardio that cannot be kept is said, and the step stays', async () => {
    await show();
    await toCardio();
    mockRecord.mockImplementationOnce(async () => {
      throw new Error('disk');
    });
    await fireEvent.press(dock().getByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) }));
    expect(await screen.findByText(t('workout.cardio.failed'))).toBeOnTheScreen();
    expect(dock().getByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) })).toBeEnabled();
  });

  describe('Done taken back, and Done kept once (review)', () => {
    const done = () => dock().getByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) });
    const undo = () => screen.queryByRole('button', { name: t('workout.cardio.undoLabel') });
    const cardioStored = () => mockRecords.filter((r) => r.kind === 'cardio');

    test('Done not sent yet has an Undo: the record is forgotten, the step is as before, and it is said', async () => {
      const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      try {
        mockData = { ...mockData, kept: true };
        await show();
        await toCardio();
        await fireEvent.press(done());
        await screen.findByText(t('workout.cardio.loggedSaid', { minutes: 30 }));
        const button = undo();
        expect(button).toBeOnTheScreen();
        expect(button).toHaveStyle({ minHeight: tokens.size.touch });
        await fireEvent.press(button as NonNullable<typeof button>);
        expect(mockServices.workoutEdits.forgetUnsent).toHaveBeenCalledWith(cardioRecords()[0].body.clientId);
        expect(cardioStored()).toEqual([]);
        expect(said).toHaveBeenCalledWith(t('workout.cardio.undoneSaid'));
        expect(await dock().findByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) })).toBeEnabled();
        expect(screen.queryByText(t('workout.cardio.loggedSaid', { minutes: 30 }))).toBeNull();
        expect(undo()).toBeNull();
        // Done again after taking it back: one record on the phone.
        await fireEvent.press(done());
        await waitFor(() => expect(cardioStored()).toHaveLength(1));
      } finally {
        said.mockRestore();
      }
    });

    test('Done already sent has no Undo: the contract has no delete for it', async () => {
      await show();
      await toCardio();
      mockRecord.mockImplementationOnce(async (o) => {
        await keep(o);
        mockRecords = mockRecords.map((r) => (r.kind === 'cardio' ? { ...r, state: 'SYNCED' } : r));
        return true;
      });
      await fireEvent.press(done());
      await screen.findByText(t('workout.cardio.loggedSaid', { minutes: 30 }));
      await waitFor(() => expect(undo()).toBeNull()); // once the record is read back as sent
      expect(dock().getByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
    });

    test('sent while the Undo was on the screen: it says so and the cardio stays logged', async () => {
      await show();
      await toCardio();
      await fireEvent.press(done());
      await screen.findByText(t('workout.cardio.loggedSaid', { minutes: 30 }));
      mockServices.workoutEdits.forgetUnsent.mockImplementationOnce(async () => false);
      await fireEvent.press(undo() as NonNullable<ReturnType<typeof undo>>);
      expect(await screen.findByText(t('workout.cardio.undoLate'))).toBeOnTheScreen();
      expect(cardioStored()).toHaveLength(1);
      expect(dock().queryByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) })).toBeNull();
    });

    test('the record kept but the records not read back: Done is not offered again, and a second tap is not a second cardio', async () => {
      await show();
      await toCardio();
      mockWorkoutRecords.mockImplementationOnce(async () => {
        throw new Error('read');
      });
      await fireEvent.press(done());
      await screen.findByText(t('workout.cardio.loggedSaid', { minutes: 30 }));
      expect(dock().queryByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) })).toBeNull();
      expect(cardioStored()).toHaveLength(1);
    });

    test('a save that failed and is tried again is the same cardio: one clientId, however many taps', async () => {
      await show();
      await toCardio();
      mockRecord.mockImplementationOnce(async () => {
        throw new Error('disk'); // it may have reached the store before it failed: the id must not change
      });
      await fireEvent.press(done());
      expect(await screen.findByText(t('workout.cardio.failed'))).toBeOnTheScreen();
      await fireEvent.press(done());
      await screen.findByText(t('workout.cardio.loggedSaid', { minutes: 30 }));
      const ids = cardioRecords().map((o) => o.body.clientId);
      expect(ids).toHaveLength(2);
      expect(ids[1]).toBe(ids[0]);
      expect(cardioStored()).toHaveLength(1);
    });

    test('taken back and logged again, it is a new cardio (a new clientId)', async () => {
      await show();
      await toCardio();
      await fireEvent.press(done());
      await screen.findByText(t('workout.cardio.loggedSaid', { minutes: 30 }));
      await fireEvent.press(undo() as NonNullable<ReturnType<typeof undo>>);
      await fireEvent.press(await dock().findByRole('button', { name: t('workout.cardio.done', { minutes: 30 }) }));
      await waitFor(() => expect(cardioStored()).toHaveLength(1));
      const ids = cardioRecords().map((o) => o.body.clientId);
      expect(ids).toHaveLength(2);
      expect(ids[1]).not.toBe(ids[0]);
    });
  });

  describe('a workout discarded with cardio logged in it (ADR-075 Ek 9): the cardio is its own record and stays, and it says so', () => {
    const end = async () => fireEvent.press(await screen.findByRole('button', { name: t('workout.endLabel') }));
    const choose = (key: string) => fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t(key)}`) }));

    test('the discard says the cardio stays, and so does the page after it; nothing is deleted of the cardio', async () => {
      mockRecords = [
        ...mockRecords,
        record('set', 'b1', { clientId: 'b1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps: 8, rir: 1, side: 'BOTH' }, 'w1'),
        record('cardio', 'c1', { clientId: 'c1', day: '2026-09-28', minutes: 30, source: 'MANUAL' }),
      ];
      await show();
      await end();
      expect(screen.getByText(t('workout.ending.discardNoteCardio'))).toBeOnTheScreen();
      expect(screen.queryByText(t('workout.ending.discardNote'))).toBeNull();
      await choose('workout.ending.discard');
      await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
      expect(await screen.findByText(t('workout.ending.discardedCardio'))).toBeOnTheScreen();
      expect(mockRecords.filter((r) => r.kind === 'cardio')).toHaveLength(1);
    });

    test('without a cardio logged, nothing is written under Discard ("nothing is saved" goes without saying)', async () => {
      mockRecords = [
        ...mockRecords,
        record('set', 'b1', { clientId: 'b1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps: 8, rir: 1, side: 'BOTH' }, 'w1'),
      ];
      await show();
      await end();
      expect(screen.queryByText(t('workout.ending.discardNote'))).toBeNull();
      expect(screen.queryByText(t('workout.ending.discardNoteCardio'))).toBeNull();
    });
  });

  test('already logged today (the step was done and the screen opened again): straight to Finish', async () => {
    mockRecords = [
      ...mockRecords,
      record('cardio', 'c1', { clientId: 'c1', day: '2026-09-28', minutes: 30, source: 'MANUAL' }),
    ];
    await show();
    await lastSet();
    expect(await dock().findByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
    expect(dock().queryByRole('button', { name: t('workout.cardio.next') })).toBeNull();
  });

  test('the short version says the cardio is optional today', async () => {
    serve(CARDIO, { week: [{ programDayId: 'day-a', date: '2026-09-28', exerciseIds: ['bench_press'], short: true }] });
    await show();
    await toCardio();
    expect(screen.getByText(t('workout.cardio.optional'))).toBeOnTheScreen();
  });

  test('no step where the program has none that day: no cardio, turned off, another weekday, an easy day with no weights', async () => {
    for (const cardio of [
      undefined,
      { ...CARDIO, sessionsPerWeek: 0, sessions: [] },
      { ...CARDIO, sessions: [{ weekday: 'TUESDAY' as const, place: 'AFTER_LIFT' as const }] },
      { ...CARDIO, sessions: [{ weekday: 'MONDAY' as const, place: 'OFF_DAY_LOW_INTENSITY' as const }] },
    ]) {
      serve(cardio);
      await show();
      await lastSet();
      expect(await dock().findByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
      expect(dock().queryByRole('button', { name: t('workout.cardio.next') })).toBeNull();
      await screen.unmount();
      mockRecords = [...lastWeek(), record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' })];
    }
  });

  test('no step before the last move is done', async () => {
    serve(CARDIO);
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, cardio: CARDIO, days: [DAY] } } };
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.log', { number: 1 }) }));
    expect(screen.queryByText(t('workout.cardio.next'))).toBeNull();
  });
});

// K-1013 PR B (10 Oct walkthrough, round 3): the session's small findings.
describe('walkthrough round 3: the session (K-1013)', () => {
  const rowName = t('exercises.one_arm_dumbbell_row.name');

  describe("a superset partner picked keeps the move's links in one piece", () => {
    const linked = async () => {
      await show();
      await more(t('superset.link'));
      await fireEvent.press(screen.getByRole('button', { name: t('superset.pick', { name: rowName }) }));
    };

    test('the partner line has a line of its own under the one row of links; Not a superset and Skip move are rows of the More menu', async () => {
      await linked();
      const head = within(screen.getByTestId('move-head'));
      const line = head.getByText(t('superset.with', { names: rowName }));
      // Across the whole line, under the links (never squeezed beside them, where it broke the other labels into letters).
      expect(line).toHaveStyle({ flexBasis: '100%' });
      expect(head.queryByRole('button', { name: t('superset.unlink') })).toBeNull();
      await openMore();
      const unlink = head.getByRole('button', { name: t('superset.unlink') });
      const skip = head.getByRole('button', { name: t('workout.skipMoveLabel', { name: 'Bench press' }) });
      expect(unlink).toHaveStyle({ minHeight: tokens.size.touch });
      expect(skip).toHaveStyle({ minHeight: tokens.size.touch });
      // Both are rows of the one menu.
      expect(unlink.parent).toBe(skip.parent);
      expect(within(screen.getByTestId('more-menu')).getByRole('button', { name: t('superset.unlink') })).toBe(unlink);
    });

    test('Not a superset still takes the link away, and Skip move is still there', async () => {
      await linked();
      await more(t('superset.unlink'));
      expect(screen.queryByText(t('superset.with', { names: rowName }))).toBeNull();
      await openMore();
      expect(screen.getByRole('button', { name: t('superset.link') })).toBeOnTheScreen();
      expect(within(screen.getByTestId('move-head')).getByRole('button', { name: t('workout.skipMoveLabel', { name: 'Bench press' }) })).toBeOnTheScreen();
    });
  });

  describe('a bodyweight move (pull-up): no weight to pick, no warm-up to log', () => {
    const PULL = { id: 'pull_up', nameKey: 'exercises.pull_up.name', load: 'BODYWEIGHT_PLUS_EXTERNAL', unilateral: false } as Schemas['Exercise'];
    const PUSH = { id: 'push_up', nameKey: 'exercises.push_up.name', load: 'BODYWEIGHT', unilateral: false } as Schemas['Exercise'];
    const serve = (exerciseId: string) => {
      mockData = {
        ...mockData,
        exercises: { state: 'ready', value: [...EXERCISES, PULL, PUSH] },
        program: {
          state: 'ready',
          // No target of its own (its first session): where "Pick a weight" used to be said.
          value: { ...PROGRAM, days: [{ ...DAY, exercises: [{ exerciseId, baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, calibrationStepKg: 2.5 }, DAY.exercises[1]] }] },
        },
      };
    };

    test.each(['pull_up', 'push_up'])('%s: the target line does not tell the person to pick a weight', async (id) => {
      serve(id);
      await show();
      const goal = within(await screen.findByTestId('goal'));
      expect(goal.getByText(t('workout.goal.first'))).toBeOnTheScreen();
      expect(goal.queryByText(t('workout.goal.pick'))).toBeNull();
      expect(screen.queryByText(t('workout.pick.why'))).toBeNull();
    });

    test.each(['pull_up', 'push_up'])('%s: no warm-up line, though it is the first move of the day', async (id) => {
      serve(id);
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(screen.queryByText(t('workout.warmup.title'))).toBeNull();
    });

    const withPlanned = (extra: Partial<Schemas['PlannedExercise']>) => {
      serve('pull_up');
      const day = (mockData.program as { value: Schemas['Program'] }).value.days[0];
      mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [{ ...day, exercises: [{ ...day.exercises[0], ...extra }, day.exercises[1]] }] } } };
    };

    test('a pull-up with a weight added (the server has +20 kg for it) keeps its warm-up: one easy set, the body alone', async () => {
      withPlanned({ nextLoadKg: 20, nextReps: 6 });
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(screen.getByText(t('workout.warmup.title'))).toBeOnTheScreen();
      expect(screen.getByText(t('workout.warmup.log', { number: 1 }))).toBeOnTheScreen();
    });

    test("last time's best set with a weight added is a known added load too", async () => {
      withPlanned({ lastBestSet: { loadKg: 10, reps: 6, rir: 1 } });
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(screen.getByText(t('workout.warmup.title'))).toBeOnTheScreen();
    });

    test('a weighted move (the bench) keeps its warm-ups and its weight to pick', async () => {
      mockData = {
        ...mockData,
        program: { state: 'ready', value: { ...PROGRAM, days: [{ ...DAY, exercises: [{ exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, calibrationStepKg: 2.5 }, DAY.exercises[1]] }] } },
      };
      await show();
      const goal = within(await screen.findByTestId('goal'));
      expect(goal.getByText(t('workout.goal.pick'))).toBeOnTheScreen();
      expect(screen.getByText(t('workout.warmup.title'))).toBeOnTheScreen();
    });
  });

  describe('a skip is said on the weights, not on the cardio step; a discarded session is not paused', () => {
    const ONE_SET = { ...DAY.exercises[0], baseSets: 1, sets: 1 };
    const CARDIO: Schemas['ProgramCardio'] = {
      source: 'GENERATED',
      minutes: 30,
      sessionsPerWeek: 3,
      sessions: [{ weekday: 'MONDAY', place: 'AFTER_LIFT' }],
      doneThisWeek: 0,
      afterLiftOverLine: false,
    };

    test('Skip move, then on to the cardio: the skipped band was there, and is gone on the cardio step', async () => {
      // The cardio comes after a session with a work set: the bench done, the row skipped.
      mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, cardio: CARDIO, days: [{ ...DAY, exercises: [ONE_SET, { ...DAY.exercises[1], baseSets: 1, sets: 1 }] }] } } };
      await show();
      await fireEvent.press(await screen.findByRole('button', { name: t('workout.log', { number: 1 }) }));
      await fireEvent.press(await screen.findByRole('button', { name: t('workout.next', { name: rowName }) }));
      await more(t('workout.skipMoveLabel', { name: rowName }));
      expect(await screen.findByText(t('workout.moveSkipped'))).toBeOnTheScreen();
      await fireEvent.press(await within(screen.getByTestId('dock')).findByRole('button', { name: t('workout.cardio.next') }));
      expect(screen.getByText(t('workout.cardio.title'))).toBeOnTheScreen();
      expect(screen.queryByText(t('workout.moveSkipped'))).toBeNull();
      expect(screen.queryByRole('button', { name: t('workout.undoLabel') })).toBeNull();
      // Back to the weights by a dot: the skip is said by its move, the old Undo band does not come back.
      await pickMove(rowName);
      expect(await screen.findByText(t('workout.moveIsSkipped'))).toBeOnTheScreen();
      expect(screen.queryByText(t('workout.moveSkipped'))).toBeNull();
      expect(screen.queryByRole('button', { name: t('workout.undoLabel') })).toBeNull();
    });

    test('discarded while paused: no "Paused" band over the Undo screen', async () => {
      const startedAt = new Date(Date.now() - 20 * 60_000).toISOString();
      mockRecords = [
        ...lastWeek(),
        record('workout', 'w2', { clientId: 'w2', startedAt, programDayId: 'day-a' }),
        record('set', 'b1', { clientId: 'b1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps: 8, rir: 1, side: 'BOTH' }, 'w2'),
      ];
      mockPause = { workout: 'w2', pause: { pausedAt: Date.now() - 60_000, pausedMs: 0 } };
      await show();
      expect(await screen.findByText(t('workout.paused'))).toBeOnTheScreen(); // paused to begin with
      expect(screen.getByTestId('session-clock').props.accessibilityLabel).toMatch(/paused/);
      await fireEvent.press(screen.getByRole('button', { name: t('workout.endLabel') }));
      await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t('workout.ending.discard')}`) }));
      await fireEvent.press(screen.getByRole('button', { name: t('workout.ending.confirm') }));
      expect(await screen.findByText(t('workout.ending.discarded'))).toBeOnTheScreen();
      expect(screen.queryByText(t('workout.paused'))).toBeNull();
      // The clock in the header is not "paused" either, nor is Resume offered.
      expect(screen.getByTestId('session-clock').props.accessibilityLabel).not.toMatch(/paused/);
      expect(screen.queryByRole('button', { name: t('workout.resumeLabel') })).toBeNull();
    });
  });

  describe('"Add a move" lists the catalog before anything is typed', () => {
    const LAT = { id: 'lat_pulldown', nameKey: 'exercises.lat_pulldown.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    const CURL = { id: 'dumbbell_curl', nameKey: 'exercises.dumbbell_curl.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
    beforeEach(() => {
      mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, LAT, CURL] } };
    });
    const pick = (name: string) => screen.queryByRole('button', { name: t('workout.add.pick', { name }) });

    test('opened, the moves not in the session are there by name; typing narrows them; clearing brings them back', async () => {
      await show();
      await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
      expect(pick(t('exercises.lat_pulldown.name'))).toBeOnTheScreen();
      expect(pick(t('exercises.dumbbell_curl.name'))).toBeOnTheScreen();
      expect(pick('Bench press')).toBeNull(); // already in the session
      expect(screen.queryByText(t('workout.add.none'))).toBeNull();
      await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'lat');
      expect(pick(t('exercises.dumbbell_curl.name'))).toBeNull();
      await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), '');
      expect(pick(t('exercises.dumbbell_curl.name'))).toBeOnTheScreen();
    });

    test('Close is above the list, not at the foot of it', async () => {
      await show();
      await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
      const order = (node: unknown): string[] =>
        typeof node === 'string' ? [node] : Array.isArray(node) ? node.flatMap(order) : order((node as { children?: unknown } | null)?.children ?? []);
      const texts = order(screen.toJSON());
      expect(texts.indexOf(t('workout.add.close'))).toBeGreaterThan(-1);
      expect(texts.indexOf(t('workout.add.close'))).toBeLessThan(texts.indexOf(t('exercises.lat_pulldown.name')));
    });

    test('a move picked from the list is added like a found one', async () => {
      await show();
      await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
      await fireEvent.press(screen.getByRole('button', { name: t('workout.add.pick', { name: t('exercises.lat_pulldown.name') }) }));
      expect(await screen.findByRole('button', { name: new RegExp(`^${t('exercises.lat_pulldown.name')}, `) })).toBeOnTheScreen();
    });
  });
});

// A workout the server had open that this phone kept as its own (K-999, openSession.ts): the server's clientIds, SYNCED with its ids.
describe('continued from the server (K-999)', () => {
  const kept = () => {
    const startedAt = new Date(Date.now() - 30 * 60_000).toISOString();
    mockRecords = [
      ...lastWeek(),
      { ...record('workout', 'other-phone-w', { clientId: 'other-phone-w', startedAt, programDayId: 'day-a' }), serverId: 'srv-w' },
      {
        ...record('set', 'other-phone-s1', { clientId: 'other-phone-s1', exerciseId: 'bench_press', setType: 'WORKING', loadKg: 62.5, reps: 6, rir: 2, side: 'BOTH' }, 'other-phone-w'),
        serverId: 'srv-s1',
      },
    ];
  };

  test("opens on the server's sets: the first is done, the next is the second", async () => {
    kept();
    await show();
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeOnTheScreen();
  });

  test("the next set goes under the server's workout, and the set the server has is not logged again", async () => {
    kept();
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 2 })));
    expect(sets()).toHaveLength(1);
    const [next] = sets();
    expect(next.workoutClientId).toBe('other-phone-w');
    expect(next.body.clientId).not.toBe('other-phone-s1');
    expect(mockRecord.mock.calls.map(([o]) => o.kind)).not.toContain('workout');
  });
});

// K-1047 (ADR-070 Ek 2 #1, #5; prototype 8): the set card on the one Stepper, the header's More menu, the keyboard after a set.
describe('the workout screen on the system (K-1047)', () => {
  const loadField = () => screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') }));
  const repsField = () => screen.getByLabelText(t('workout.repsLabel'));

  describe("the move's icon says only its equipment class (ADR-070 Ek 2 #3)", () => {
    test('a move whose equipment the catalog knows has the icon of that class', async () => {
      mockData = { ...mockData, exercises: { state: 'ready', value: EXERCISES.map((m) => ({ ...m, equipment: 'DUMBBELL' })) as Schemas['Exercise'][] } };
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(within(screen.getByTestId('move-head')).getByTestId('move-thumb-DUMBBELL', { includeHiddenElements: true })).toBeTruthy(); // hidden from VoiceOver: the name is beside it
    });

    test('a move with no equipment known has none: no guessed icon', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(within(screen.getByTestId('move-head')).queryByTestId(/^move-thumb-/, { includeHiddenElements: true })).toBeNull();
    });
  });

  describe('More', () => {
    test('opens a menu with Superset with… and Skip move, and closes with a second tap or a choice', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(screen.queryByTestId('more-menu')).toBeNull();
      await openMore();
      const menu = within(screen.getByTestId('more-menu'));
      expect(menu.getByText(t('superset.link'))).toBeOnTheScreen();
      expect(menu.getByText(t('workout.skipMove'))).toBeOnTheScreen();
      expect(menu.getAllByRole('button')).toHaveLength(2);
      await openMore();
      expect(screen.queryByTestId('more-menu')).toBeNull();
      await more(t('superset.link'));
      expect(screen.queryByTestId('more-menu')).toBeNull(); // a choice closes it
      expect(screen.getByText(t('superset.choose'))).toBeOnTheScreen();
    });

    test('Skip move from the menu skips the move, as it did as a link', async () => {
      await show();
      await more(t('workout.skipMoveLabel', { name: 'Bench press' }));
      expect(screen.getByText(t('workout.moveSkipped'))).toBeOnTheScreen();
      expect(sets()).toEqual([]);
    });

    test('another move starts with the menu closed', async () => {
      await show();
      await openMore();
      await pickMove(t('exercises.one_arm_dumbbell_row.name'));
      expect(screen.queryByTestId('more-menu')).toBeNull();
    });

    test('a move outside the plan has only Superset in More: no Skip move, there is no count', async () => {
      const LAT = { id: 'lat_pulldown', nameKey: 'exercises.lat_pulldown.name', load: 'EXTERNAL', unilateral: false } as Schemas['Exercise'];
      mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, LAT] } };
      await show();
      await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
      await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'lat');
      await fireEvent.press(screen.getByRole('button', { name: t('workout.add.pick', { name: t('exercises.lat_pulldown.name') }) }));
      await openMore();
      const menu = within(screen.getByTestId('more-menu'));
      expect(menu.getAllByRole('button')).toHaveLength(1);
      expect(menu.getByText(t('superset.link'))).toBeOnTheScreen();
    });
  });

  describe('the set card: the shared Stepper for the weight and the reps', () => {
    test('both are adjustable controls with the Stepper\'s own buttons, the weight with its unit', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      for (const field of [loadField(), repsField()]) expect(field.props.accessibilityRole).toBe('adjustable');
      expect(loadField().props.accessibilityValue).toEqual({ text: '62.5 kg' });
      for (const which of ['moreLoad', 'lessLoad', 'moreReps', 'lessReps'] as const) expect(screen.getByRole('button', { name: stepName(which) })).toBeOnTheScreen();
      // VoiceOver steps them the way the buttons do (the gym's loads, the reps one at a time).
      await fireEvent(loadField(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
      expect(loadField().props.value).toBe('65');
      await fireEvent(repsField(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
      expect(repsField().props.value).toBe('5');
    });

    test('typing allows a comma or a dot: "62,5" is 62.5, and is what is logged', async () => {
      await show();
      await fireEvent(await screen.findByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), 'focus');
      await fireEvent.changeText(loadField(), '62,5');
      expect(loadField().props.value).toBe('62,5'); // as typed, while it is typed
      await fireEvent(loadField(), 'blur');
      expect(loadField().props.value).toBe('62.5');
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(sets()[0].body).toMatchObject({ loadKg: 62.5 });
    });

    test('a weight with two decimals is kept as typed (11.34 kg is a 25 lb dumbbell)', async () => {
      await show();
      await fireEvent.changeText(await screen.findByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '11,34');
      await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
      expect(sets()[0].body).toMatchObject({ loadKg: 11.34 });
    });

    test('a tap on + with the keyboard still up shows the new weight, not what was typed', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await fireEvent(loadField(), 'focus');
      await fireEvent.changeText(loadField(), '50');
      expect(loadField().props.value).toBe('50');
      await fireEvent.press(screen.getByRole('button', { name: stepName('moreLoad') }));
      expect(loadField().props.value).toBe('52.5');
    });

    test('reps left stays 0, 1 and 2+ under the steppers, and the one primary is Log set', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      for (const choice of ['0', '1', '2+']) expect(screen.getByRole('button', { name: choice })).toBeOnTheScreen();
      const filled = screen.getAllByRole('button').filter((b) => StyleSheet.flatten(b.props.style)?.backgroundColor === focusPalette.cta);
      expect(filled.map((b) => b.props.accessibilityLabel)).toEqual([t('workout.log', { number: 1 })]);
    });
  });

  describe('the keyboard', () => {
    test('Log set dismisses it, so it does not cover the next set', async () => {
      const dismiss = jest.spyOn(Keyboard, 'dismiss');
      try {
        await show();
        await fireEvent.changeText(await screen.findByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '60');
        expect(dismiss).not.toHaveBeenCalled();
        await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
        await screen.findByText(t('workout.log', { number: 2 }));
        expect(dismiss).toHaveBeenCalledTimes(1);
      } finally {
        dismiss.mockRestore();
      }
    });

    test('a set that was not logged (no reps) keeps it: the numbers still need fixing', async () => {
      const dismiss = jest.spyOn(Keyboard, 'dismiss');
      try {
        await show();
        await fireEvent.changeText(await screen.findByLabelText(t('workout.repsLabel')), '');
        await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
        expect(await screen.findByText(t('workout.invalid'))).toBeOnTheScreen();
        expect(dismiss).not.toHaveBeenCalled();
      } finally {
        dismiss.mockRestore();
      }
    });
  });
});

// K-1048 (ADR-070 Ek 2 #1; prototype 8): the first view of a set. The set card through "Reps left" is above the dock on an
// iPhone SE (375 x 667), where the page had a band for a rest that was not there, labels over the steppers, and Skip set
// under Log set. Layout is not measured in Jest: these hold the structure that makes the room, and the reveal that is the
// guarantee when the room is still short (a move with warm-ups, a larger text size).
describe('the first view of a set (K-1048)', () => {
  const dock = () => within(screen.getByTestId('dock'));
  const card = () => within(screen.getByTestId('active-set'));
  const TARGET: Schemas['PlannedExercise'] = { ...DAY.exercises[0], lighterLoadKg: 60, heavierLoadKg: 65 };
  const layout = (testID: string, frame: { y?: number; height: number }) =>
    act(async () => {
      fireEvent(screen.getByTestId(testID), 'layout', { nativeEvent: { layout: { x: 0, y: frame.y ?? 0, width: 375, height: frame.height } } });
    });
  const scrolls = jest.spyOn(ScrollView.prototype, 'scrollTo');
  beforeEach(() => scrolls.mockClear());

  test('Log set and Skip set share one row of the dock: the dock is one button tall, not two', async () => {
    await show();
    const log = await screen.findByRole('button', { name: t('workout.log', { number: 1 }) });
    const skip = dock().getByRole('button', { name: t('workout.skipSetLabel') });
    const row = within(screen.getByTestId('dock-row'));
    expect(row.getByRole('button', { name: t('workout.log', { number: 1 }) })).toBe(log);
    expect(row.getByRole('button', { name: t('workout.skipSetLabel') })).toBe(skip);
    expect(StyleSheet.flatten(screen.getByTestId('dock-row').props.style)).toMatchObject({ flexDirection: 'row' });
    expect(skip).toHaveStyle({ minHeight: tokens.size.touch });
  });

  test('the weight and the reps are compact steppers: the field is named in the box, with no label line above it', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    const boxes = card().getAllByTestId('stepper-box');
    expect(boxes).toHaveLength(2);
    for (const box of boxes) expect(StyleSheet.flatten(box.props.style).padding).toBe(tokens.space.xs);
    const weight = t('workout.loadLabel', { unit: t('units.kgUnit') });
    expect(within(boxes[0]).getByText(weight, { includeHiddenElements: true })).toBeOnTheScreen();
    expect(within(boxes[1]).getByText(t('workout.repsLabel'), { includeHiddenElements: true })).toBeOnTheScreen();
    // The name is said once, by the field; the buttons are still full touch targets.
    expect(screen.getAllByText(weight, { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByRole('button', { name: stepName('moreLoad') })).toHaveStyle({ width: tokens.size.stepperButton, height: tokens.size.stepperButton });
    expect(screen.getByRole('button', { name: stepName('lessReps') })).toHaveStyle({ width: tokens.size.stepperButton, height: tokens.size.stepperButton });
  });

  test('"Reps left" is under the steppers in the card, before the dock', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(card().getByText(t('workout.rir.short'))).toBeOnTheScreen();
    expect(card().getByText(t('workout.targetRir', { max: 1 }))).toBeOnTheScreen();
  });

  test('"Too heavy?" and "Add note" are links of the card\'s head row; the line under the weight is text only', async () => {
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [{ ...DAY, exercises: [TARGET, DAY.exercises[1]] }] } } };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    const head = within(screen.getByTestId('set-head'));
    expect(head.getByText(t('workout.setOf', { number: 1, count: 3 }))).toBeOnTheScreen();
    expect(head.getByRole('button', { name: t('workout.tooHeavy.label') })).toHaveStyle({ minHeight: tokens.size.touch });
    expect(head.getByRole('button', { name: t('workout.note.add') })).toHaveStyle({ minHeight: tokens.size.touch });
    expect(StyleSheet.flatten(screen.getByTestId('set-head').props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
  });

  describe('the set card is brought into view when it would end under the dock', () => {
    const SE_VIEWPORT = 478; // 667 - status bar 20 - header 54 - dock 115, by the tokens (the dock is one button tall now)
    test('hidden by 120 pt: the page scrolls by that, with a little air', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await layout('session-scroll', { height: SE_VIEWPORT });
      await layout('active-set', { y: 230, height: 340 }); // ends at 570, 92 under the viewport's bottom
      expect(scrolls).toHaveBeenLastCalledWith({ y: 570 + tokens.space.sm - SE_VIEWPORT, animated: false });
    });

    test('it fits: the page is not moved', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await layout('session-scroll', { height: 691 }); // a Pro Max
      await layout('active-set', { y: 230, height: 340 });
      expect(scrolls).not.toHaveBeenCalled();
    });

    test('the viewport shrinks (the rest shows, the keyboard comes): it is brought into view again', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await layout('session-scroll', { height: 640 });
      await layout('active-set', { y: 230, height: 340 });
      expect(scrolls).not.toHaveBeenCalled();
      await layout('session-scroll', { height: 500 });
      expect(scrolls).toHaveBeenLastCalledWith({ y: 570 + tokens.space.sm - 500, animated: false });
    });

    test('a person who scrolled it into view already is not pulled', async () => {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      await layout('session-scroll', { height: SE_VIEWPORT });
      await act(async () => {
        fireEvent.scroll(screen.getByTestId('session-scroll'), { nativeEvent: { contentOffset: { x: 0, y: 300 } } });
      });
      await layout('active-set', { y: 230, height: 340 });
      expect(scrolls).not.toHaveBeenCalled();
    });
  });
});

// Taken, in the workout (ADR-090 Ek 2, K-1064; G1 K-77): the move's equipment is busy; do it later, or a few moves of the same
// muscles on other equipment.
describe('Taken: a move whose equipment is busy', () => {
  const PULLDOWN_DAY: Schemas['ProgramDay'] = {
    id: 'day-a',
    nameKey: 'programDays.upper_a.name',
    weekday: 'MONDAY',
    exercises: [
      {
        exerciseId: 'lat_pulldown',
        baseSets: 3,
        sets: 3,
        reps: { min: 8, max: 12 },
        targetRir: 1,
        swapOptions: ['pull_up', 'close_grip_lat_pulldown', 'barbell_row', 'chest_supported_row', 'one_arm_dumbbell_row', 'seated_row'],
        swapTables: [
          { exerciseId: 'pull_up' },
          { exerciseId: 'close_grip_lat_pulldown' },
          { exerciseId: 'barbell_row' },
          { exerciseId: 'chest_supported_row', lastBestSet: { loadKg: 40, reps: 10, rir: 1 }, lighterLoadKg: 37.5, heavierLoadKg: 42.5, calibrationStepKg: 2.5 },
          { exerciseId: 'one_arm_dumbbell_row' },
          { exerciseId: 'seated_row' },
        ],
      },
      { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 62.5, nextReps: 6 },
      { exerciseId: 'overhead_press', baseSets: 2, sets: 2, reps: { min: 6, max: 10 }, targetRir: 1 },
    ],
  };
  const CATALOG = [
    { id: 'lat_pulldown', load: 'EXTERNAL', unilateral: false, equipment: 'CABLE' },
    { id: 'close_grip_lat_pulldown', load: 'EXTERNAL', unilateral: false, equipment: 'CABLE' },
    { id: 'seated_row', load: 'EXTERNAL', unilateral: false, equipment: 'CABLE' },
    { id: 'pull_up', load: 'BODYWEIGHT_PLUS_EXTERNAL', unilateral: false, equipment: 'BODYWEIGHT' },
    { id: 'barbell_row', load: 'EXTERNAL', unilateral: false, equipment: 'BARBELL' },
    { id: 'chest_supported_row', load: 'EXTERNAL', unilateral: false, equipment: 'MACHINE' },
    { id: 'one_arm_dumbbell_row', load: 'EXTERNAL', unilateral: true, equipment: 'DUMBBELL' },
    { id: 'bench_press', load: 'EXTERNAL', unilateral: false, equipment: 'BARBELL' },
    { id: 'overhead_press', load: 'EXTERNAL', unilateral: false, equipment: 'BARBELL' },
  ] as Schemas['Exercise'][];
  const PULLDOWN = t('exercises.lat_pulldown.name');
  const PULL_UP = t('exercises.pull_up.name');
  const CHEST_ROW = t('exercises.chest_supported_row.name');
  const DB_ROW = t('exercises.one_arm_dumbbell_row.name');
  const BARBELL_ROW = t('exercises.barbell_row.name');
  const CLOSE_GRIP = t('exercises.close_grip_lat_pulldown.name');
  const BENCH = t('exercises.bench_press.name');
  const OVERHEAD = t('exercises.overhead_press.name');
  const head = () => within(screen.getByTestId('move-head'));
  // The dots, in the session's order, by the name each says first.
  const order = () =>
    within(screen.getByTestId('move-dots'))
      .getAllByRole('button')
      .map((b) => String(b.props.accessibilityLabel).split(',')[0]);
  const takenOptions = () => screen.getAllByTestId('taken-option').map((o) => String(o.props.accessibilityLabel));
  const openTaken = async () => fireEvent.press(await screen.findByRole('button', { name: t('taken.openLabel', { move: PULLDOWN }) }));

  beforeEach(() => {
    mockData = {
      program: { state: 'ready', value: { ...PROGRAM, days: [PULLDOWN_DAY] } },
      exercises: { state: 'ready', value: CATALOG },
      kept: false,
    };
    mockRecords = [record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-28T17:00:00Z', programDayId: 'day-a' })];
  });

  test("Taken is on the move's row; one tap opens the sheet: do it later, and at most three moves on other equipment", async () => {
    await show();
    await openTaken();
    expect(screen.getByText(t('taken.title', { move: PULLDOWN }))).toBeOnTheScreen();
    expect(screen.getByTestId('taken-later')).toBeOnTheScreen();
    // Never the cable machines again; the one done before first (the server has a best set of it), then the server's order.
    expect(takenOptions()).toEqual([`${CHEST_ROW}. ${t('taken.done')}`, PULL_UP, BARBELL_ROW]);
    expect(takenOptions().join()).not.toContain(CLOSE_GRIP);
    expect(screen.queryByText(DB_ROW)).toBeNull(); // a fourth is not shown
    // The other swaps are one more tap away.
    expect(screen.getByRole('button', { name: t('taken.more') })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('swap.close') }));
    expect(screen.getByText(t('workout.log', { number: 1 }))).toBeOnTheScreen();
  });

  test('two taps: Taken, then a move on other equipment; it stands in the place and nothing is sent', async () => {
    await show();
    await openTaken();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${PULL_UP}`) }));
    expect(head().getByText(PULL_UP)).toBeOnTheScreen();
    expect(screen.getByText(t('workout.swapped', { name: PULL_UP }))).toBeOnTheScreen();
    expect(mockSwaps).toEqual({ workout: 'w1', swaps: { lat_pulldown: 'pull_up' } });
    expect(mockMore).toEqual({ workout: 'w1', behind: [], taken: ['lat_pulldown'] });
    expect(mockPOST).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  test('the move chosen has the starting point the workout already gives: its own history if it has one, else the first-session rule', async () => {
    await show();
    await openTaken();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${CHEST_ROW}`) }));
    // Done before (the server's table): the weight to start from is its last best set.
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe('40');
    await fireEvent.press(await screen.findByRole('button', { name: t('swap.label', { move: CHEST_ROW }) }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${DB_ROW}`) }));
    // Never done: no weight guessed; the sheet asks to pick it, as for a first session.
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe('');
  });

  test('Undo takes the swap back and the move is not taken any more', async () => {
    await show();
    await openTaken();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${PULL_UP}`) }));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
    expect(head().getByText(PULLDOWN)).toBeOnTheScreen();
    expect(mockMore).toEqual({ workout: 'w1', behind: [], taken: [] });
  });

  test('Do it later: the move goes to the end of today, the next move is under way, and it is said with its Undo', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    try {
      await show();
      await screen.findByText(t('workout.log', { number: 1 }));
      expect(order()).toEqual([PULLDOWN, BENCH, OVERHEAD]);
      await openTaken();
      await fireEvent.press(screen.getByTestId('taken-later'));
      expect(order()).toEqual([BENCH, OVERHEAD, PULLDOWN]);
      expect(head().getByText(BENCH)).toBeOnTheScreen();
      expect(said).toHaveBeenLastCalledWith(t('taken.laterSaid', { name: PULLDOWN }));
      expect(mockMore).toEqual({ workout: 'w1', behind: ['lat_pulldown'], taken: ['lat_pulldown'] });
      await fireEvent.press(screen.getByRole('button', { name: t('workout.undoLabel') }));
      expect(order()).toEqual([PULLDOWN, BENCH, OVERHEAD]);
      expect(head().getByText(PULLDOWN)).toBeOnTheScreen();
      expect(mockMore).toEqual({ workout: 'w1', behind: [], taken: [] });
    } finally {
      said.mockRestore();
    }
  });

  test('kept with the workout: opened again, the order is still the one it was left in', async () => {
    mockSwaps = { workout: 'w1', swaps: {} };
    mockMore = { workout: 'w1', behind: ['lat_pulldown'], taken: ['lat_pulldown'] };
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    expect(order()).toEqual([BENCH, OVERHEAD, PULLDOWN]);
  });

  test('the moves found taken go with the finish', async () => {
    await show();
    await openTaken();
    await fireEvent.press(screen.getByTestId('taken-later'));
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await endAndFinish();
    await fireEvent.press(await screen.findByText('Finish'));
    const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
    expect(finish?.kind === 'finish' && finish.body).toMatchObject({ takenExerciseIds: ['lat_pulldown'] });
  });

  test('a workout where nothing was taken sends no such list', async () => {
    await show();
    await fireEvent.changeText(await screen.findByLabelText('Weight (kg)'), '50');
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    await endAndFinish();
    await fireEvent.press(await screen.findByText('Finish'));
    const finish = mockRecord.mock.calls.map(([o]) => o).find((o) => o.kind === 'finish');
    expect(finish?.kind).toBe('finish');
    expect(finish?.kind === 'finish' && finish.body).not.toHaveProperty('takenExerciseIds');
  });

  test('Taken? on the Up next row: the next move is taken, said before walking there; the person stays on the move under way', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await fireEvent.press(screen.getByTestId('up-next-taken'));
    expect(screen.getByText(t('taken.title', { move: BENCH }))).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('taken-later'));
    expect(order()).toEqual([PULLDOWN, OVERHEAD, BENCH]);
    expect(head().getByText(PULLDOWN)).toBeOnTheScreen(); // still where they were
    expect(within(screen.getByTestId('up-next')).getByText(OVERHEAD)).toBeOnTheScreen();
  });

  test('Taken? closed: back on the move under way, nothing kept', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await fireEvent.press(screen.getByTestId('up-next-taken'));
    await fireEvent.press(screen.getByRole('button', { name: t('swap.close') }));
    expect(head().getByText(PULLDOWN)).toBeOnTheScreen();
    expect(mockMore).toBeNull();
  });
});

// Final walk of phase 7 (#684): what moved under the finger, and what the last step did not offer.
describe('the page does not move under the finger (final pass 3)', () => {
  const skipSet = () => fireEvent.press(within(screen.getByTestId('dock')).getByRole('button', { name: t('workout.skipSetLabel') }));

  test('the Undo bar is an overlay above the dock: not in the scrolled content, absolute, and Undo still works', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    await skipSet();
    const bar = screen.getByTestId('undo-bar');
    expect(within(screen.getByTestId('session-scroll')).queryByTestId('undo-bar')).toBeNull();
    expect(StyleSheet.flatten(bar.props.style)).toMatchObject({ position: 'absolute' });
    await fireEvent.press(within(bar).getByRole('button', { name: t('workout.undoLabel') }));
    expect(screen.queryByTestId('undo-bar')).toBeNull();
    expect(screen.getByText(t('workout.log', { number: 1 }))).toBeOnTheScreen();
  });

  test('the Finish link has its place from the start: hidden and out of reach before the first set, then the same node shown', async () => {
    await show();
    await screen.findByText(t('workout.log', { number: 1 }));
    const before = screen.getByTestId('finish-link', { includeHiddenElements: true });
    expect(StyleSheet.flatten(before.props.style)).toMatchObject({ opacity: 0 });
    expect(before.props.pointerEvents).toBe('none');
    expect(screen.queryByRole('button', { name: t('workout.finish') })).toBeNull();
    await fireEvent.press(screen.getByText(t('workout.log', { number: 1 })));
    await screen.findByText(t('workout.log', { number: 2 }));
    const after = screen.getByTestId('finish-link');
    expect(StyleSheet.flatten(after.props.style).opacity).not.toBe(0);
    expect(screen.getByRole('button', { name: t('workout.finish') })).toBeOnTheScreen();
  });

  test('while the rest timer shows, the page leaves room for the footer it takes (measured), and gives it back', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await screen.findByTestId('rest-slot');
    const padding = () => StyleSheet.flatten(screen.getByTestId('session-scroll').props.contentContainerStyle).paddingBottom as number;
    const base = padding();
    await fireEvent(screen.getByTestId('rest-slot'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 90 } } });
    expect(padding()).toBe(base + 90);
    await fireEvent.press(screen.getByRole('button', { name: t('workout.rest.endLabel') }));
    expect(padding()).toBe(base);
  });
});

describe('finishing says what it is doing (final pass 3)', () => {
  test('while the finish is being kept the button says Saving… and cannot be pressed again', async () => {
    await show();
    await fireEvent.press(await screen.findByText(t('workout.log', { number: 1 })));
    await endAndFinish();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockRecord.mockImplementation(async (outbound: Outbound) => {
      if (outbound.kind === 'finish') await gate;
      return keep(outbound);
    });
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.finishNow') }));
    const saving = await screen.findByRole('button', { name: t('workout.saving') });
    expect(saving).toBeDisabled();
    expect(screen.queryByRole('button', { name: t('workout.finishNow') })).toBeNull();
    await act(async () => release());
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  });

  test('Finish with every move skipped and nothing logged says so on the way out, not nothing', async () => {
    await render(
      <ThemeProvider>
        <WithSaved>
          <WorkoutScreen />
        </WithSaved>
      </ThemeProvider>,
    );
    await screen.findByText(t('workout.log', { number: 1 }));
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.more') }));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.skipMoveLabel', { name: 'Bench press' }) }));
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.more') }));
    await fireEvent.press(screen.getByRole('button', { name: t('workout.skipMoveLabel', { name: t('exercises.one_arm_dumbbell_row.name') }) }));
    await fireEvent.press(await within(screen.getByTestId('dock')).findByRole('button', { name: t('workout.finish') }));
    expect(mockBack).toHaveBeenCalled();
    expect(within(screen.getByTestId('undo-banner')).getByText(t('workout.nothingSaved'))).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('Add a move opens where it can be used (final pass 3)', () => {
  const scrolls = jest.spyOn(ScrollView.prototype, 'scrollTo');
  beforeEach(() => scrolls.mockClear());
  const LAT = { id: 'lat_pulldown', nameKey: 'exercises.lat_pulldown.name', load: 'EXTERNAL', unilateral: false, equipment: 'MACHINE' } as Schemas['Exercise'];
  const open = async () => {
    mockData = { ...mockData, exercises: { state: 'ready', value: [...EXERCISES, LAT] } };
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.add.open') }));
  };

  test('the search field takes the keyboard at once, and the page scrolls to the panel (once per opening)', async () => {
    await open();
    expect(screen.getByLabelText(t('workout.add.search')).props.autoFocus).toBe(true);
    await act(async () => {
      fireEvent(screen.getByTestId('add-panel'), 'layout', { nativeEvent: { layout: { x: 0, y: 640, width: 375, height: 300 } } });
    });
    expect(scrolls).toHaveBeenCalledTimes(1);
    expect(scrolls).toHaveBeenCalledWith({ y: 640 - tokens.space.sm, animated: false });
    await act(async () => {
      fireEvent(screen.getByTestId('add-panel'), 'layout', { nativeEvent: { layout: { x: 0, y: 640, width: 375, height: 420 } } });
    });
    expect(scrolls).toHaveBeenCalledTimes(1); // a list that grows while typing does not pull the page again
  });

  test('Close and Create stand together under the field, as text buttons; the results are rows with the move\'s icon', async () => {
    await open();
    await fireEvent.changeText(screen.getByLabelText(t('workout.add.search')), 'lat');
    const actions = within(screen.getByTestId('add-actions'));
    expect(actions.getByRole('button', { name: t('workout.add.close') })).toBeOnTheScreen();
    expect(actions.getByRole('button', { name: t('workout.add.create', { name: 'lat' }) })).toBeOnTheScreen();
    const row = screen.getByRole('button', { name: t('workout.add.pick', { name: t('exercises.lat_pulldown.name') }) });
    expect(within(row).getByTestId('move-thumb-MACHINE', { includeHiddenElements: true })).toBeTruthy(); // decorative: hidden from VoiceOver
    expect(StyleSheet.flatten(row.props.style).minHeight).toBe(tokens.size.touch);
  });
});
