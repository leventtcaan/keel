/**
 * Edit program (K-970, ADR-073 #3-#4; prototype sheet `#editprog`). Each part is a page of its own, not a toast: the
 * training days, the moves with the review's flags (each suggestion applied from here), the changes from the review in
 * force (each undone, with the later ones that needed it said), the split as it really is, and "Rebuild for me" (a new
 * program from the user's training days, after a confirmation). Days and moves are edited here in the program editor
 * (ADR-073 #4): sent by their ids (PATCH /v1/program, K-995) so a move kept keeps its target; the moves whose target an
 * edit takes are said before saving; the answer is the program shown, with Saved and Undo.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import EditProgramScreen from '@/app/edit-program';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { workoutParams } from '@/train/params';
import { ThemeProvider } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
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
const profileAnswer = async (path: string) => (path === '/v1/profile' ? { data: { schedule: { trainingDays: ['MONDAY', 'THURSDAY'] } }, response: { status: 200 } } : { response: { status: 404 } });
const mockGet = jest.fn(profileAnswer);
const mockPut = jest.fn(async (..._args: unknown[]) => ({ data: PROGRAM, response: { status: 200 } }));
const mockDelete = jest.fn(async (..._args: unknown[]) => ({ data: PROGRAM, response: { status: 200 } }));
const mockPatch = jest.fn(async (..._args: unknown[]) => ({ data: PROGRAM, response: { status: 200 } }));
const mockReport = jest.fn();
const mockSaved = jest.fn(async (_move: unknown) => {});
const mockServices = {
  api: {
    POST: (path: string, ...rest: unknown[]) => mockPost(path, ...rest),
    GET: (path: string) => mockGet(path),
    PUT: (...args: unknown[]) => mockPut(...args),
    DELETE: (...args: unknown[]) => mockDelete(...args),
    PATCH: (...args: unknown[]) => mockPatch(...args),
  },
  report: (...args: unknown[]) => mockReport(...args),
  training: { read: jest.fn(async () => mockData), own: async () => [], saved: (move: unknown) => mockSaved(move) },
  workoutRecords: async () => mockRecords,
};
let mockRecords: LocalRecord[] = [];
/** A workout of day "a" under way on the phone. */
const UNDER_WAY: LocalRecord = {
  seq: 1,
  clientId: 'w1',
  kind: 'workout',
  parentClientId: null,
  body: { clientId: 'w1', startedAt: new Date(Date.now() - 60 * 60_000).toISOString(), programDayId: 'a' },
  state: 'PENDING',
  serverId: null,
  serverBody: null,
  errorCode: null,
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
let mockParams: Record<string, string> = {};
/** The options the screen gave its Stack.Screen last (the iOS edge swipe back is one of them). */
let mockScreenOptions: { gestureEnabled?: boolean } | undefined;
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: { options?: { gestureEnabled?: boolean } }) => {
      mockScreenOptions = options;
      return null;
    },
  },
  router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn(), dismissTo: (...args: unknown[]) => mockDismissTo(...args) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockImplementation(profileAnswer);
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: [] }, kept: false };
  mockParams = {};
  mockScreenOptions = undefined;
  mockRecords = [];
  mockAnswers = {
    '/v1/program/review/apply': () => ({ data: PROGRAM, response: { status: 200 } }),
    '/v1/program/review/undo': () => ({ data: { program: PROGRAM, alsoUndone: [] }, response: { status: 200 } }),
    '/v1/program/generate': () => ({ data: PROGRAM, response: { status: 200 } }),
    '/v1/custom-exercises': () => ({ data: { id: 'custom:8a1d', name: 'Landmine press', kind: 'COMPOUND', load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false }, response: { status: 200 } }),
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

/** The program with its rows' and days' ids, and a next target on the bench press (what an edit can take away). */
const row = (id: string, exerciseId: string, extra: Partial<Schemas['PlannedExercise']> = {}): Schemas['PlannedExercise'] => ({ ...planned(exerciseId), id, ...extra });
const EDITABLE: Schemas['Program'] = {
  ...PROGRAM,
  days: [
    { id: 'a', nameKey: 'programDays.upper.name', weekday: 'MONDAY', exercises: [row('r1', 'bench_press', { nextLoadKg: 80, nextReps: 8 }), row('r2', 'lat_pulldown')] },
    { id: 'b', nameKey: 'programDays.lower.name', weekday: 'WEDNESDAY', exercises: [row('r3', 'squat')] },
  ],
};
const AFTER: Schemas['Program'] = {
  ...EDITABLE,
  // A generated day renamed has the user's name in place of its key (the server, ADR-073 Ek 7).
  days: [{ id: 'a', name: 'Chest day', weekday: 'MONDAY', exercises: EDITABLE.days[0].exercises }, EDITABLE.days[1]],
  review: { id: 'rev-2', suggestions: [], applied: [], edits: [{ id: 'e1', editedAt: '2026-10-09T10:00:00Z' }] },
};
const editable = (program: Schemas['Program'] = EDITABLE) => {
  mockData = { ...mockData, program: { state: 'ready', value: program } };
};
const rename = async (to: string) => fireEvent.changeText(await screen.findByLabelText(t('programEditor.dayName')), to);
const save = () => fireEvent.press(screen.getByText(t('editProgram.save')));
const step = (label: string, by: 'less' | 'more') => fireEvent.press(screen.getByLabelText(t(`programEditor.${by}Label`, { what: label })));
const benchMin = t('programEditor.minLabel', { move: 'Bench press' });
const patched = () => mockPatch.mock.calls[0][1] as { body: Schemas['ProgramEdit'] };

describe('training days and moves: edited here (ADR-073 #4)', () => {
  test.each(['days', 'moves'])('the %s page holds the program editor, not a note that it cannot be changed', async (part) => {
    mockParams = { part };
    await show();
    expect(await screen.findByText('Upper')).toBeTruthy();
    expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Upper');
    expect(screen.getByText(t('programEditor.addDay'))).toBeTruthy();
    expect(screen.queryByText(/can't be changed here/)).toBeNull();
  });

  test('each day on its weekday, with its moves', async () => {
    mockParams = { part: 'days' };
    await show();
    expect(await screen.findByText('Upper')).toBeTruthy();
    expect(screen.getByText('Monday · 2 moves')).toBeTruthy();
    expect(screen.getByText('Lower')).toBeTruthy();
    expect(screen.getByText('Wednesday · 1 move')).toBeTruthy();
    expect(screen.getByText('Push')).toBeTruthy();
    expect(screen.getByText('Friday · 1 move')).toBeTruthy();
  });

  test('nothing changed: Save is off and nothing is sent', async () => {
    mockParams = { part: 'days' };
    editable();
    await show();
    await screen.findByText('Upper');
    expect(screen.getByRole('button', { name: t('editProgram.save') })).toBeDisabled();
    await save();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  test.each([
    ['a day moved to another weekday and back', async () => {
      await fireEvent.press(screen.getByLabelText('Tuesday'));
      await fireEvent.press(screen.getByLabelText('Monday'));
    }],
    ['a space after a name', async () => rename('Upper ')],
    ['a name typed and the old one typed again', async () => {
      await rename('Chest day');
      await rename('Upper');
    }],
    ['a move stepped and stepped back', async () => {
      await step(t('programEditor.setsLabel', { move: 'Bench press' }), 'more');
      await step(t('programEditor.setsLabel', { move: 'Bench press' }), 'less');
    }],
  ])('%s is no edit: Save is off and nothing is sent', async (_what, change) => {
    mockParams = { part: 'days' };
    editable();
    await show();
    await screen.findByText('Upper');
    await change();
    expect(screen.getByRole('button', { name: t('editProgram.save') })).toBeDisabled();
    await save();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  test('the server saved nothing (no new edit in its answer): Saved, and no Undo that would take an earlier edit back', async () => {
    mockParams = { part: 'days' };
    const earlier: Schemas['Program'] = { ...EDITABLE, review: { id: 'rev-2', suggestions: [], applied: [], edits: [{ id: 'e0', editedAt: '2026-10-08T10:00:00Z' }] } };
    editable(earlier);
    mockPatch.mockImplementationOnce(async () => ({ data: earlier, response: { status: 200 } }));
    await show();
    await rename('Chest day');
    mockServices.training.read.mockImplementationOnce(() => new Promise(() => undefined));
    await save();
    expect(await screen.findByText(t('editProgram.saved'))).toBeTruthy();
    expect(screen.queryByLabelText(t('editProgram.undoEditLabel'))).toBeNull();
    expect(screen.queryByText(t('editProgram.undo'))).toBeNull();
  });

  test('Undo takes back this edit (the new one in the answer), not an earlier one', async () => {
    mockParams = { part: 'days' };
    const earlier: Schemas['Program'] = { ...EDITABLE, review: { id: 'rev-2', suggestions: [], applied: [], edits: [{ id: 'e0', editedAt: '2026-10-08T10:00:00Z' }] } };
    const both: Schemas['Program'] = {
      ...AFTER,
      review: { id: 'rev-3', suggestions: [], applied: [], edits: [{ id: 'e0', editedAt: '2026-10-08T10:00:00Z' }, { id: 'e1', editedAt: '2026-10-09T10:00:00Z' }] },
    };
    editable(earlier);
    mockPatch.mockImplementationOnce(async () => ({ data: both, response: { status: 200 } }));
    await show();
    await rename('Chest day');
    mockServices.training.read.mockImplementationOnce(() => new Promise(() => undefined));
    await save();
    await fireEvent.press(await screen.findByLabelText(t('editProgram.undoEditLabel')));
    expect(mockPost).toHaveBeenCalledWith('/v1/program/review/undo', { body: { changeId: 'e1' } });
  });

  test('a day renamed and saved goes by its ids: only the renamed day carries a name, the moves keep their rows', async () => {
    mockParams = { part: 'days' };
    editable();
    mockPatch.mockImplementationOnce(async () => ({ data: AFTER, response: { status: 200 } }));
    await show();
    await rename('Chest day');
    await save();
    expect(patched().body).toEqual({
      days: [
        {
          id: 'a',
          name: 'Chest day',
          weekday: 'MONDAY',
          exercises: [
            { id: 'r1', exerciseId: 'bench_press', sets: 3, reps: { min: 6, max: 10 } },
            { id: 'r2', exerciseId: 'lat_pulldown', sets: 3, reps: { min: 6, max: 10 } },
          ],
        },
        { id: 'b', weekday: 'WEDNESDAY', exercises: [{ id: 'r3', exerciseId: 'squat', sets: 3, reps: { min: 6, max: 10 } }] },
      ],
    });
    expect(mockPatch.mock.calls[0][0]).toBe('/v1/program');
  });

  test('saved: the program the server answered is on screen, with Saved and Undo', async () => {
    mockParams = { part: 'days' };
    editable();
    mockPatch.mockImplementationOnce(async () => ({ data: AFTER, response: { status: 200 } }));
    await show();
    await rename('Chest day');
    // The read after it never ends: what the page shows comes from the answer alone.
    mockServices.training.read.mockImplementationOnce(() => new Promise(() => undefined));
    await save();
    expect(await screen.findByText(t('editProgram.saved'))).toBeTruthy();
    expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Chest day');
    expect(screen.getByText(t('editProgram.undo'))).toBeTruthy();
    // Saved is not a draft: nothing left to save.
    expect(screen.getByRole('button', { name: t('editProgram.save') })).toBeDisabled();
    mockPatch.mockClear();
    await save();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  test("Undo takes the edit back by the edit's id, and says the later changes that went with it", async () => {
    mockParams = { part: 'days' };
    editable();
    mockPatch.mockImplementationOnce(async () => ({ data: AFTER, response: { status: 200 } }));
    mockAnswers['/v1/program/review/undo'] = () => ({ data: { program: EDITABLE, alsoUndone: ['c2', 'c3'] }, response: { status: 200 } });
    await show();
    await rename('Chest day');
    mockServices.training.read.mockImplementationOnce(() => new Promise(() => undefined));
    await save();
    await fireEvent.press(await screen.findByLabelText(t('editProgram.undoEditLabel')));
    expect(mockPost).toHaveBeenCalledWith('/v1/program/review/undo', { body: { changeId: 'e1' } });
    expect(await screen.findByText(t('editProgram.undoneWith.other', { count: 2 }))).toBeTruthy();
    expect(screen.queryByText(t('editProgram.saved'))).toBeNull();
    expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Upper');
  });

  test('an undo the program no longer allows is said', async () => {
    mockParams = { part: 'days' };
    editable();
    mockPatch.mockImplementationOnce(async () => ({ data: AFTER, response: { status: 200 } }));
    mockAnswers['/v1/program/review/undo'] = () => ({ error: { code: 'CONFLICT' }, response: { status: 409 } });
    await show();
    await rename('Chest day');
    await save();
    await fireEvent.press(await screen.findByLabelText(t('editProgram.undoEditLabel')));
    expect(await screen.findByText(t('editProgram.undoConflict'))).toBeTruthy();
    // The edit cannot be undone any more: no button left to press.
    expect(screen.queryByLabelText(t('editProgram.undoEditLabel'))).toBeNull();
  });

  test('a day moved to another weekday, a move stepped: sent as the user left them', async () => {
    mockParams = { part: 'moves' };
    editable();
    await show();
    await fireEvent.press(screen.getByLabelText('Tuesday'));
    await step(t('programEditor.setsLabel', { move: 'Bench press' }), 'more');
    await save();
    const days = patched().body.days;
    expect(days[0].weekday).toBe('TUESDAY');
    expect(days[0].exercises[0]).toEqual({ id: 'r1', exerciseId: 'bench_press', sets: 4, reps: { min: 6, max: 10 } });
  });

  test("a move added has no row id; an own move is made at once (POST /v1/custom-exercises), then in the day", async () => {
    mockParams = { part: 'moves' };
    editable();
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('programEditor.addMove') }));
    await fireEvent.changeText(await screen.findByLabelText(t('programEditor.search')), 'Landmine press');
    await fireEvent.press(screen.getByText(t('programEditor.addOwn')));
    await fireEvent.press(screen.getByRole('button', { name: `${t('ownMove.kind')} ${t('ownMove.kinds.COMPOUND')}` }));
    await fireEvent.press(screen.getByRole('button', { name: `${t('ownMove.equipment')} ${t('ownMove.equipments.BARBELL')}` }));
    await fireEvent.press(screen.getByRole('button', { name: `${t('ownMove.unilateral')} ${t('ownMove.no')}` }));
    await fireEvent.press(screen.getByText(t('ownMove.save')));
    await act(async () => undefined);
    expect(mockPost).toHaveBeenCalledWith('/v1/custom-exercises', { body: expect.objectContaining({ name: 'Landmine press', kind: 'COMPOUND' }) });
    expect(mockSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'custom:8a1d' }));
    expect(screen.getByText('Landmine press')).toBeTruthy();
    await save();
    expect(patched().body.days[0].exercises.at(-1)).toEqual({ exerciseId: 'custom:8a1d', sets: expect.any(Number), reps: expect.any(Object) });
  });

  test('an own move the server refuses is not in the day, and the code (never the name) is reported', async () => {
    mockParams = { part: 'moves' };
    editable();
    mockAnswers['/v1/custom-exercises'] = () => ({ error: { code: 'VALIDATION_FAILED' }, response: { status: 400 } });
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: t('programEditor.addMove') }));
    await fireEvent.changeText(await screen.findByLabelText(t('programEditor.search')), 'Landmine press');
    await fireEvent.press(screen.getByText(t('programEditor.addOwn')));
    await fireEvent.press(screen.getByRole('button', { name: `${t('ownMove.kind')} ${t('ownMove.kinds.COMPOUND')}` }));
    await fireEvent.press(screen.getByRole('button', { name: `${t('ownMove.equipment')} ${t('ownMove.equipments.BARBELL')}` }));
    await fireEvent.press(screen.getByRole('button', { name: `${t('ownMove.unilateral')} ${t('ownMove.no')}` }));
    await fireEvent.press(screen.getByText(t('ownMove.save')));
    await act(async () => undefined);
    expect(mockReport).toHaveBeenCalledWith({ name: 'VALIDATION_FAILED' });
    expect(mockSaved).not.toHaveBeenCalled();
  });

  test('a day without a name or a move: Save is off and one line says what a day needs', async () => {
    mockParams = { part: 'days' };
    editable();
    await show();
    await rename('   ');
    expect(screen.getByText(t('editProgram.notReady'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t('editProgram.save') })).toBeDisabled();
    await save();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  test('two taps on Save send once', async () => {
    mockParams = { part: 'days' };
    editable();
    let answer: (value: unknown) => void = () => undefined;
    mockPatch.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)) as never);
    await show();
    await rename('Chest day');
    await save();
    await save();
    expect(mockPatch).toHaveBeenCalledTimes(1);
    await act(async () => answer({ data: AFTER, response: { status: 200 } }));
  });

  describe('the targets an edit takes (ADR-073 Ek 7)', () => {
    test('a move with a target given another rep range: said by name before saving, nothing sent yet', async () => {
      mockParams = { part: 'moves' };
      editable();
      await show();
      await step(benchMin, 'more');
      await save();
      expect(await screen.findByText(t('editProgram.targetsLost', { moves: 'Bench press' }))).toBeTruthy();
      expect(mockPatch).not.toHaveBeenCalled();
    });

    test('Save anyway sends the edit', async () => {
      mockParams = { part: 'moves' };
      editable();
      await show();
      await step(benchMin, 'more');
      await save();
      await fireEvent.press(await screen.findByText(t('editProgram.saveAnyway')));
      expect(mockPatch).toHaveBeenCalledTimes(1);
      expect(patched().body.days[0].exercises[0].reps).toEqual({ min: 7, max: 10 });
    });

    test('Keep editing sends nothing and the draft stays', async () => {
      mockParams = { part: 'moves' };
      editable();
      await show();
      await step(benchMin, 'more');
      await save();
      await fireEvent.press(await screen.findByText(t('editProgram.keepEditing')));
      expect(screen.queryByText(t('editProgram.targetsLost', { moves: 'Bench press' }))).toBeNull();
      expect(mockPatch).not.toHaveBeenCalled();
      expect(screen.getByRole('adjustable', { name: benchMin })).toHaveAccessibilityValue({ text: '7' });
    });

    test('other sets, or a move with no target: no warning', async () => {
      mockParams = { part: 'moves' };
      editable();
      await show();
      await step(t('programEditor.setsLabel', { move: 'Bench press' }), 'more');
      await step(t('programEditor.minLabel', { move: 'Lat pulldown' }), 'more');
      await save();
      expect(screen.queryByText(t('editProgram.saveAnyway'))).toBeNull();
      expect(mockPatch).toHaveBeenCalledTimes(1);
    });

    test('editing again takes the warning down: it is said for the draft as it is then', async () => {
      mockParams = { part: 'moves' };
      editable();
      await show();
      await step(benchMin, 'more');
      await save();
      await step(benchMin, 'less');
      expect(screen.queryByText(t('editProgram.saveAnyway'))).toBeNull();
    });
  });

  describe('when the server says no', () => {
    const attempt = async () => {
      mockParams = { part: 'days' };
      editable();
      await show();
      await rename('Chest day');
      await save();
    };

    const conflict = async () => ({ error: { code: 'CONFLICT' }, response: { status: 409 } }) as never;

    test("409 with the program's days and rows all still there (today's workout): the edits stay, and it is said why", async () => {
      mockPatch.mockImplementationOnce(conflict);
      await attempt();
      expect(await screen.findByText(t('editProgram.editConflictKept'))).toBeTruthy();
      expect(screen.queryByText(t('editProgram.editConflictCleared'))).toBeNull();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Chest day');
      expect(screen.getByRole('button', { name: t('editProgram.save') })).toBeEnabled();
    });

    test('409 with a day the draft names gone: the edits are cleared, said so, and the program as it is now is shown', async () => {
      mockPatch.mockImplementationOnce(async () => {
        mockData = { ...mockData, program: { state: 'ready', value: { ...EDITABLE, days: [EDITABLE.days[0]] } } };
        return conflict();
      });
      await attempt();
      expect(await screen.findByText(t('editProgram.editConflictCleared'))).toBeTruthy();
      expect(screen.queryByText(t('editProgram.editConflictKept'))).toBeNull();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Upper');
      expect(screen.queryByText('Lower')).toBeNull();
    });

    test('409 with a row the draft names gone (a move taken out elsewhere): the edits are cleared too', async () => {
      mockPatch.mockImplementationOnce(async () => {
        const days = [{ ...EDITABLE.days[0], exercises: [EDITABLE.days[0].exercises[0]] }, EDITABLE.days[1]];
        mockData = { ...mockData, program: { state: 'ready', value: { ...EDITABLE, days } } };
        return conflict();
      });
      await attempt();
      expect(await screen.findByText(t('editProgram.editConflictCleared'))).toBeTruthy();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Upper');
    });

    test('409 and the program cannot be read again: the edits stay, and the cause is not guessed', async () => {
      mockPatch.mockImplementationOnce(async () => {
        mockServices.training.read.mockImplementationOnce(async () => {
          throw new TypeError('Network request failed');
        });
        return conflict();
      });
      await attempt();
      expect(await screen.findByText(t('editProgram.editConflictUnknown'))).toBeTruthy();
      expect(screen.queryByText(t('editProgram.editConflictKept'))).toBeNull();
      expect(screen.queryByText(t('editProgram.editConflictCleared'))).toBeNull();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Chest day');
    });

    test('409 and the read is the phone\'s own copy: the cause is not guessed either, the edits stay', async () => {
      mockPatch.mockImplementationOnce(async () => {
        mockData = { ...mockData, kept: true };
        return conflict();
      });
      await attempt();
      expect(await screen.findByText(t('editProgram.editConflictUnknown'))).toBeTruthy();
      expect(screen.queryByText(t('editProgram.editConflictKept'))).toBeNull();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Chest day');
    });

    test('400: said as ours to fix, the draft stays', async () => {
      mockPatch.mockImplementationOnce(async () => ({ error: { code: 'VALIDATION_FAILED' }, response: { status: 400 } }) as never);
      await attempt();
      expect(await screen.findByText(t('editProgram.editRefused'))).toBeTruthy();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Chest day');
    });

    test('no connection: said, the draft stays, trying again sends the same', async () => {
      mockPatch.mockImplementationOnce(async () => {
        throw new TypeError('Network request failed');
      });
      await attempt();
      expect(await screen.findByText(t('editProgram.offline'))).toBeTruthy();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Chest day');
      await save();
      expect(mockPatch.mock.calls[1]).toEqual(mockPatch.mock.calls[0]);
    });

    test('anything else: said as ours, the draft stays', async () => {
      mockPatch.mockImplementationOnce(async () => ({ error: { code: 'INTERNAL' }, response: { status: 500 } }) as never);
      await attempt();
      expect(await screen.findByText(t('editProgram.failed'))).toBeTruthy();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Chest day');
    });
  });

  describe('Back with edits not saved', () => {
    test('asks first: leaving throws the edits away', async () => {
      mockParams = { part: 'days' };
      editable();
      await show();
      await rename('Chest day');
      await fireEvent.press(screen.getByText(t('editProgram.back')));
      expect(router.back).not.toHaveBeenCalled();
      expect(screen.getByText(t('editProgram.leaveWarn'))).toBeTruthy();
      await fireEvent.press(screen.getByText(t('editProgram.keepEditing')));
      expect(screen.queryByText(t('editProgram.leaveWarn'))).toBeNull();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Chest day');
      await fireEvent.press(screen.getByText(t('editProgram.back')));
      await fireEvent.press(screen.getByText(t('editProgram.leave')));
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    test('Back warned, then Save: the warning goes (a failed save keeps the edits, and the warning is stale)', async () => {
      mockParams = { part: 'days' };
      editable();
      mockPatch.mockImplementationOnce(async () => {
        throw new TypeError('Network request failed');
      });
      await show();
      await rename('Chest day');
      await fireEvent.press(screen.getByText(t('editProgram.back')));
      expect(screen.getByText(t('editProgram.leaveWarn'))).toBeTruthy();
      await save();
      expect(await screen.findByText(t('editProgram.offline'))).toBeTruthy();
      expect(screen.queryByText(t('editProgram.leaveWarn'))).toBeNull();
      expect(screen.getByLabelText(t('programEditor.dayName'))).toHaveProp('value', 'Chest day');
    });

    test('Back warned, then another edit: the warning goes', async () => {
      mockParams = { part: 'days' };
      editable();
      await show();
      await rename('Chest day');
      await fireEvent.press(screen.getByText(t('editProgram.back')));
      expect(screen.getByText(t('editProgram.leaveWarn'))).toBeTruthy();
      await rename('Chest day 2');
      expect(screen.queryByText(t('editProgram.leaveWarn'))).toBeNull();
    });

    test('the iOS edge swipe back is off while edits are not saved, on when there is nothing to lose or once saved', async () => {
      mockParams = { part: 'days' };
      editable();
      mockPatch.mockImplementationOnce(async () => ({ data: AFTER, response: { status: 200 } }));
      await show();
      await screen.findByText('Upper');
      expect(mockScreenOptions?.gestureEnabled).toBe(true);
      await rename('Chest day');
      expect(mockScreenOptions?.gestureEnabled).toBe(false);
      await save();
      expect(await screen.findByText(t('editProgram.saved'))).toBeTruthy();
      expect(mockScreenOptions?.gestureEnabled).toBe(true);
    });

    test('nothing to lose: Back goes at once', async () => {
      mockParams = { part: 'days' };
      editable();
      await show();
      await screen.findByText('Upper');
      await rename('Upper ');
      await fireEvent.press(screen.getByText(t('editProgram.back')));
      expect(router.back).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(t('editProgram.leaveWarn'))).toBeNull();
    });
  });

  test('a review flag cannot be applied over an edit not saved yet: it would throw the edit away', async () => {
    mockParams = { part: 'moves' };
    editable();
    await show();
    await step(t('programEditor.setsLabel', { move: 'Bench press' }), 'more');
    expect(screen.getByLabelText(`${t('editProgram.apply')}: Chest: 12 sets a week, not 18`)).toBeDisabled();
    expect(screen.getByText(t('editProgram.applyAfterSave'))).toBeTruthy();
  });
});

describe('moves', () => {
  test('every move of every day with its sets and rep range (the four of the program)', async () => {
    mockParams = { part: 'moves' };
    await show();
    // One day is open at a time: each is opened in turn.
    const read = (move: string) =>
      (['sets', 'min', 'max'] as const).map((field) => screen.getByRole('adjustable', { name: t(`programEditor.${field}Label`, { move }) }).props.accessibilityValue.text);
    await screen.findByText('Bench press');
    expect(read('Bench press')).toEqual(['3', '6', '10']);
    expect(read('Lat pulldown')).toEqual(['3', '6', '10']);
    await fireEvent.press(screen.getByLabelText('Lower, Wednesday, 1 move'));
    expect(read('Squat')).toEqual(['3', '6', '10']);
    await fireEvent.press(screen.getByLabelText('Push, Friday, 1 move'));
    expect(read('Dumbbell shoulder press')).toEqual(['3', '6', '10']);
  });

  test("each day's moves, and the review's flags with what each changes", async () => {
    mockParams = { part: 'moves' };
    await show();
    expect(await screen.findByText('Bench press')).toBeTruthy();
    expect(screen.getByRole('adjustable', { name: t('programEditor.setsLabel', { move: 'Bench press' }) })).toHaveAccessibilityValue({ text: '3' });
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

  const USER_CARDIO: Schemas['Program'] = {
    ...PROGRAM,
    cardio: { ...PROGRAM.cardio!, source: 'USER', minutes: 35, sessionsPerWeek: 1, sessions: [{ weekday: 'MONDAY', place: 'AFTER_LIFT' }] },
  };

  test('saved: the page shows the cardio the server answered', async () => {
    mockParams = { part: 'cardio' };
    mockPut.mockImplementationOnce(async () => ({ data: USER_CARDIO, response: { status: 200 } }));
    await show();
    // The read after it never ends: what the page shows comes from the answer alone.
    mockServices.training.read.mockImplementationOnce(() => new Promise(() => undefined));
    await fireEvent.press(await screen.findByText(t('editProgram.cardio.save')));
    expect(await screen.findByText(t('editProgram.cardio.own'))).toBeTruthy();
    expect(screen.getByText('35 min')).toBeTruthy();
    expect(screen.queryByText('Fri · after lifting')).toBeNull();
  });

  test.each([
    ['400', async () => ({ error: { code: 'VALIDATION_FAILED' }, response: { status: 400 } }), 'editProgram.failed'],
    ['404', async () => ({ error: { code: 'NOT_FOUND' }, response: { status: 404 } }), 'editProgram.failed'],
    [
      'no connection',
      async () => {
        throw new TypeError('Network request failed');
      },
      'editProgram.offline',
    ],
  ])('a save that fails (%s): said, the draft stays, and trying again sends the same', async (_, failure, key) => {
    mockParams = { part: 'cardio' };
    mockPut.mockImplementationOnce(failure as never);
    await show();
    await fireEvent.press(await screen.findByLabelText(t('programEditor.moreLabel', { what: t('editProgram.cardio.minutesLabel') })));
    await fireEvent.press(screen.getByLabelText('Sunday'));
    await fireEvent.press(screen.getByText(t('editProgram.cardio.save')));
    expect(await screen.findByText(t(key))).toBeTruthy();
    // The page read again after the failure: the draft is still the user's.
    expect(screen.getByText('35 min')).toBeTruthy();
    expect(screen.getByText('Sun · easy, no weights')).toBeTruthy();
    await fireEvent.press(screen.getByText(t('editProgram.cardio.save')));
    expect(mockPut.mock.calls[1]).toEqual(mockPut.mock.calls[0]);
  });

  test('two taps on Save send once', async () => {
    mockParams = { part: 'cardio' };
    let answer: (value: unknown) => void = () => undefined;
    mockPut.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)) as never);
    await show();
    const save = await screen.findByText(t('editProgram.cardio.save'));
    await fireEvent.press(save);
    await fireEvent.press(save);
    expect(mockPut).toHaveBeenCalledTimes(1);
    await act(async () => answer({ data: PROGRAM, response: { status: 200 } }));
  });

  test('no day chosen: Save is off (only "Turn cardio off" sends no day)', async () => {
    mockParams = { part: 'cardio' };
    await show();
    await fireEvent.press(await screen.findByLabelText('Monday'));
    await fireEvent.press(screen.getByLabelText('Friday'));
    await fireEvent.press(screen.getByText(t('editProgram.cardio.save')));
    expect(mockPut).not.toHaveBeenCalled();
  });

  test('cardio already off: no "Turn cardio off"', async () => {
    mockParams = { part: 'cardio' };
    cardio({ source: 'USER', sessionsPerWeek: 0, sessions: [] });
    await show();
    expect(await screen.findByText(t('editProgram.cardio.save'))).toBeTruthy();
    expect(screen.queryByText(t('editProgram.cardio.turnOff'))).toBeNull();
  });

  test("back to the coach's default: confirmed, and the over-the-line note goes with the user's cardio", async () => {
    mockParams = { part: 'cardio' };
    cardio({ source: 'USER', minutes: 45, afterLiftOverLine: true });
    mockDelete.mockImplementationOnce(async () => ({ data: PROGRAM, response: { status: 200 } }));
    await show();
    // The read after it never ends: what the page shows comes from the answer alone.
    mockServices.training.read.mockImplementationOnce(() => new Promise(() => undefined));
    await fireEvent.press(await screen.findByText(t('editProgram.cardio.coachDefault')));
    expect(await screen.findByText(t('editProgram.cardio.coachBack'))).toBeTruthy();
    expect(screen.queryByText(t('decision.rule.cardio_after_lift_over_line'))).toBeNull();
    expect(screen.getByText(t('editProgram.cardio.coach'))).toBeTruthy();
  });

  test('days on no weekday: a day goes after lifting on the training days the profile has; easy on the others', async () => {
    mockParams = { part: 'cardio' };
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, cardio: undefined, days: PROGRAM.days.map(({ weekday: _w, ...d }) => d) } } };
    await show();
    await fireEvent.press(await screen.findByLabelText('Thursday'));
    await fireEvent.press(screen.getByLabelText('Sunday'));
    expect(screen.getByText('Thu · after lifting')).toBeTruthy();
    expect(screen.getByText('Sun · easy, no weights')).toBeTruthy();
  });

  test('days on no weekday and no profile read: no place is guessed, every day after lifting', async () => {
    mockParams = { part: 'cardio' };
    mockGet.mockImplementation(async () => ({ response: { status: 404 } }) as never);
    mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, cardio: undefined, days: PROGRAM.days.map(({ weekday: _w, ...d }) => d) } } };
    await show();
    await fireEvent.press(await screen.findByLabelText('Sunday'));
    expect(screen.getByText('Sun · after lifting')).toBeTruthy();
  });

  test('day chips are full touch targets; the minutes say their value and are said when they change', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    mockParams = { part: 'cardio' };
    await show();
    expect(await screen.findByLabelText('Sunday')).toHaveStyle({ minHeight: tokens.size.touch });
    expect(screen.getByLabelText(t('editProgram.cardio.minutesLabel'))).toHaveProp('accessibilityValue', { text: '30 min' });
    await fireEvent.press(screen.getByLabelText(t('programEditor.moreLabel', { what: t('editProgram.cardio.minutesLabel') })));
    expect(said).toHaveBeenCalledWith('35 min');
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

  test("a workout left open past the server's close is not under way: the rebuild is offered", async () => {
    mockParams = { part: 'rebuild' };
    const left = { ...UNDER_WAY, body: { ...(UNDER_WAY.body as object), startedAt: new Date(Date.now() - (workoutParams.unfinishedSessionCloseHours + 2) * 3_600_000).toISOString() } };
    mockRecords = [left];
    await show();
    expect(await screen.findByText(t('editProgram.rebuildConfirm'))).toBeTruthy();
    expect(screen.queryByText(t('editProgram.rebuildUnderWay'))).toBeNull();
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
