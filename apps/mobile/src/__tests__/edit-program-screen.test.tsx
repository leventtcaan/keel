/**
 * Edit program (K-970, ADR-073 #3-#4; prototype sheet `#editprog`). Each part is a page of its own, not a toast: the
 * training days, the moves with the review's flags (each suggestion applied from here), the changes from the review in
 * force (each undone, with the later ones that needed it said), the split as it really is, and "Rebuild for me" (a new
 * program from the user's training days, after a confirmation). Days and moves are read here until the server can
 * change them keeping the targets (K-995): no edit that would wipe them is offered.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import EditProgramScreen from '@/app/edit-program';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const planned = (exerciseId: string, sets = 3): Schemas['PlannedExercise'] => ({ exerciseId, baseSets: sets, sets, reps: { min: 6, max: 10 }, targetRir: 1 });
const SUGGESTION: Schemas['ReviewSuggestion'] = {
  id: 'TOO_MANY_SETS:chest',
  finding: 'TOO_MANY_SETS',
  muscle: 'chest',
  numbers: { from: 18, to: 12 },
  copyKey: 'review.too_many_sets',
  reason: { rule: 'too_many_sets', source: { tag: 'EXPERIENCE' } } as Schemas['Reason'],
};
const APPLIED: Schemas['AppliedReviewChange'] = {
  id: 'c1',
  appliedAt: '2026-09-28T10:00:00Z',
  suggestion: { ...SUGGESTION, id: 'TOO_FEW_SETS:hamstrings', finding: 'TOO_FEW_SETS', muscle: 'hamstrings', numbers: { from: 3, to: 4, min: 4 }, copyKey: 'review.too_few_sets' },
};
const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [
    { id: 'a', nameKey: 'programDays.upper.name', weekday: 'MONDAY', exercises: [planned('bench_press'), planned('lat_pulldown')] },
    { id: 'b', nameKey: 'programDays.lower.name', weekday: 'WEDNESDAY', exercises: [planned('squat')] },
    { id: 'c', nameKey: 'programDays.push.name', weekday: 'FRIDAY', exercises: [planned('dumbbell_shoulder_press')] },
  ],
  review: { id: 'rev-1', suggestions: [SUGGESTION], applied: [APPLIED], notReviewedMoves: 0 },
  week: [],
};

let mockData: TrainData;
let mockAnswers: Record<string, () => unknown> = {};
const mockPost = jest.fn(async (path: string, ..._rest: unknown[]) => mockAnswers[path]());
const mockGet = jest.fn(async (path: string) => (path === '/v1/profile' ? { data: { schedule: { trainingDays: ['MONDAY', 'THURSDAY'] } }, response: { status: 200 } } : { response: { status: 404 } }));
const mockServices = {
  api: { POST: (path: string, ...rest: unknown[]) => mockPost(path, ...rest), GET: (path: string) => mockGet(path) },
  training: { read: jest.fn(async () => mockData), own: async () => [] },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn(), dismissTo: (...args: unknown[]) => mockDismissTo(...args) },
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
  mockAnswers = {
    '/v1/program/review/apply': () => ({ data: PROGRAM, response: { status: 200 } }),
    '/v1/program/review/undo': () => ({ data: { program: PROGRAM, alsoUndone: [] }, response: { status: 200 } }),
    '/v1/program/generate': () => ({ data: PROGRAM, response: { status: 200 } }),
  };
});

const show = () =>
  render(
    <ThemeProvider>
      <EditProgramScreen />
    </ThemeProvider>,
  );

describe('the page', () => {
  test("each part a row with what it holds now; the split is the program's real one", async () => {
    await show();
    expect(await screen.findByText(t('editProgram.title'))).toBeTruthy();
    expect(screen.getByText('Mon · Wed · Fri')).toBeTruthy();
    expect(screen.getByText('4 moves · 1 flag')).toBeTruthy();
    expect(screen.getByText('Upper / Lower + Push / Pull / Legs')).toBeTruthy();
    expect(screen.getByText('1 change applied')).toBeTruthy();
  });

  test.each([
    ['Training days', 'days'],
    ['Moves', 'moves'],
    ['Split', 'split'],
    ['Rebuild for me', 'rebuild'],
    ['1 change applied', 'changes'],
  ])('%s opens its own page', async (row, part) => {
    await show();
    await fireEvent.press(await screen.findByText(row));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/edit-program', params: { part } });
  });
});

test('training days: each day on its weekday, read here for now', async () => {
  mockParams = { part: 'days' };
  await show();
  expect(await screen.findByText('Mon · Upper')).toBeTruthy();
  expect(screen.getByText('Fri · Push')).toBeTruthy();
  expect(screen.getByText(t('editProgram.readOnly'))).toBeTruthy();
});

describe('moves', () => {
  test("each day's moves, and the review's flags with what each changes", async () => {
    mockParams = { part: 'moves' };
    await show();
    expect(await screen.findByText('Bench press')).toBeTruthy();
    expect(screen.getAllByText('3 × 6-10').length).toBe(4);
    expect(screen.getByText('Chest: 12 sets a week, not 18')).toBeTruthy();
  });

  test('a flag applied goes to the server with the review it came from, and the page reads again', async () => {
    mockParams = { part: 'moves' };
    await show();
    await fireEvent.press(await screen.findByLabelText(`${t('editProgram.apply')}: Chest: 12 sets a week, not 18`));
    expect(mockPost).toHaveBeenCalledWith('/v1/program/review/apply', { body: { reviewId: 'rev-1', suggestionIds: ['TOO_MANY_SETS:chest'] } });
    expect(mockServices.training.read).toHaveBeenCalledTimes(2);
  });

  test('a stale review is said, and read again', async () => {
    mockParams = { part: 'moves' };
    mockAnswers['/v1/program/review/apply'] = () => ({ error: { code: 'CONFLICT' }, response: { status: 409 } });
    await show();
    await fireEvent.press(await screen.findByLabelText(`${t('editProgram.apply')}: Chest: 12 sets a week, not 18`));
    expect(await screen.findByText(t('editProgram.stale'))).toBeTruthy();
  });

  test("the user's own moves are not reviewed: how many", async () => {
    mockParams = { part: 'moves' };
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, review: { ...PROGRAM.review!, notReviewedMoves: 2 } } } };
    await show();
    expect(await screen.findByText(t('editProgram.notReviewed', { count: 2 }))).toBeTruthy();
  });
});

describe('the changes applied', () => {
  test('each undone on its own; the later ones that needed it are said', async () => {
    mockParams = { part: 'changes' };
    mockAnswers['/v1/program/review/undo'] = () => ({ data: { program: PROGRAM, alsoUndone: ['c2'] }, response: { status: 200 } });
    await show();
    expect(await screen.findByText('Hamstrings: 4 sets a week, not 3')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(`${t('editProgram.undo')}: Hamstrings: 4 sets a week, not 3`));
    expect(mockPost).toHaveBeenCalledWith('/v1/program/review/undo', { body: { changeId: 'c1' } });
    expect(await screen.findByText(t('editProgram.undoneWith.one'))).toBeTruthy();
  });

  test('an undo the program no longer allows is said', async () => {
    mockParams = { part: 'changes' };
    mockAnswers['/v1/program/review/undo'] = () => ({ error: { code: 'CONFLICT' }, response: { status: 409 } });
    await show();
    await fireEvent.press(await screen.findByLabelText(`${t('editProgram.undo')}: Hamstrings: 4 sets a week, not 3`));
    expect(await screen.findByText(t('editProgram.undoConflict'))).toBeTruthy();
  });
});

test('split: the real split, and the way to another one', async () => {
  mockParams = { part: 'split' };
  await show();
  expect(await screen.findByText('Upper / Lower + Push / Pull / Legs')).toBeTruthy();
  expect(screen.getByText(t('editProgram.splitBody'))).toBeTruthy();
});

describe('rebuild for me', () => {
  test("after a confirmation, a new program from the user's training days, then back to Train", async () => {
    mockParams = { part: 'rebuild' };
    await show();
    expect(await screen.findByText(t('editProgram.rebuildBody'))).toBeTruthy();
    expect(mockPost).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(t('editProgram.rebuildConfirm')));
    expect(mockPost).toHaveBeenCalledWith('/v1/program/generate', { body: { trainingDays: ['MONDAY', 'THURSDAY'] } });
    expect(mockDismissTo).toHaveBeenCalledWith('/train');
  });

  test('no connection: said, the program as it was', async () => {
    mockParams = { part: 'rebuild' };
    mockAnswers['/v1/program/generate'] = () => {
      throw new TypeError('Network request failed');
    };
    await show();
    await fireEvent.press(await screen.findByText(t('editProgram.rebuildConfirm')));
    await act(async () => undefined);
    expect(await screen.findByText(t('editProgram.offline'))).toBeTruthy();
    expect(mockDismissTo).not.toHaveBeenCalled();
  });
});
