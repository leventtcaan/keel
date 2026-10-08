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
import type { LocalRecord } from '@/sync/store';
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
  cardio: {
    source: 'GENERATED',
    minutes: 30,
    sessionsPerWeek: 2,
    sessions: [
      { weekday: 'MONDAY', place: 'AFTER_LIFT' },
      { weekday: 'FRIDAY', place: 'AFTER_LIFT' },
    ],
    doneThisWeek: 0,
    afterLiftOverLine: false,
  },
  week: [],
};

let mockData: TrainData;
let mockAnswers: Record<string, () => unknown> = {};
const mockPost = jest.fn(async (path: string, ..._rest: unknown[]) => mockAnswers[path]());
const mockGet = jest.fn(async (path: string) => (path === '/v1/profile' ? { data: { schedule: { trainingDays: ['MONDAY', 'THURSDAY'] } }, response: { status: 200 } } : { response: { status: 404 } }));
const mockPut = jest.fn(async (..._args: unknown[]) => ({ data: PROGRAM, response: { status: 200 } }));
const mockDelete = jest.fn(async (..._args: unknown[]) => ({ data: PROGRAM, response: { status: 200 } }));
const mockServices = {
  api: {
    POST: (path: string, ...rest: unknown[]) => mockPost(path, ...rest),
    GET: (path: string) => mockGet(path),
    PUT: (...args: unknown[]) => mockPut(...args),
    DELETE: (...args: unknown[]) => mockDelete(...args),
  },
  training: { read: jest.fn(async () => mockData), own: async () => [] },
  workoutRecords: async () => mockRecords,
};
let mockRecords: LocalRecord[] = [];
/** A workout of day "a" under way on the phone. */
const UNDER_WAY: LocalRecord = {
  seq: 1,
  clientId: 'w1',
  kind: 'workout',
  parentClientId: null,
  body: { clientId: 'w1', startedAt: '2026-09-29T08:00:00Z', programDayId: 'a' },
  state: 'PENDING',
  serverId: null,
  serverBody: null,
  errorCode: null,
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
  mockRecords = [];
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
    ['Cardio', 'cardio'],
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

describe('cardio', () => {
  const cardio = (extra: Partial<Schemas['ProgramCardio']>) => {
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, cardio: { ...PROGRAM.cardio!, ...extra } } } };
  };

  test("the row says the week's cardio; off when there is none", async () => {
    await show();
    expect(await screen.findByText('2 × 30 min')).toBeTruthy();
  });

  test("its page: whose it is, the minutes and the days, each day where it goes", async () => {
    mockParams = { part: 'cardio' };
    await show();
    expect(await screen.findByText(t('editProgram.cardio.coach'))).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
    expect(screen.getByText('Mon · after lifting')).toBeTruthy();
    expect(screen.getByText('Fri · after lifting')).toBeTruthy();
    // The coach's default is the coach's: no way back to it from itself.
    expect(screen.queryByText(t('editProgram.cardio.coachDefault'))).toBeNull();
  });

  test('changed and saved: the minutes a step up, a rest day added at an easy pace, sent whole', async () => {
    mockParams = { part: 'cardio' };
    await show();
    await fireEvent.press(await screen.findByLabelText(t('programEditor.moreLabel', { what: t('editProgram.cardio.minutesLabel') })));
    await fireEvent.press(screen.getByLabelText('Sunday'));
    expect(screen.getByText('Sun · easy, no weights')).toBeTruthy();
    await fireEvent.press(screen.getByText(t('editProgram.cardio.save')));
    expect(mockPut).toHaveBeenCalledWith('/v1/program/cardio', {
      body: {
        minutes: 35,
        sessions: [
          { weekday: 'MONDAY', place: 'AFTER_LIFT' },
          { weekday: 'FRIDAY', place: 'AFTER_LIFT' },
          { weekday: 'SUNDAY', place: 'OFF_DAY_LOW_INTENSITY' },
        ],
      },
    });
    expect(await screen.findByText(t('editProgram.cardio.saved'))).toBeTruthy();
  });

  test('turned off: no session at all', async () => {
    mockParams = { part: 'cardio' };
    await show();
    await fireEvent.press(await screen.findByText(t('editProgram.cardio.turnOff')));
    expect(mockPut).toHaveBeenCalledWith('/v1/program/cardio', { body: { minutes: 30, sessions: [] } });
  });

  test("the user's own: back to the coach's default removes it", async () => {
    mockParams = { part: 'cardio' };
    cardio({ source: 'USER' });
    await show();
    expect(await screen.findByText(t('editProgram.cardio.own'))).toBeTruthy();
    await fireEvent.press(screen.getByText(t('editProgram.cardio.coachDefault')));
    expect(mockDelete).toHaveBeenCalledWith('/v1/program/cardio');
  });

  test('a session after the weights past the line: one line of information, never a block (G2 K-35)', async () => {
    mockParams = { part: 'cardio' };
    cardio({ source: 'USER', minutes: 45, afterLiftOverLine: true });
    await show();
    expect(await screen.findByText(t('decision.rule.cardio_after_lift_over_line'))).toBeTruthy();
    expect(screen.getByText(t('editProgram.cardio.save'))).toBeTruthy();
  });

  test('no cardio: off on the row, and the page starts from the start minutes', async () => {
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, cardio: undefined } } };
    await show();
    expect(await screen.findByText(t('editProgram.cardio.off'))).toBeTruthy();
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

  test('the confirmation names what goes: targets, starting weights, this week\'s changes, the user\'s own program and moves', () => {
    const body = t('editProgram.rebuildBody');
    for (const word of ['targets', 'starting weights', "this week's", 'own program']) expect(body).toContain(word);
  });

  test('a workout under way: no rebuild, and why', async () => {
    mockParams = { part: 'rebuild' };
    mockRecords = [UNDER_WAY];
    await show();
    expect(await screen.findByText(t('editProgram.rebuildUnderWay'))).toBeTruthy();
    expect(screen.queryByText(t('editProgram.rebuildConfirm'))).toBeNull();
  });

  test("days the server can't build for: said with their number, not as our failure", async () => {
    mockParams = { part: 'rebuild' };
    mockGet.mockImplementationOnce(async () => ({ data: { schedule: { trainingDays: [] } }, response: { status: 200 } }));
    mockAnswers['/v1/program/generate'] = () => ({ error: { code: 'VALIDATION_FAILED' }, response: { status: 400 } });
    await show();
    await fireEvent.press(await screen.findByText(t('editProgram.rebuildConfirm')));
    expect(await screen.findByText(t('editProgram.rebuildRefused', { count: 0 }))).toBeTruthy();
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  test('two taps on the confirmation rebuild once', async () => {
    mockParams = { part: 'rebuild' };
    await show();
    const confirm = await screen.findByText(t('editProgram.rebuildConfirm'));
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});

describe('the page shows what the server answered at once', () => {
  const NEXT: Schemas['Program'] = {
    ...PROGRAM,
    review: { id: 'rev-2', suggestions: [{ ...SUGGESTION, id: 'TOO_MANY_SETS:lats', muscle: 'lats' }], applied: [], notReviewedMoves: 0 },
  };

  test('after an apply, the next apply names the review the server answered, even before the page reads again', async () => {
    mockParams = { part: 'moves' };
    mockAnswers['/v1/program/review/apply'] = () => ({ data: NEXT, response: { status: 200 } });
    // The read after it is slow: the page still shows the program as it was read before.
    let late: (value: TrainData) => void = () => undefined;
    await show();
    mockServices.training.read.mockImplementationOnce(() => new Promise((resolve) => (late = resolve)));
    await fireEvent.press(await screen.findByLabelText(`${t('editProgram.apply')}: Chest: 12 sets a week, not 18`));
    await fireEvent.press(await screen.findByLabelText(`${t('editProgram.apply')}: Lats: 12 sets a week, not 18`));
    expect(mockPost).toHaveBeenLastCalledWith('/v1/program/review/apply', { body: { reviewId: 'rev-2', suggestionIds: ['TOO_MANY_SETS:lats'] } });
    await act(async () => late({ ...mockData, program: { state: 'ready', value: NEXT } }));
  });

  test('an undo that took a later change with it: both go from the list at once, and the page reads again', async () => {
    mockParams = { part: 'changes' };
    const second = { ...APPLIED, id: 'c2', suggestion: { ...SUGGESTION, id: 'TOO_MANY_SETS:chest' } };
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, review: { ...PROGRAM.review!, applied: [APPLIED, second] } } } };
    mockAnswers['/v1/program/review/undo'] = () => ({ data: { program: { ...PROGRAM, review: { ...PROGRAM.review!, applied: [] } }, alsoUndone: ['c2'] }, response: { status: 200 } });
    await show();
    expect(await screen.findByText('Chest: 12 sets a week, not 18')).toBeTruthy();
    // The read after the undo never ends: what the list shows comes from the undo's answer alone.
    mockServices.training.read.mockImplementationOnce(() => new Promise(() => undefined));
    await fireEvent.press(screen.getByLabelText(`${t('editProgram.undo')}: Hamstrings: 4 sets a week, not 3`));
    expect(await screen.findByText(t('editProgram.changesNone'))).toBeTruthy();
    expect(screen.queryByText('Chest: 12 sets a week, not 18')).toBeNull();
    expect(screen.queryByText('Hamstrings: 4 sets a week, not 3')).toBeNull();
    expect(screen.getByText(t('editProgram.undoneWith.one'))).toBeTruthy();
  });

  test('two taps on Apply send once', async () => {
    mockParams = { part: 'moves' };
    let answer: (value: unknown) => void = () => undefined;
    mockAnswers['/v1/program/review/apply'] = () => new Promise((resolve) => (answer = resolve));
    await show();
    const apply = await screen.findByLabelText(`${t('editProgram.apply')}: Chest: 12 sets a week, not 18`);
    await fireEvent.press(apply);
    await fireEvent.press(apply);
    expect(mockPost).toHaveBeenCalledTimes(1);
    await act(async () => answer({ data: PROGRAM, response: { status: 200 } }));
  });

  test('after an undo the page reads the program again', async () => {
    mockParams = { part: 'changes' };
    await show();
    await fireEvent.press(await screen.findByLabelText(`${t('editProgram.undo')}: Hamstrings: 4 sets a week, not 3`));
    expect(mockServices.training.read).toHaveBeenCalledTimes(2);
  });
});
