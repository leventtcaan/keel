/**
 * What the workout's end reads (K-974, ADR-075 #7, K-965): the server's summary of the workout once it and its finish
 * are on the server (the queue is drained first), the program for the record's next target, this week's sessions, and
 * the Apple Watch's measured energy for the session's window, read only with both health consents (ADR-074 #5). The phone
 * counts nothing: not offline, not from its own records. Not sent yet: pending, with nothing made up.
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import type { TrainData } from '@/train/trainData';
import { loadWorkoutEnd } from '@/train/workoutEnd';

type Schemas = components['schemas'];

const record = (kind: string, clientId: string, body: unknown, extra: Partial<LocalRecord> = {}): LocalRecord => ({
  seq: 1,
  clientId,
  kind,
  parentClientId: kind === 'workout' ? null : 'w1',
  body,
  state: 'SYNCED',
  serverId: kind === 'workout' ? 'srv-w1' : null,
  serverBody: null,
  errorCode: null,
  ...extra,
});
const WORKOUT = record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-29T08:00:00Z', programDayId: 'a' });
const FINISH = record('finish', 'f1', { endedAt: '2026-09-29T08:52:00Z' });
const SUMMARY: Schemas['WorkoutSummary'] = { workoutId: 'srv-w1', minutes: 52, liftedKg: 4200, workingSets: 15, marks: [], weekOf: '2026-09-28', muscles: [] };
const PROGRAM: Schemas['Program'] = { id: 'p', source: 'GENERATED', days: [], week: [] };
// The whole week's actions (training, protein, steps, weigh-ins) are 19 planned, 5 done; its sessions 3 planned, 2 done.
const CONSISTENCY: Schemas['Consistency'] = {
  weekOf: '2026-09-28',
  training: { planned: 3, done: 2 },
  protein: { planned: 7, done: 1 },
  steps: { planned: 7, done: 1 },
  weighIns: { planned: 2, done: 1 },
  planned: 19,
  done: 5,
  record: { onTrackWeeks: 0, countedWeeks: 0, currentRun: 0, forgivenWeeks: 0 },
} as Schemas['Consistency'];

const deps = (over: Partial<Parameters<typeof loadWorkoutEnd>[0]> = {}) => {
  const GET = jest.fn(async (path: string) => {
    if (path === '/v1/workouts/{id}/summary') return { data: SUMMARY, response: { status: 200 } };
    if (path === '/v1/consistency') return { data: CONSISTENCY, response: { status: 200 } };
    return { response: { status: 404 } };
  });
  const readWatchActiveEnergy = jest.fn(async () => 310);
  return {
    GET,
    readWatchActiveEnergy,
    value: {
      api: { GET } as never,
      queue: { drain: jest.fn(async () => undefined) },
      workoutRecords: jest.fn(async () => [WORKOUT, FINISH]),
      training: { read: jest.fn(async (): Promise<TrainData> => ({ program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: [] }, kept: false })) },
      health: { readWatchActiveEnergy },
      consents: { granted: async () => true },
      ...over,
    },
  };
};

test("sent: the server's summary of that workout, its program day, the week's sessions and the watch's energy for its window", async () => {
  const { value, GET, readWatchActiveEnergy } = deps();
  expect(await loadWorkoutEnd(value, 'w1')).toEqual({
    kind: 'ready',
    summary: SUMMARY,
    program: PROGRAM,
    programDayId: 'a',
    week: { done: 2, planned: 3 },
    kcal: 310,
  });
  expect(value.queue.drain).toHaveBeenCalled();
  expect(GET).toHaveBeenCalledWith('/v1/workouts/{id}/summary', { params: { path: { id: 'srv-w1' } } });
  expect(readWatchActiveEnergy).toHaveBeenCalledWith(new Date('2026-09-29T08:00:00Z'), new Date('2026-09-29T08:52:00Z'));
});

test('without both health consents, Apple Health is not read: no energy', async () => {
  const { value, readWatchActiveEnergy } = deps({ consents: { granted: async (kind: string) => kind === 'APPLE_HEALTH' } });
  const end = await loadWorkoutEnd(value, 'w1');
  expect(end.kind === 'ready' && end.kcal).toBeUndefined();
  expect(readWatchActiveEnergy).not.toHaveBeenCalled();
});

test('no watch reading: no energy, never a guess', async () => {
  const { value } = deps({ health: { readWatchActiveEnergy: async () => undefined } });
  const end = await loadWorkoutEnd(value, 'w1');
  expect(end.kind === 'ready' && end.kcal).toBeUndefined();
});

test.each([
  ['the workout not on the server yet', [{ ...WORKOUT, serverId: null, state: 'PENDING' as const }, FINISH]],
  ['its finish not on the server yet', [WORKOUT, { ...FINISH, state: 'PENDING' as const }]],
])('%s: pending, nothing counted on the phone', async (_, records) => {
  const { value, GET } = deps({ workoutRecords: async () => records });
  expect(await loadWorkoutEnd(value, 'w1')).toEqual({ kind: 'pending' });
  expect(GET).not.toHaveBeenCalled();
});

test('the summary not read (no connection): failed by name', async () => {
  const { value } = deps();
  value.api = {
    GET: async () => {
      throw new TypeError('Network request failed');
    },
  } as never;
  expect(await loadWorkoutEnd(value, 'w1')).toEqual({ kind: 'failed', problem: 'NoConnection' });
});

test('the week not read: the rest stands, without the week', async () => {
  const { value, GET } = deps();
  GET.mockImplementation(async (path: string) =>
    path === '/v1/workouts/{id}/summary' ? { data: SUMMARY, response: { status: 200 } } : { response: { status: 500 } },
  );
  const end = await loadWorkoutEnd(value, 'w1');
  expect(end.kind === 'ready' && end.week).toBeNull();
});

test("the week is the sessions' (training), never the sum of the week's actions", async () => {
  const { value } = deps();
  const end = await loadWorkoutEnd(value, 'w1');
  expect(end.kind === 'ready' && end.week).toEqual({ done: 2, planned: 3 });
});

test('without the health data consent the consistency is refused (403): no week, nothing made up', async () => {
  const { value, GET } = deps();
  GET.mockImplementation(async (path: string) =>
    path === '/v1/workouts/{id}/summary' ? { data: SUMMARY, response: { status: 200 } } : { error: { code: 'CONSENT_REQUIRED' }, response: { status: 403 } },
  );
  const end = await loadWorkoutEnd(value, 'w1');
  expect(end.kind === 'ready' && end.week).toBeNull();
});

test("a program kept offline is not read for the record's next target: it may be from before this workout", async () => {
  const { value } = deps({
    training: { read: async (): Promise<TrainData> => ({ program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: [] }, kept: true }) },
  });
  const end = await loadWorkoutEnd(value, 'w1');
  expect(end.kind === 'ready' && end.program).toBeNull();
});

test('the queue is drained before the records are read', async () => {
  const order: string[] = [];
  const { value } = deps();
  value.queue.drain = jest.fn(async () => void order.push('drain'));
  value.workoutRecords = jest.fn(async () => {
    order.push('records');
    return [WORKOUT, FINISH];
  });
  await loadWorkoutEnd(value, 'w1');
  expect(order).toEqual(['drain', 'records']);
});

test('another workout id: not found here, failed (never pending forever)', async () => {
  const { value } = deps();
  expect(await loadWorkoutEnd(value, 'other')).toEqual({ kind: 'failed', problem: 'ServerError' });
});

test.each([
  ['the workout refused by the server', [{ ...WORKOUT, state: 'REJECTED' as const }, FINISH]],
  ['its finish refused by the server', [WORKOUT, { ...FINISH, state: 'REJECTED' as const }]],
])('%s: failed, never pending forever', async (_, records) => {
  const { value } = deps({ workoutRecords: async () => records });
  expect(await loadWorkoutEnd(value, 'w1')).toEqual({ kind: 'failed', problem: 'ServerError' });
});
