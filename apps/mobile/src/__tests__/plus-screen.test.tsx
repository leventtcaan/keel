/**
 * The "+" sheet (K-953, prototype #plus): log a weigh-in, a meal, today's workout, or say life got in the way. The workout
 * is today's session by name, a workout under way is continued, and with nothing planned today the Train tab opens.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import PlusScreen from '@/app/plus';
import { t } from '@/copy';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [
    {
      id: 'a',
      nameKey: 'upper_a',
      weekday: 'TUESDAY',
      exercises: [{ exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 }],
    },
  ],
};

let mockData: TrainData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'none' }, kept: false };
let mockRecords: LocalRecord[] = [];
const mockServices = {
  api: {},
  training: { read: jest.fn(async () => mockData) },
  workoutRecords: async () => mockRecords,
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args), dismissTo: (...args: unknown[]) => mockDismissTo(...args) },
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));

beforeAll(() => {
  // Tuesday 29 Sep 2026 on the phone's calendar; only the date is fake.
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 9, 0), doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask'] });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  mockData = { program: { state: 'ready', value: PROGRAM }, exercises: { state: 'none' }, kept: false };
  mockRecords = [];
});

async function show() {
  await render(
    <ThemeProvider>
      <PlusScreen />
    </ThemeProvider>,
  );
}

test('the sheet names what can be logged', async () => {
  await show();
  expect(screen.getByRole('header', { name: t('plus.title') })).toBeOnTheScreen();
  for (const key of ['plus.weighIn', 'plus.meal', 'plus.workout', 'plus.life']) {
    expect(screen.getByRole('button', { name: new RegExp(t(key)) })).toBeOnTheScreen();
  }
});

test.each([
  ['plus.weighIn', '/weigh-in'],
  ['plus.meal', '/meal'],
  ['plus.life', '/state'],
])('%s opens %s in place of the sheet', async (key, route) => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t(key) }));
  expect(mockDismissTo).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith(route);
});

test("the workout is today's session, by name, and starts it", async () => {
  await show();
  const tile = await screen.findByRole('button', { name: `${t('plus.workout')}, ${t('programDays.upper_a.name')}` });
  await fireEvent.press(tile);
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/workout', params: { day: 'a' } });
});

test('a workout under way is continued, not started again, and the tile names that workout', async () => {
  // Monday's workout left open; today (Tuesday) plans Upper A.
  mockData = {
    program: { state: 'ready', value: { ...PROGRAM, days: [...PROGRAM.days, { ...PROGRAM.days[0], id: 'b', nameKey: 'lower_a', weekday: 'MONDAY' }] } },
    exercises: { state: 'none' },
    kept: false,
  };
  mockRecords = [
    { kind: 'workout', clientId: 'w1', seq: 1, state: 'sent', body: { startedAt: '2026-09-28T08:00:00Z', programDayId: 'b' } } as unknown as LocalRecord,
  ];
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: `${t('plus.workout')}, ${t('programDays.lower_a.name')}` }));
  expect(mockReplace).toHaveBeenCalledWith('/workout');
});

test('before the program is read, the workout tile waits instead of guessing', async () => {
  let release: (value: TrainData) => void = () => {};
  mockServices.training.read.mockImplementationOnce(() => new Promise<TrainData>((resolve) => (release = resolve)));
  await show();
  const tile = screen.getByRole('button', { name: t('plus.workout') });
  expect(tile).toBeDisabled();
  await fireEvent.press(tile);
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockDismissTo).not.toHaveBeenCalled();
  await act(async () => release(mockData));
  expect(await screen.findByRole('button', { name: `${t('plus.workout')}, ${t('programDays.upper_a.name')}` })).toBeEnabled();
});

test('nothing planned today: the workout opens the Train tab', async () => {
  mockData = { program: { state: 'ready', value: { ...PROGRAM, days: [{ ...PROGRAM.days[0], weekday: 'MONDAY' }] } }, exercises: { state: 'none' }, kept: false };
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('plus.workout') }));
  expect(mockDismissTo).toHaveBeenCalledWith('/train');
});
