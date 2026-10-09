/**
 * "Change today" (K-970, ADR-073 #5, Ek 3; prototype `#today`): today's session shorter, moved to tomorrow, or skipped
 * without a catch-up. The server changes it and the Train tab reads the week again; CONFLICT, no connection or our
 * failure says so on the sheet, and nothing is taken as changed. The short version offers no second short; a workout
 * of that day under way leaves only the short version (the server refuses a move or a skip then).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import TodayChangeScreen from '@/app/today-change';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [{ id: 'a', nameKey: 'programDays.upper_a.name', weekday: 'TUESDAY', exercises: [{ exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 }] }],
  // Today on the user's calendar is the server's (Program.today, K-995), never the phone's clock.
  today: '2026-09-29',
  week: [{ programDayId: 'a', date: '2026-09-29', exerciseIds: ['bench_press'] }],
};
let mockData: TrainData;
let mockRecords: LocalRecord[] = [];
let mockAnswer: () => unknown;
const mockPost = jest.fn(async (..._args: unknown[]) => mockAnswer());
const mockServices = {
  api: { POST: (...args: unknown[]) => mockPost(...args) },
  training: { read: async () => mockData },
  workoutRecords: async () => mockRecords,
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = { day: 'a' };
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));

beforeAll(() => {
  // Tuesday 29 Sep 2026 on the phone's calendar.
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 9, 0),
    doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
});
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  jest.clearAllMocks();
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'ready', value: [] }, kept: false };
  mockRecords = [];
  mockParams = { day: 'a' };
  mockAnswer = () => ({ data: PROGRAM, response: { status: 200 } });
});

const show = () =>
  render(
    <ThemeProvider>
      <TodayChangeScreen />
    </ThemeProvider>,
  );

test('the three changes, each saying what it does: no catch-up for a skip', async () => {
  await show();
  expect(await screen.findByText('Short on time')).toBeTruthy();
  expect(screen.getByText('Move it')).toBeTruthy();
  expect(screen.getByText('Skip today')).toBeTruthy();
  expect(screen.getByText('No catch-up. Monday reads what happened.')).toBeTruthy();
});

test.each([
  ['Short on time', 'SHORT'],
  ['Move it', 'MOVE'],
  ['Skip today', 'SKIP'],
])("%s goes to the server for today's session, and the sheet closes on its answer", async (row, change) => {
  await show();
  await fireEvent.press(await screen.findByText(row));
  expect(mockPost).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'a', change } });
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test.each([
  [409, 'todayChange.conflict'],
  [500, 'todayChange.failed'],
])('the server answering %i says why on the sheet, which stays', async (status, key) => {
  mockAnswer = () => ({ error: { code: 'X' }, response: { status } });
  await show();
  await fireEvent.press(await screen.findByText('Move it'));
  expect(await screen.findByText(t(key))).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

test('two taps while the answer is on its way send the change once', async () => {
  let answer: (value: unknown) => void = () => undefined;
  mockAnswer = () => new Promise((resolve) => (answer = resolve));
  await show();
  const move = await screen.findByText('Move it');
  await fireEvent.press(move);
  await fireEvent.press(move);
  await fireEvent.press(screen.getByText('Skip today'));
  expect(mockPost).toHaveBeenCalledTimes(1);
  await act(async () => answer({ data: PROGRAM, response: { status: 200 } }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('an answer that comes after the sheet has gone closes nothing: another screen may be up', async () => {
  let answer: (value: unknown) => void = () => undefined;
  mockAnswer = () => new Promise((resolve) => (answer = resolve));
  const { rerender } = await show();
  await fireEvent.press(await screen.findByText('Move it'));
  // The sheet goes (another screen takes its place) before the answer comes.
  await rerender(<ThemeProvider>{null}</ThemeProvider>);
  await act(async () => answer({ data: PROGRAM, response: { status: 200 } }));
  expect(mockBack).not.toHaveBeenCalled();
});

test('no connection says so', async () => {
  mockAnswer = () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await fireEvent.press(await screen.findByText('Skip today'));
  expect(await screen.findByText(t('todayChange.offline'))).toBeTruthy();
});

test('the short version already: no second short; Full workout brings every move back', async () => {
  mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, week: [{ ...PROGRAM.week![0], short: true }] } } };
  await show();
  expect(await screen.findByText('Full workout')).toBeTruthy();
  expect(screen.queryByText('Short on time')).toBeNull();
  expect(screen.getByText('Move it')).toBeTruthy();
  await fireEvent.press(screen.getByText('Full workout'));
  expect(mockPost).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'a', change: 'FULL' } });
});

test("today is the server's day: the phone's clock on another day changes nothing", async () => {
  mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, today: '2026-09-30', week: [{ ...PROGRAM.week![0], date: '2026-09-30' }] } } };
  await show();
  expect(await screen.findByText('Move it')).toBeTruthy();
});

test('skipped today and undoable: Undo, the one change left', async () => {
  mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, week: [{ ...PROGRAM.week![0], skipped: true, undoable: true }] } } };
  await show();
  await fireEvent.press(await screen.findByText(t('todayChange.undo.title')));
  expect(mockPost).toHaveBeenCalledWith('/v1/program/today', { body: { programDayId: 'a', change: 'UNDO' } });
  expect(screen.queryByText('Move it')).toBeNull();
});

test("today's session done (the server says so): it says so, and nothing is left to change", async () => {
  mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, week: [{ ...PROGRAM.week![0], workout: { id: 'w1', state: 'DONE' } }] } } };
  await show();
  expect(await screen.findByText(t('train.doneToday'))).toBeTruthy();
  expect(screen.queryByText('Short on time')).toBeNull();
  expect(screen.queryByText('Move it')).toBeNull();
  expect(screen.queryByText('Skip today')).toBeNull();
});

test("a workout of today's session under way (the server says so): only the short version is left", async () => {
  mockData = { ...mockData, program: { state: 'ready', value: { ...PROGRAM, week: [{ ...PROGRAM.week![0], workout: { id: 'w1', state: 'OPEN' } }] } } };
  await show();
  expect(await screen.findByText(t('todayChange.started'))).toBeTruthy();
  expect(screen.getByText('Short on time')).toBeTruthy();
  expect(screen.queryByText('Move it')).toBeNull();
  expect(screen.queryByText('Skip today')).toBeNull();
});

test('"Gym is busy" asks which move is taken, for today only', async () => {
  await show();
  await fireEvent.press(await screen.findByText('Gym is busy'));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/swap', params: { day: 'a', scope: 'today' } });
  expect(mockPost).not.toHaveBeenCalled();
});

test("a day that is not today's session has nothing to change", async () => {
  mockParams = { day: 'other' };
  await show();
  expect(await screen.findByText(t('todayChange.none'))).toBeTruthy();
  expect(screen.queryByText('Move it')).toBeNull();
  await fireEvent.press(screen.getByText(t('todayChange.close')));
  expect(mockBack).toHaveBeenCalled();
});
