/**
 * Flow test B (prototip/akis-testi.md, tail of B: Train → Change → Edit → Swap; K-970). Walked through the real screens
 * with a server that keeps what it is told: "Gym is busy" asks which move is taken and swaps it for today; the card then
 * shows the move in its place; Edit opens its parts as pages and applies a review flag; the card's swap on the swapped
 * move offers the planned move back. Each step checks where the app went, as the prototype's test checks the screen id.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import TrainScreen from '@/app/(tabs)/train';
import EditProgramScreen from '@/app/edit-program';
import SwapScreen from '@/app/swap';
import TodayChangeScreen from '@/app/today-change';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const planned = (exerciseId: string, swapOptions: string[] = []): Schemas['PlannedExercise'] => ({
  exerciseId,
  baseSets: 3,
  sets: 3,
  reps: { min: 6, max: 10 },
  targetRir: 1,
  swapOptions,
});
const SUGGESTION: Schemas['ReviewSuggestion'] = {
  id: 'TOO_FEW_SETS:hamstrings',
  finding: 'TOO_FEW_SETS',
  muscle: 'hamstrings',
  numbers: { from: 3, to: 4, min: 4 },
  copyKey: 'review.too_few_sets',
  reason: { rule: 'too_few_sets', source: { tag: 'EXPERIENCE' } } as Schemas['Reason'],
};
const DAY: Schemas['ProgramDay'] = {
  id: 'a',
  name: 'Push',
  weekday: 'TUESDAY',
  exercises: [planned('bench_press', ['dumbbell_bench_press']), planned('dumbbell_shoulder_press')],
};
const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'OWN',
  days: [DAY],
  review: { id: 'rev-1', suggestions: [SUGGESTION], applied: [], notReviewedMoves: 0 },
  week: [{ programDayId: 'a', date: '2026-09-29', exerciseIds: ['bench_press', 'dumbbell_shoulder_press'] }],
};

// The server: the program as it is, changed by what it is sent.
let program: Schemas['Program'];
const sent: { path: string; body: unknown }[] = [];
const ok = (data: unknown) => ({ data, response: { status: 200 } });
const mockApi = {
  GET: async (path: string) => (path === '/v1/program' ? ok(program) : { response: { status: 404 } }),
  POST: async (path: string, init: { body: unknown }) => {
    sent.push({ path, body: init.body });
    if (path === '/v1/program/swap') {
      const body = init.body as Schemas['MoveSwap'];
      const back = body.to === body.exerciseId;
      const swaps = back ? [] : [{ insteadOf: body.exerciseId, exercise: planned(body.to, [body.exerciseId]) }];
      const ids = DAY.exercises.map((e) => (e.exerciseId === body.exerciseId && !back ? body.to : e.exerciseId));
      program = { ...program, week: [{ programDayId: 'a', date: '2026-09-29', exerciseIds: ids, ...(back ? {} : { swaps }) }] };
    }
    if (path === '/v1/program/review/apply') program = { ...program, review: { id: 'rev-2', suggestions: [], applied: [{ id: 'c1', appliedAt: '2026-09-29T09:00:00Z', suggestion: SUGGESTION }] } };
    return ok(program);
  },
};
const read = async (): Promise<TrainData> => ({ program: { state: 'ready', value: program }, exercises: { state: 'ready', value: [] }, kept: false });
const mockServices = {
  api: mockApi,
  training: { read, own: async () => [] },
  state: { current: async () => null },
  workoutRecords: async () => [],
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

// The router: where the app went, and the params of the screen shown.
const went: unknown[] = [];
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (to: unknown) => went.push(to),
    replace: (to: unknown) => went.push(to),
    back: () => went.push('back'),
    dismissTo: (to: unknown) => went.push(to),
  },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: (to: unknown) => went.push(to) }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));

// Five screens in one walk: longer than one screen's test.
jest.setTimeout(30000);

beforeAll(() => {
  // Tuesday 29 Sep 2026 on the phone's calendar.
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 9, 0),
    doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
});
afterAll(() => jest.useRealTimers());

/** The screen the app went to, shown with its params; the previous one leaves (a new key mounts it fresh). */
let shown: Awaited<ReturnType<typeof render>> | null = null;
let mounts = 0;
const open = async (element: ReactElement, params: Record<string, string> = {}) => {
  mockParams = params;
  mounts += 1;
  const tree = <ThemeProvider key={mounts}>{element}</ThemeProvider>;
  if (shown === null) shown = await render(tree);
  else await shown.rerender(tree);
};
const last = () => went[went.length - 1];

test('B: Train → Change → "Gym is busy" → swap for today → Edit → a flag applied → back to the planned move', async () => {
  program = PROGRAM;

  // Train: today's card, Push.
  await open(<TrainScreen />);
  expect(await screen.findByText('Push')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(t('train.changeLabel')));
  expect(last()).toEqual({ pathname: '/today-change', params: { day: 'a' } });

  // Change today › Gym is busy.
  await open(<TodayChangeScreen />, { day: 'a' });
  await fireEvent.press(await screen.findByText('Gym is busy'));
  expect(last()).toEqual({ pathname: '/swap', params: { day: 'a', scope: 'today' } });

  // Which one is taken? › Bench press › its option, today only.
  await open(<SwapScreen />, { day: 'a', scope: 'today' });
  await fireEvent.press(await screen.findByText('Bench press'));
  expect(screen.getByText('Swap Bench press')).toBeTruthy();
  await fireEvent.press(screen.getByText('Dumbbell bench press'));
  expect(sent[sent.length - 1]).toEqual({ path: '/v1/program/swap', body: { programDayId: 'a', exerciseId: 'bench_press', to: 'dumbbell_bench_press', scope: 'TODAY' } });
  expect(last()).toBe('back');

  // Train: the swapped move in its place; Edit.
  await open(<TrainScreen />);
  expect(await screen.findByText('Dumbbell bench press')).toBeTruthy();
  expect(screen.queryByText('Bench press')).toBeNull();
  await fireEvent.press(screen.getByLabelText(t('editProgram.editLabel')));
  expect(last()).toBe('/edit-program');

  // Edit › Moves: the review's flag, applied.
  await open(<EditProgramScreen />);
  await fireEvent.press(await screen.findByText(t('editProgram.moves')));
  expect(last()).toEqual({ pathname: '/edit-program', params: { part: 'moves' } });
  await open(<EditProgramScreen />, { part: 'moves' });
  await fireEvent.press(await screen.findByLabelText(`${t('editProgram.apply')}: Hamstrings: 4 sets a week, not 3`));
  expect(sent[sent.length - 1]).toEqual({ path: '/v1/program/review/apply', body: { reviewId: 'rev-1', suggestionIds: ['TOO_FEW_SETS:hamstrings'] } });

  // Train: one change applied; the swapped move's swap offers the planned move back.
  await open(<TrainScreen />);
  expect(await screen.findByText('1 change applied')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Swap Dumbbell bench press'));
  expect(last()).toEqual({ pathname: '/swap', params: { day: 'a', move: 'bench_press' } });
  await open(<SwapScreen />, { day: 'a', move: 'bench_press' });
  expect(await screen.findByText('Swap Dumbbell bench press')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(`Bench press. ${t('swap.back')}`));
  expect(sent[sent.length - 1]).toEqual({ path: '/v1/program/swap', body: { programDayId: 'a', exerciseId: 'bench_press', to: 'bench_press', scope: 'TODAY' } });

  await open(<TrainScreen />);
  expect(await screen.findByText('Bench press')).toBeTruthy();
});
