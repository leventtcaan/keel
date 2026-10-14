/**
 * Edit › Days opened from the first week's "add a day" call (K-1013, user test 10 Oct): the call could not add the day itself
 * (a program that does not have two days, or the server's 409), so Edit opens with the weekday the user chose already
 * marked on a new day, and says why the day is added here. Without that route parameter the page is the plain Days page.
 */
import { act, render, screen } from '@testing-library/react-native';

import EditProgramScreen from '@/app/edit-program';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const planned = (exerciseId: string): Schemas['PlannedExercise'] => ({ id: `row-${exerciseId}`, exerciseId, baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 });
const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [
    { id: 'a', nameKey: 'programDays.upper.name', weekday: 'MONDAY', exercises: [planned('bench_press')] },
    { id: 'b', nameKey: 'programDays.lower.name', weekday: 'WEDNESDAY', exercises: [planned('squat')] },
    { id: 'c', nameKey: 'programDays.push.name', weekday: 'FRIDAY', exercises: [planned('dumbbell_shoulder_press')] },
  ],
  week: [],
};

let mockData: TrainData;
let mockParams: Record<string, string> = {};
const mockServices = {
  api: { GET: async () => ({ response: { status: 404 } }), POST: jest.fn(), PATCH: jest.fn() },
  report: jest.fn(),
  training: { read: jest.fn(async () => mockData), own: async () => [], saved: jest.fn() },
  workoutRecords: async () => [],
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: [] }, kept: false };
  mockParams = {};
});

async function show() {
  await render(
    <ThemeProvider>
      <EditProgramScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const header = (name: string, weekday: string) => t('programEditor.dayHeader', { day: name, weekday, moves: t('programEditor.noMovesMeta') });

describe('opened from the first week call with a day chosen', () => {
  beforeEach(() => {
    mockParams = { part: 'days', adding: 'SATURDAY' };
  });

  test('a new day is already on the chosen weekday, no moves yet, and the page says why it is added here', async () => {
    await show();
    expect(screen.getByRole('button', { name: header(t('programEditor.defaultName', { number: 4 }), 'Saturday') })).toBeOnTheScreen();
    expect(screen.getByText(t('editProgram.addingDay', { day: 'Saturday' }))).toBeOnTheScreen();
    // The days the program has are as they were.
    expect(screen.getByText(t('programEditor.summary', { days: t('programEditor.days.other', { count: 4 }), moves: t('programEditor.moves.other', { count: 3 }) }))).toBeOnTheScreen();
  });

  test('the new day has no moves, so it is not saved yet (a day needs a move)', async () => {
    await show();
    expect(screen.getByRole('button', { name: t('editProgram.save') })).toBeDisabled();
  });

  test('a weekday the program trains on already is no new day: the plain page, no note', async () => {
    mockParams = { part: 'days', adding: 'FRIDAY' };
    await show();
    expect(screen.queryByText(t('editProgram.addingDay', { day: 'Friday' }))).toBeNull();
    expect(screen.queryByRole('button', { name: header(t('programEditor.defaultName', { number: 4 }), 'Friday') })).toBeNull();
  });

  test('a made-up weekday is ignored', async () => {
    mockParams = { part: 'days', adding: 'FUNDAY' };
    await show();
    expect(screen.queryByText(/marked/)).toBeNull();
    expect(screen.queryByTestId('day-card-3')).toBeNull();
  });

  test('the page read again (focus) does not add the day a second time', async () => {
    await show();
    await act(async () => {});
    expect(screen.getAllByRole('button', { name: header(t('programEditor.defaultName', { number: 4 }), 'Saturday') })).toHaveLength(1);
    expect(screen.queryByTestId('day-card-4')).toBeNull();
  });
});

describe('opened plainly', () => {
  test('no note, no new day', async () => {
    mockParams = { part: 'days' };
    await show();
    expect(screen.queryByTestId('day-card-3')).toBeNull();
    expect(screen.queryByText(/marked/)).toBeNull();
  });
});
