/**
 * Swap a move (K-970, ADR-073 #6, Ek 3; prototype sheet `swap`, user walks B3, C17, M5). From the Train tab: the sheet
 * is titled by the move as it is now, which is not among the options; a pick asks "Today only" or "From now on"; the new
 * move starts fresh (no target, its own history: the server's). A move swapped for today offers "Back to the planned
 * move", which undoes the swap for today. From "Gym is busy": first "Which one is taken?", then today only. The server
 * answers; CONFLICT and no connection are said on the sheet.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import SwapScreen from '@/app/swap';
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
const BENCH = planned('bench_press', ['dumbbell_bench_press', 'push_up']);
const PULLDOWN = planned('lat_pulldown', ['seated_row']);
const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [{ id: 'a', nameKey: 'programDays.upper_a.name', weekday: 'TUESDAY', exercises: [BENCH, PULLDOWN] }],
  week: [{ programDayId: 'a', date: '2026-09-29', exerciseIds: ['bench_press', 'lat_pulldown'] }],
};
const SWAPPED: Schemas['Program'] = {
  ...PROGRAM,
  week: [
    {
      programDayId: 'a',
      date: '2026-09-29',
      exerciseIds: ['dumbbell_bench_press', 'lat_pulldown'],
      swaps: [{ insteadOf: 'bench_press', exercise: planned('dumbbell_bench_press', ['push_up']) }],
    },
  ],
};
let mockData: TrainData;
let mockAnswer: () => unknown;
const mockPost = jest.fn(async (..._args: unknown[]) => mockAnswer());
const mockServices = {
  api: { POST: (...args: unknown[]) => mockPost(...args) },
  training: { read: async () => mockData, own: async () => [] },
  workoutRecords: async () => [],
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
const mockBack = jest.fn();
let mockParams: Record<string, string>;
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 9, 0),
    doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
});
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  jest.clearAllMocks();
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: [] }, kept: false };
  mockParams = { day: 'a', move: 'bench_press' };
  mockAnswer = () => ({ data: PROGRAM, response: { status: 200 } });
});

const show = () =>
  render(
    <ThemeProvider>
      <SwapScreen />
    </ThemeProvider>,
  );

test('titled by the move as it is now, which is not an option; the new move starts fresh', async () => {
  await show();
  expect(await screen.findByText('Swap Bench press')).toBeTruthy();
  expect(screen.getByText(t('swap.why'))).toBeTruthy();
  expect(screen.getByText('Dumbbell bench press')).toBeTruthy();
  expect(screen.getByText('Push-up')).toBeTruthy();
  expect(screen.queryByText('Bench press')).toBeNull();
});

test.each([
  ['Today only', 'TODAY'],
  ['From now on', 'FROM_NOW_ON'],
])('a pick asks how long; %s goes to the server with its scope, and the sheet closes', async (scope, sent) => {
  await show();
  await fireEvent.press(await screen.findByText('Dumbbell bench press'));
  expect(mockPost).not.toHaveBeenCalled();
  expect(screen.getByText('Today only')).toBeTruthy();
  expect(screen.getByText('From now on')).toBeTruthy();
  await fireEvent.press(screen.getByText(scope));
  expect(mockPost).toHaveBeenCalledWith('/v1/program/swap', {
    body: { programDayId: 'a', exerciseId: 'bench_press', to: 'dumbbell_bench_press', scope: sent },
  });
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('swapped for today: titled by the move in its place; back to the planned move undoes the swap for today', async () => {
  mockData = { ...mockData, program: { state: 'ready', value: SWAPPED } };
  await show();
  expect(await screen.findByText('Swap Dumbbell bench press')).toBeTruthy();
  expect(screen.getByText(t('swap.back'))).toBeTruthy();
  expect(screen.queryByText('Dumbbell bench press')).toBeNull();
  await fireEvent.press(screen.getByLabelText(`Bench press. ${t('swap.back')}`));
  expect(mockPost).toHaveBeenCalledWith('/v1/program/swap', { body: { programDayId: 'a', exerciseId: 'bench_press', to: 'bench_press', scope: 'TODAY' } });
});

test('"Gym is busy": which one is taken first, by its name today; then the options, for today only', async () => {
  mockData = { ...mockData, program: { state: 'ready', value: SWAPPED } };
  mockParams = { day: 'a', scope: 'today' };
  await show();
  expect(await screen.findByText(t('swap.which'))).toBeTruthy();
  expect(screen.getByText('Lat pulldown')).toBeTruthy();
  await fireEvent.press(screen.getByText('Lat pulldown'));
  expect(await screen.findByText('Swap Lat pulldown')).toBeTruthy();
  await fireEvent.press(screen.getByText('Seated row'));
  expect(screen.queryByText('From now on')).toBeNull();
  expect(mockPost).toHaveBeenCalledWith('/v1/program/swap', { body: { programDayId: 'a', exerciseId: 'lat_pulldown', to: 'seated_row', scope: 'TODAY' } });
});

test('two taps while the answer is on its way swap once', async () => {
  let answer: (value: unknown) => void = () => undefined;
  mockAnswer = () => new Promise((resolve) => (answer = resolve));
  await show();
  await fireEvent.press(await screen.findByText('Push-up'));
  const today = screen.getByText('Today only');
  await fireEvent.press(today);
  await fireEvent.press(today);
  await fireEvent.press(screen.getByText('From now on'));
  expect(mockPost).toHaveBeenCalledTimes(1);
  await act(async () => answer({ data: PROGRAM, response: { status: 200 } }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('an answer that comes after the sheet has gone closes nothing', async () => {
  let answer: (value: unknown) => void = () => undefined;
  mockAnswer = () => new Promise((resolve) => (answer = resolve));
  const { rerender } = await show();
  await fireEvent.press(await screen.findByText('Push-up'));
  await fireEvent.press(screen.getByText('Today only'));
  await rerender(<ThemeProvider>{null}</ThemeProvider>);
  await act(async () => answer({ data: PROGRAM, response: { status: 200 } }));
  expect(mockBack).not.toHaveBeenCalled();
});

test('no option in this gym says so', async () => {
  mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [{ ...PROGRAM.days[0], exercises: [planned('bench_press'), PULLDOWN] }] } } };
  await show();
  expect(await screen.findByText(t('swap.none'))).toBeTruthy();
});

test.each([
  [409, 'swap.conflict'],
  [500, 'swap.failed'],
])('the server answering %i says why on the sheet, which stays', async (status, key) => {
  mockAnswer = () => ({ error: { code: 'X' }, response: { status } });
  await show();
  await fireEvent.press(await screen.findByText('Push-up'));
  await fireEvent.press(screen.getByText('Today only'));
  expect(await screen.findByText(t(key))).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});
