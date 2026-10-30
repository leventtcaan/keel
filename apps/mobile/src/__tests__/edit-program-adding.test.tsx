/**
 * Edit › Days and the old `adding` route parameter (K-1013, user test 10 Oct; removed in Evre 7 B1): the first week's call used to open
 * Edit with an empty new day on the chosen weekday. A day is only ever made by the server now; the parameter does nothing.
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
// The page coming into view again, as expo-router does each time.
let mockRefocus: () => void = () => {};
const mockServices = {
  api: { GET: async () => ({ response: { status: 404 } }), POST: jest.fn(), PATCH: jest.fn() },
  report: jest.fn(),
  training: { read: jest.fn(async () => mockData), own: async () => [], saved: jest.fn() },
  workoutRecords: async () => [],
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
// The edit-program screen registers its stop on unsaved edits with React Navigation; there is no navigator here.
jest.mock('expo-router/build/react-navigation/core/usePreventRemove', () => ({ usePreventRemove: () => {} }));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useNavigation: () => ({ addListener: () => () => {} }),
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      mockRefocus = effect;
      return effect();
    }, [effect]);
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

// K1 (Evre 7 B1): the first week's call no longer opens Edit with a new, empty day marked (the day comes from the server there). A
// link that still carries `adding` (an old one) opens the plain page: no new day, no note.
describe('opened with the old `adding` parameter', () => {
  beforeEach(() => {
    mockParams = { part: 'days', adding: 'SATURDAY' };
  });

  test('no new day is made on the weekday, no note: the days are the program\'s', async () => {
    await show();
    expect(screen.queryByRole('button', { name: header(t('programEditor.defaultName', { number: 4 }), 'Saturday') })).toBeNull();
    expect(screen.queryByTestId('day-card-3')).toBeNull();
    expect(screen.getByText(t('programEditor.summary', { days: t('programEditor.days.other', { count: 3 }), moves: t('programEditor.moves.other', { count: 3 }) }))).toBeOnTheScreen();
  });

  test('the page is not dirty: nothing to save', async () => {
    await show();
    expect(screen.getByRole('button', { name: t('editProgram.save') })).toBeDisabled();
    expect(screen.queryByTestId('unsaved-note')).toBeNull();
  });

  test('the page read again on focus adds no day either', async () => {
    await show();
    await act(async () => mockRefocus());
    expect(screen.queryByTestId('day-card-3')).toBeNull();
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
