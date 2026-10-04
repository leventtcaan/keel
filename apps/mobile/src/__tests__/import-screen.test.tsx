/**
 * Bring in workouts from Strong or Hevy (K-609, ADR-053): a file picked on the phone is read there; its move names are
 * matched to the catalog — a sure match shown and changeable, anything less offered in one tap (U5) or not brought in;
 * the unit and how dumbbells were counted are asked, not guessed (H13 B2, B4); only the matched sets are sent, and the
 * file never leaves the phone. Needs the health data consent.
 */
import fs from 'node:fs';
import path from 'node:path';

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import ImportScreen from '@/app/import';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import type { Move } from '@/train/trainData';

type Equipment = components['schemas']['Equipment'];
const move = (id: string, equipment: Equipment, load: Move['load'] = 'EXTERNAL'): Move => ({
  id,
  nameKey: `exercises.${id}.name`,
  kind: 'COMPOUND',
  muscles: [],
  alternatives: [],
  load,
  equipment,
  unilateral: false,
  setupFields: [],
});
const CATALOG = [
  move('bench_press', 'BARBELL'),
  move('squat', 'BARBELL'),
  move('romanian_deadlift', 'BARBELL'),
  move('incline_dumbbell_press', 'DUMBBELL'),
  move('dumbbell_bench_press', 'DUMBBELL'),
  move('lat_pulldown', 'CABLE'),
  move('pull_up', 'BODYWEIGHT', 'BODYWEIGHT_PLUS_EXTERNAL'),
];
const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures/import', name), 'utf8');

let mockGranted = true;
let mockFile: string | null = null;
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const mockServices = {
  api: {
    POST: jest.fn(async (path: string, init: { body: components['schemas']['WorkoutImport'] }) =>
      path === '/v1/custom-exercises' ? (ok({ ...(init.body as object), id: 'custom:8a1d' }) as unknown) : (ok({ imported: 2, alreadyThere: 0 }) as unknown),
    ),
  },
  consents: { granted: jest.fn(async (_kind: string) => mockGranted) },
  importFile: { pick: jest.fn(async () => mockFile) },
  training: {
    read: jest.fn(async () => ({ program: { state: 'none' }, exercises: { state: 'ready', value: CATALOG }, kept: false })),
    own: jest.fn(async () => [] as Move[]),
    saved: jest.fn(async () => {}),
  },
  report: jest.fn(),
};
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() } }));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_algorithm: string, text: string) =>
    jest.requireActual<typeof import('node:crypto')>('node:crypto').createHash('sha256').update(text).digest('hex'),
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeEach(() => {
  jest.clearAllMocks();
  mockGranted = true;
  mockFile = null;
  mockUnits = 'METRIC';
});
afterEach(() => {
  // The file never goes anywhere: the import carries mapped sets only (an own move's name goes only when the user saves one).
  for (const [, init] of mockServices.api.POST.mock.calls.filter(([p]) => p === '/v1/workout-imports')) {
    const sent = JSON.stringify(init.body);
    for (const word of ['Bench Press', 'heavy', 'Gym was busy', 'Training Title', 'Legs, then arms', 'Push']) expect(sent).not.toContain(word);
  }
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <ImportScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
async function press(name: string) {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
}
const name = (id: string) => t(`exercises.${id}.name`);

test('without the health data consent it says so and offers no file', async () => {
  mockGranted = false;
  await show();

  expect(screen.getByText(t('import.needsConsent'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('import.choose') })).toBeNull();
});

test('before a file: what happens to it is said first', async () => {
  await show();

  expect(screen.getByText(t('import.privacy'))).toBeOnTheScreen();
  expect(mockServices.importFile.pick).not.toHaveBeenCalled();
});

test('a file that is not a verified export is said so, nothing guessed; another can be chosen', async () => {
  mockFile = 'date,exercise,kg\n2025-01-18,Squat,100';
  await show();

  await press(t('import.choose'));

  expect(screen.getByText(t('import.unknown'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('import.chooseAnother') })).toBeOnTheScreen();
});

test('choosing no file changes nothing', async () => {
  await show();

  await press(t('import.choose'));

  expect(screen.getByRole('button', { name: t('import.choose') })).toBeOnTheScreen();
});

describe('a Strong file', () => {
  test('what it holds; the unit asked (the file does not say); a sure name matched, an unsure one offered', async () => {
    mockFile = fixture('strong.csv');
    await show();

    await press(t('import.choose'));

    expect(screen.getByText(t('import.summary', { sessions: 2, sets: 4, app: t('import.apps.STRONG') }))).toBeOnTheScreen();
    expect(screen.getByText(t('import.unit.title'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('import.unit.kg') })).toBeSelected(); // the user's units: metric
    expect(screen.getByText(t('import.matched', { move: name('bench_press') }))).toBeOnTheScreen();
    expect(screen.getByText(t('import.notMatched'))).toBeOnTheScreen(); // Deadlift (Barbell): the catalog has no conventional one
    expect(screen.getByRole('button', { name: t('import.pickLabel', { move: name('romanian_deadlift'), file: 'Deadlift (Barbell)' }) })).toBeOnTheScreen();
  });

  test('imperial units: lb is the first answer', async () => {
    mockUnits = 'IMPERIAL';
    mockFile = fixture('strong.csv');
    await show();

    await press(t('import.choose'));

    expect(screen.getByRole('button', { name: t('import.unit.lb') })).toBeSelected();
  });

  test('one tap takes an offer; the sets go with their moves, in kg, and the outcome is said', async () => {
    mockFile = fixture('strong.csv');
    await show();
    await press(t('import.choose'));

    await press(t('import.pickLabel', { move: name('romanian_deadlift'), file: 'Deadlift (Barbell)' }));
    await press(t('import.send', { count: 2 }));

    expect(mockServices.api.POST).toHaveBeenCalledTimes(1);
    const body = mockServices.api.POST.mock.calls[0][1].body;
    expect(body.source).toBe('STRONG');
    expect(body.workouts.flatMap((w) => w.sets.map((s) => [s.exerciseId, s.loadKg, s.reps]))).toEqual([
      ['bench_press', 20, 20],
      ['bench_press', 60, 8],
      ['squat', 100, 5],
      ['romanian_deadlift', 140, 3],
    ]);
    expect(screen.getByText(t('import.done', { count: 2 }))).toBeOnTheScreen();
  });

  test('lb chosen: the loads go in kg', async () => {
    mockFile = fixture('strong.csv');
    await show();
    await press(t('import.choose'));

    await press(t('import.unit.lb'));
    await press(t('import.send', { count: 2 }));

    const sets = mockServices.api.POST.mock.calls[0][1].body.workouts[0].sets;
    expect(sets.map((s) => s.loadKg)).toEqual([9.07, 27.22]); // 20 lb, 60 lb
  });

  test('a name not brought in: its sets do not go, and the done screen says how many stayed out', async () => {
    mockFile = fixture('strong.csv');
    await show();
    await press(t('import.choose'));

    await press(t('import.send', { count: 2 }));

    const ids = mockServices.api.POST.mock.calls[0][1].body.workouts.flatMap((w) => w.sets.map((s) => s.exerciseId));
    expect(ids).not.toContain('romanian_deadlift');
    expect(screen.getByText(t('import.skipped', { count: 1 }))).toBeOnTheScreen();
  });

  test('a sure match can be changed: not brought in', async () => {
    mockFile = fixture('strong.csv');
    await show();
    await press(t('import.choose'));

    await press(t('import.skipLabel', { file: 'Bench Press (Barbell)' }));
    await press(t('import.sendOne'));

    const ids = mockServices.api.POST.mock.calls[0][1].body.workouts.flatMap((w) => w.sets.map((s) => s.exerciseId));
    expect(ids).toEqual(['squat']);
  });

  test('another move found by name for a name', async () => {
    mockFile = fixture('strong.csv');
    await show();
    await press(t('import.choose'));

    await press(t('import.otherLabel', { file: 'Deadlift (Barbell)' }));
    await fireEvent.changeText(screen.getByLabelText(t('import.search')), 'squat');
    await act(async () => {});
    await press(t('import.pickLabel', { move: name('squat'), file: 'Deadlift (Barbell)' }));

    expect(screen.getAllByText(t('import.matched', { move: name('squat') }))).toHaveLength(2);
  });
});

test('a name the catalog lacks can be made one of the user\'s own moves, the engine\'s questions answered (K-416)', async () => {
  mockFile = fixture('strong.csv');
  await show();
  await press(t('import.choose'));

  await press(t('import.ownLabel', { file: 'Deadlift (Barbell)' }));
  expect(screen.getByDisplayValue('Deadlift (Barbell)')).toBeOnTheScreen();
  await press(`${t('ownMove.kind')} ${t('ownMove.kinds.COMPOUND')}`);
  await press(`${t('ownMove.equipment')} ${t('ownMove.equipments.BARBELL')}`);
  await press(`${t('ownMove.unilateral')} ${t('ownMove.no')}`);
  await press(t('ownMove.save'));

  expect(mockServices.api.POST.mock.calls[0][0]).toBe('/v1/custom-exercises');
  expect(mockServices.training.saved).toHaveBeenCalled();
  expect(screen.getByText(t('import.matched', { move: 'Deadlift (Barbell)' }))).toBeOnTheScreen();
  await press(t('import.send', { count: 2 }));
  const ids = mockServices.api.POST.mock.calls[1][1].body.workouts.flatMap((w) => w.sets.map((s) => s.exerciseId));
  expect(ids).toContain('custom:8a1d');
});

describe('a Hevy file', () => {
  test('no unit question (kg in its header); the dumbbell question once a dumbbell move is in; both together halves it', async () => {
    mockFile = fixture('hevy.csv');
    await show();
    await press(t('import.choose'));

    expect(screen.queryByText(t('import.unit.title'))).toBeNull();
    expect(screen.queryByText(t('import.dumbbells.title'))).toBeNull(); // Incline Bench Press (Dumbbell): not sure, not in yet

    await press(t('import.pickLabel', { move: name('incline_dumbbell_press'), file: 'Incline Bench Press (Dumbbell)' }));
    expect(screen.getByText(t('import.dumbbells.title'))).toBeOnTheScreen();
    await press(t('import.dumbbells.both'));
    await press(t('import.send', { count: 2 }));

    const sets = mockServices.api.POST.mock.calls[0][1].body.workouts[0].sets;
    expect(sets.filter((s) => s.exerciseId === 'incline_dumbbell_press').map((s) => [s.setType, s.loadKg])).toEqual([
      ['WARM_UP', 10],
      ['WORKING', 30],
    ]);
  });
});

test('a failure is said by its kind; trying again sends again', async () => {
  mockFile = fixture('strong.csv');
  mockServices.api.POST.mockRejectedValueOnce(new TypeError('Network request failed'));
  await show();
  await press(t('import.choose'));

  await press(t('import.send', { count: 2 }));
  expect(screen.getByText(t('import.failed.NoConnection'))).toBeOnTheScreen();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'NoConnection' });

  await press(t('import.send', { count: 2 }));
  expect(screen.getByText(t('import.done', { count: 2 }))).toBeOnTheScreen();
});
