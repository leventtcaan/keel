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
import type { LocalRecord } from '@/sync/store';
import { type Move, type TrainData, ownMove } from '@/train/trainData';

type Schemas = components['schemas'];

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
  today: '2026-09-29',
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
  training: { read: async () => mockData, own: async () => mockOwn },
  workoutRecords: async () => mockRecords,
};
let mockOwn: Move[] = [];
let mockRecords: LocalRecord[] = [];
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string>;
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), replace: (...args: unknown[]) => mockReplace(...args) },
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
  mockOwn = [];
  mockRecords = [];
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

test('a move swapped for today, swapped again: today only says the planned move comes back next time', async () => {
  mockData = { ...mockData, program: { state: 'ready', value: SWAPPED } };
  await show();
  await fireEvent.press(await screen.findByText('Push-up'));
  expect(screen.getByText("Next time it's Bench press again.")).toBeTruthy();
});

test("a move another swap put in today's session: offered from now on, not for today", async () => {
  // Push-up stands in for the pulldown today; from now on it can still replace the bench press.
  const pushUp = { ...PULLDOWN, exerciseId: 'push_up' };
  mockData = {
    ...mockData,
    program: { state: 'ready', value: { ...PROGRAM, week: [{ programDayId: 'a', date: '2026-09-29', exerciseIds: ['bench_press', 'push_up'], swaps: [{ insteadOf: 'lat_pulldown', exercise: pushUp }] }] } },
  };
  await show();
  await fireEvent.press(await screen.findByText('Push-up'));
  expect(screen.queryByText('Today only')).toBeNull();
  expect(screen.getByText('From now on')).toBeTruthy();
});

test("today's workout of that day under way: no today only (the swap is the workout's), from now on still", async () => {
  mockRecords = [UNDER_WAY];
  await show();
  await fireEvent.press(await screen.findByText('Push-up'));
  expect(screen.queryByText('Today only')).toBeNull();
  expect(screen.getByText('From now on')).toBeTruthy();
});

test('the server says the workout is open on another phone: no today only either, from now on still', async () => {
  mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, week: [{ ...PROGRAM.week![0], workout: { id: 'w9', state: 'OPEN' } }] } } };
  await show();
  await fireEvent.press(await screen.findByText('Push-up'));
  expect(screen.queryByText('Today only')).toBeNull();
  expect(screen.getByText('From now on')).toBeTruthy();
});

test('"Gym is busy" while the workout is under way: said, nothing to pick', async () => {
  mockRecords = [UNDER_WAY];
  mockParams = { day: 'a', scope: 'today' };
  await show();
  expect(await screen.findByText(t('todayChange.started'))).toBeTruthy();
  expect(screen.queryByText(t('swap.which'))).toBeNull();
});

test('"Gym is busy", a move with nothing to swap to: said for it, skip today instead, or back to the list', async () => {
  mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [{ ...PROGRAM.days[0], exercises: [planned('bench_press'), PULLDOWN] }] } } };
  mockParams = { day: 'a', scope: 'today' };
  await show();
  await fireEvent.press(await screen.findByText('Bench press'));
  expect(screen.getByText(t('swap.none'))).toBeTruthy();
  await fireEvent.press(screen.getByText(t('swap.skipInstead')));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/today-change', params: { day: 'a' } });
  await fireEvent.press(screen.getByText(t('swap.backToList')));
  expect(screen.getByText(t('swap.which'))).toBeTruthy();
});

test("the user's own move: no other move for this one", async () => {
  mockOwn = [ownMove({ id: 'custom:1', clientId: 'c1', name: 'Landmine press', kind: 'COMPOUND', load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false })];
  mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, days: [{ ...PROGRAM.days[0], exercises: [planned('custom:1'), PULLDOWN] }] } } };
  mockParams = { day: 'a', move: 'custom:1' };
  await show();
  expect(await screen.findByText(t('swap.noneOwn'))).toBeTruthy();
});

test.each([
  ['the program not read yet, or failed', () => (mockData = { program: { state: 'failed', problem: 'NoConnection' }, exercises: { state: 'failed', problem: 'NoConnection' }, kept: false }), 'train.failed'],
  ['a move not on the day', () => (mockParams = { day: 'a', move: 'squat' }), 'swap.notFound'],
  [
    '"Gym is busy" on a day that is not today\'s session',
    () => {
      mockParams = { day: 'a', scope: 'today' };
      mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, week: [{ ...PROGRAM.week![0], date: '2026-09-30' }] } } };
    },
    'todayChange.none',
  ],
])('%s: its own words, not "Which one is taken?"', async (_, set, key) => {
  set();
  await show();
  expect(await screen.findByText(t(key))).toBeTruthy();
  expect(screen.queryByText(t('swap.which'))).toBeNull();
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
