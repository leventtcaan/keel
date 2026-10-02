/**
 * Editing a past session (K-416, L3 §1 #11): a set wrongly logged is deleted, a set forgotten is added — on the server,
 * which holds the session (it is no longer in the phone's queue). The phone's copy of a deleted set goes too, so the
 * history does not bring it back. Records and the estimated max are derived from the sets each time (ADR-033): an edit
 * changes them by itself.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import WorkoutEditScreen from '@/app/workout-edit';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import type { Move } from '@/train/trainData';
import { weightInput } from '@/units/units';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const move = (id: string, unilateral = false): Schemas['Exercise'] => ({
  id,
  nameKey: `exercises.${id}.name`,
  kind: 'COMPOUND',
  muscles: [],
  alternatives: [],
  load: 'EXTERNAL',
  equipment: unilateral ? 'DUMBBELL' : 'BARBELL',
  unilateral,
  setupFields: [],
});
const CATALOG = [move('bench_press'), move('bulgarian_split_squat', true)];
const set = (id: string, exerciseId: string, setType: Schemas['SetType'], loadKg: number, reps: number, side?: Schemas['Side']) => ({
  id,
  clientId: `c-${id}`,
  exerciseId,
  setType,
  loadKg,
  reps,
  ...(setType === 'WORKING' ? { rir: 1 } : {}),
  ...(side === undefined ? {} : { side }),
});
const WORKOUT: Schemas['Workout'] = {
  id: 'w1',
  clientId: 'cw1',
  startedAt: '2026-09-28T15:00:00.000Z',
  endedAt: '2026-09-28T16:00:00.000Z',
  sets: [
    set('s0', 'bench_press', 'WARM_UP', 40, 8),
    set('s1', 'bench_press', 'WORKING', 80, 8),
    set('s2', 'bulgarian_split_squat', 'WORKING', 20, 10, 'LEFT'),
  ],
};

let mockWorkout: () => Promise<Answer> = async () => ok(WORKOUT);
let mockDelete: () => Promise<Answer> = async () => ({ response: new Response(null, { status: 204 }) });
let mockPost: () => Promise<Answer> = async () => ok({}, 201);
const mockGET = jest.fn(async (_path: string, _init?: unknown) => mockWorkout());
const mockDELETE = jest.fn(async (_path: string, _init?: unknown) => mockDelete());
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => mockPost());
const mockForget = jest.fn(async (_clientId: string) => {});
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => ({ workout: 'w1' }) }));
const mockServices = {
  api: { GET: mockGET, DELETE: mockDELETE, POST: mockPOST },
  training: {
    read: async () => ({ program: { state: 'none' }, exercises: { state: 'ready', value: CATALOG }, kept: false }),
    own: async () => mockOwn,
  },
  forgetRecord: mockForget,
  report: jest.fn(),
};
let mockOwn: Move[] = [];
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeEach(() => {
  jest.clearAllMocks();
  mockWorkout = async () => ok(WORKOUT);
  mockDelete = async () => ({ response: new Response(null, { status: 204 }) });
  mockPost = async () => ok({}, 201);
  mockUnits = 'METRIC';
  mockOwn = [];
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WorkoutEditScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const benchName = t('exercises.bench_press.name');
const squatName = t('exercises.bulgarian_split_squat.name');

test("the session's sets by move, each with a way to delete it", async () => {
  await show();
  expect(mockGET).toHaveBeenCalledWith('/v1/workouts/{id}', { params: { path: { id: 'w1' } } });
  // Each move's name heads its sets (and names its chip in the add form).
  expect(screen.getAllByText(benchName).length).toBeGreaterThan(0);
  expect(screen.getAllByText(squatName).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(3);
});

test('deleting asks once more, then deletes on the server, forgets the phone copy, and reads the session again', async () => {
  await show();
  const deletes = screen.getAllByRole('button', { name: /^Delete / });
  await act(async () => fireEvent.press(deletes[1]));
  expect(mockDELETE).not.toHaveBeenCalled();
  mockWorkout = async () => ok({ ...WORKOUT, sets: WORKOUT.sets.filter((s) => s.id !== 's1') });
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('sessionEdit.confirmDelete') })));
  expect(mockDELETE).toHaveBeenCalledWith('/v1/workouts/{id}/sets/{setId}', { params: { path: { id: 'w1', setId: 's1' } } });
  expect(mockForget).toHaveBeenCalledWith('c-s1');
  expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(2);
});

test('a delete not done says a connection is needed, and nothing is forgotten', async () => {
  mockDelete = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await act(async () => fireEvent.press(screen.getAllByRole('button', { name: /^Delete / })[1]));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('sessionEdit.confirmDelete') })));
  expect(screen.getByText(t('sessionEdit.needsConnection'))).toBeOnTheScreen();
  expect(mockForget).not.toHaveBeenCalled();
});

test('a delete the server refuses (500) is not done either; one already gone (404) counts as done', async () => {
  mockDelete = async () => refused(500, 'INTERNAL');
  await show();
  await act(async () => fireEvent.press(screen.getAllByRole('button', { name: /^Delete / })[1]));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('sessionEdit.confirmDelete') })));
  expect(screen.getByText(t('sessionEdit.needsConnection'))).toBeOnTheScreen();
  expect(mockForget).not.toHaveBeenCalled();

  mockDelete = async () => refused(404, 'NOT_FOUND');
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('sessionEdit.confirmDelete') })));
  expect(mockForget).toHaveBeenCalledWith('c-s1');
});

test('a forgotten set is added to one of the moves, on the server, and the session read again', async () => {
  await show();
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '82.5'));
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '6'));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: '2' })));
  const reads = mockGET.mock.calls.length;
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 2 }) })));
  expect(mockPOST).toHaveBeenCalledWith('/v1/workouts/{id}/sets', {
    params: { path: { id: 'w1' } },
    body: { clientId: expect.any(String), exerciseId: 'bench_press', setType: 'WORKING', loadKg: 82.5, reps: 6, rir: 2, side: 'BOTH' },
  });
  expect(mockGET.mock.calls.length).toBeGreaterThan(reads);
});

test("the add form starts from the move's last work set of the session (simulator: empty fields did not show)", async () => {
  await show();
  expect(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })).props.value).toBe(weightInput(80, 'METRIC'));
  expect(screen.getByLabelText(t('workout.repsLabel')).props.value).toBe('8');
  expect(screen.getByRole('button', { name: '1' })).toBeSelected();
});

test('a work set reads as in the history, with its RIR', async () => {
  await show();
  expect(screen.getByText(t('summary.setRir', { set: '80 kg × 8', rir: 1 }))).toBeOnTheScreen();
});

test('a one-sided move is added a side at a time', async () => {
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: squatName })));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('workout.sideName.RIGHT') })));
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '20'));
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '10'));
  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: t('workout.logSide', { number: 1, side: t('workout.sideName.RIGHT') }) })),
  );
  expect(mockPOST).toHaveBeenCalledWith(
    '/v1/workouts/{id}/sets',
    expect.objectContaining({ body: expect.objectContaining({ exerciseId: 'bulgarian_split_squat', side: 'RIGHT' }) }),
  );
});

test('a set the server would not take is not sent', async () => {
  await show();
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '0'));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 2 }) })));
  expect(mockPOST).not.toHaveBeenCalled();
  expect(screen.getByText(t('workout.invalid'))).toBeOnTheScreen();
});

test('an add not done says a connection is needed', async () => {
  mockPost = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('workout.loadLabel', { unit: t('units.kgUnit') })), '80'));
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('workout.repsLabel')), '8'));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 2 }) })));
  expect(screen.getByText(t('sessionEdit.needsConnection'))).toBeOnTheScreen();
});

test('a session no longer there, or not readable, says so', async () => {
  mockWorkout = async () => refused(404, 'NOT_FOUND');
  await show();
  expect(screen.getByText(t('sessionEdit.gone'))).toBeOnTheScreen();
});

test('offline: a past session cannot be edited, and it says why', async () => {
  mockWorkout = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  expect(screen.getByText(t('sessionEdit.needsConnection'))).toBeOnTheScreen();
  expect(screen.queryAllByRole('button', { name: /^Delete / })).toHaveLength(0);
});

describe('review', () => {
  test('a session still under way is not edited here: it says so, with nothing to change', async () => {
    mockWorkout = async () => ok({ ...WORKOUT, endedAt: undefined });
    await show();
    expect(screen.getByText(t('sessionEdit.underWay'))).toBeOnTheScreen();
    expect(screen.queryAllByRole('button', { name: /^Delete / })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: t('workout.log', { number: 2 }) })).toBeNull();
  });

  test('an add tried again after its answer was lost goes with the same clientId (the server keeps one, ADR-024)', async () => {
    mockPost = async () => {
      throw new TypeError('Network request failed');
    };
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 2 }) })));
    mockPost = async () => ok({}, 201);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 2 }) })));
    const [first, second] = mockPOST.mock.calls.map(([, init]) => (init as { body: { clientId: string } }).body.clientId);
    expect(second).toBe(first);
  });

  test('asked to delete, the spot the delete was in keeps it: a second tap there does not delete', async () => {
    await show();
    await act(async () => fireEvent.press(screen.getAllByRole('button', { name: /^Delete / })[1]));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('sessionEdit.keep') })));
    expect(mockDELETE).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(3);
  });

  test('in pounds, an untouched suggestion is saved as the kg it came from (62.5 kg shows as 137.8 lb)', async () => {
    mockUnits = 'IMPERIAL';
    mockWorkout = async () => ok({ ...WORKOUT, sets: [set('s1', 'bench_press', 'WORKING', 62.5, 8)] });
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 2 }) })));
    expect(mockPOST).toHaveBeenCalledWith('/v1/workouts/{id}/sets', expect.objectContaining({ body: expect.objectContaining({ loadKg: 62.5 }) }));
  });

  test("it says the next session's targets stay as the finish set them", async () => {
    await show();
    expect(screen.getByText(t('sessionEdit.targetsNote'))).toBeOnTheScreen();
  });
});

test("the user's own move is in the session by the name they gave, its sets there to change", async () => {
  mockOwn = [{ id: 'custom:1', nameKey: '', name: 'Landmine press', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] }];
  mockWorkout = async () => ok({ ...WORKOUT, sets: [...WORKOUT.sets, set('s3', 'custom:1', 'WORKING', 30, 10)] });
  await show();
  expect(screen.getAllByText('Landmine press').length).toBeGreaterThan(0);
  expect(screen.queryByText('custom:1')).toBeNull();
  expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(4);
});

test('a forgotten set is added to the user\'s own move under its id', async () => {
  mockOwn = [{ id: 'custom:1', nameKey: '', name: 'Landmine press', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] }];
  mockWorkout = async () => ok({ ...WORKOUT, sets: [...WORKOUT.sets, set('s3', 'custom:1', 'WORKING', 30, 10)] });
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Landmine press' })));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('workout.log', { number: 2 }) })));
  expect(mockPOST).toHaveBeenCalledWith('/v1/workouts/{id}/sets', {
    params: { path: { id: 'w1' } },
    body: expect.objectContaining({ exerciseId: 'custom:1', loadKg: 30, reps: 10 }),
  });
});
