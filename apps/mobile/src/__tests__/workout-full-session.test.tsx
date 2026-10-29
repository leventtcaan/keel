/**
 * A whole session through the screen, every way out of it (Evre 7, issue 684: "the workout does not finish, loops, functions that do not
 * work"). The harness is the session screen's own (workout-screen.test.tsx); the tests run a day to its end the way a person does: every
 * set of every move with Next, finishing early with moves left, Taken on the next move and on the move under way, every move skipped but
 * one, and a session left in the middle and opened again. They found no loop inside the screen: the dead end was a day with no way to
 * start it (train-screen.test.tsx, the "any day" rows); these pin that the rest of the way holds.
 */
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import WorkoutScreen from '@/app/workout';
import type { Outbound } from '@/sync/queue';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import type { Move, TrainData } from '@/train/trainData';


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
      return cleanup;
    }, [effect]);
  },
}));
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
let mockSave: (body: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }> = async () => ({ response: new Response(null, { status: 201 }) });
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
/**
 * End, then "Finish and save" (K-972: End offers three ways out; a session with nothing kept closes at once, with no
 * choice to make).
 */
const endAndFinish = async () => {
  await fireEvent.press(await screen.findByRole('button', { name: t('workout.endLabel') }));
  const finish = screen.queryByRole('button', { name: new RegExp(`^${t('workout.ending.finish')}`) });
  if (finish !== null) await fireEvent.press(finish);
};
/** The move's More menu (ADR-070 Ek 2 #1, K-1047): the rarer actions of the move (Superset, Skip move) are rows in it. */
const openMore = async () => fireEvent.press(await screen.findByRole('button', { name: t('workout.more') }));
const more = async (row: string) => {
  await openMore();
  await fireEvent.press(screen.getByRole('button', { name: row }));
};
// ── Evre 7 · item 12: a whole workout, every way out of it ─────────────────────────────────────────────────────────────
// Levent could not finish a workout on his phone (build 9): "loops, functions that do not work". These run a full session
// through the screen the way a person does, to find where it stops.
const MOVES = ['squat', 'bench_press', 'barbell_row'] as const;
const THREE = {
  id: 'day-a',
  nameKey: 'programDays.upper_a.name',
  weekday: 'MONDAY',
  exercises: MOVES.map((exerciseId, i) => ({
    id: `row-${exerciseId}`,
    exerciseId,
    baseSets: 2,
    sets: 2,
    reps: { min: 6, max: 10 },
    targetRir: 1,
    nextLoadKg: 50 + i * 10,
    nextReps: 6,
    swapOptions: [],
  })),
} as unknown as Schemas['ProgramDay'];
const GEN = MOVES.map((id) => ({ id, load: 'EXTERNAL', unilateral: false, equipment: 'BARBELL' })) as unknown as Schemas['Exercise'][];

function threeMoves() {
  mockData = { program: { state: 'ready', value: { id: 'p', source: 'GENERATED', days: [THREE] } as Schemas['Program'] }, exercises: { state: 'ready', value: GEN }, kept: false };
  mockRecords = [];
  mockParams = { day: 'day-a' };
}
const logNext = async (n: number) => fireEvent.press(await screen.findByText(t('workout.log', { number: n })));
const finishedRecords = () => mockRecord.mock.calls.map(([o]) => o).filter((o) => o.kind === 'finish');

describe('a full session, to the end', () => {
  beforeEach(threeMoves);

  test('every set of every move, Next each time, then Finish: the form, the finish, the summary', async () => {
    await show();
    for (const name of ['Squat', 'Bench press', 'Barbell row']) {
      await screen.findAllByText(name);
      await logNext(1);
      await logNext(2);
      const next = screen.queryByRole('button', { name: /^Next: / });
      if (next !== null) await fireEvent.press(next);
    }
    const finish = await screen.findByRole('button', { name: t('workout.finish') });
    await fireEvent.press(finish);
    await fireEvent.press(await screen.findByText('Finish'));
    expect(finishedRecords()).toHaveLength(1);
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/workout-end', params: { workout: expect.any(String) } });
  });

  test('finishing early with moves left: End, Finish and save, the form, the finish', async () => {
    await show();
    await logNext(1);
    await endAndFinish();
    await fireEvent.press(await screen.findByText('Finish'));
    expect(finishedRecords()).toHaveLength(1);
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/workout-end', params: { workout: expect.any(String) } });
  });

  test('Taken on the next move, Do it later: the move under way stays, the taken one comes last', async () => {
    await show();
    await fireEvent.press(await screen.findByTestId('up-next-taken'));
    await fireEvent.press(await screen.findByText(t('taken.later')));
    expect(within(screen.getByTestId('up-next')).getByText('Barbell row')).toBeTruthy();
    await logNext(1);
    await logNext(2);
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.next', { name: 'Barbell row' }) }));
    await logNext(1);
    await logNext(2);
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.next', { name: 'Bench press' }) }));
    await logNext(1);
    await logNext(2);
    expect(await screen.findByRole('button', { name: t('workout.finish') })).toBeTruthy();
  });

  test('the move under way taken: Do it later, then the others, then it, and Finish after it', async () => {
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('taken.openLabel', { move: 'Squat' }) }));
    await fireEvent.press(await screen.findByText(t('taken.later')));
    await logNext(1);
    await logNext(2);
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.next', { name: 'Barbell row' }) }));
    await logNext(1);
    await logNext(2);
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.next', { name: 'Squat' }) }));
    await logNext(1);
    await logNext(2);
    expect(screen.queryByRole('button', { name: /^Next: / })).toBeNull();
    expect(await screen.findByRole('button', { name: t('workout.finish') })).toBeTruthy();
  });

  test('every move skipped but one: the one done, then Finish (no Next to a skipped move)', async () => {
    await show();
    await more(t('workout.skipMoveLabel', { name: 'Squat' }));
    await more(t('workout.skipMoveLabel', { name: 'Bench press' }));
    await logNext(1);
    await logNext(2);
    expect(screen.queryByRole('button', { name: /^Next: / })).toBeNull();
    expect(await screen.findByRole('button', { name: t('workout.finish') })).toBeTruthy();
  });

  test('left in the middle and opened again: the sets done stay, the next set is under way', async () => {
    await show();
    await logNext(1);
    await fireEvent.press(await screen.findByRole('button', { name: t('workout.endLabel') }));
    await fireEvent.press(await screen.findByText(new RegExp(`^${t('workout.ending.later')}`)));
    expect(mockBack).toHaveBeenCalled();
    mockParams = {};
    await show();
    expect(await screen.findByText(t('workout.log', { number: 2 }))).toBeTruthy();
  });
});
