/**
 * The "+" sheet (K-953, K-980, prototype #plus): log a weigh-in, a meal, today's workout, a cardio session, or say life got in the way. The workout
 * is today's session by name, a workout under way is continued, and with nothing planned today the Train tab opens.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { components } from '@/api/schema';
import PlusScreen from '@/app/plus';
import { t } from '@/copy';
import { workoutParams } from '@/train/params';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];

const PROGRAM: Schemas['Program'] = {
  id: 'p1',
  source: 'GENERATED',
  days: [
    {
      id: 'a',
      nameKey: 'programDays.upper_a.name',
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
jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: object) => createElement('SymbolView', { ...props, testID: 'symbol' }) };
});
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
  for (const key of ['plus.weighIn', 'plus.meal', 'plus.workout', 'plus.cardio', 'plus.life']) {
    expect(screen.getByRole('button', { name: new RegExp(t(key)) })).toBeOnTheScreen();
  }
});

describe('the tiles and the rows have their icons (ADR-070 Ek 2 #3, K-1044, prototype 4)', () => {
  const symbolsOf = (row: Parameters<typeof within>[0]) => within(row).getAllByTestId('symbol').map((symbol) => symbol.props.name as string);

  test.each([
    ['plus.weighIn', 'scalemass'],
    ['plus.meal', 'fork.knife'],
    ['plus.workout', 'dumbbell'],
  ])('the %s tile: the %s symbol', async (key, symbol) => {
    await show();
    const tile = await screen.findByRole('button', { name: new RegExp(`^${t(key)}`) });
    expect(symbolsOf(tile)).toEqual([symbol]);
  });

  test.each([
    ['plus.cardio', 'figure.run'],
    ['plus.life', 'pause.circle'],
  ])('the %s row: the %s symbol, and it goes to another page, so it has a chevron', async (key, symbol) => {
    await show();
    const row = screen.getByRole('button', { name: t(key) });
    expect(symbolsOf(row)).toEqual([symbol, 'chevron.right']);
  });

  test('on a tile the icon is above the label (top left, label at the bottom): the tile is a column spread over its height, started at the left', async () => {
    await show();
    const tile = screen.getByRole('button', { name: t('plus.weighIn') });
    expect(StyleSheet.flatten(tile.props.style)).toMatchObject({ justifyContent: 'space-between', alignItems: 'flex-start' });
    // The icon first, then the words: top to bottom.
    const order = within(tile).getAllByTestId('symbol')[0];
    expect(tile.children[0]).toBe(order);
  });

  test('the two rows are one grouped list: both in the same card with the card radius', async () => {
    await show();
    const first = screen.getByRole('button', { name: t('plus.cardio') });
    const second = screen.getByRole('button', { name: t('plus.life') });
    expect(first.parent).toBe(second.parent);
    expect(StyleSheet.flatten(first.parent?.props.style)).toMatchObject({ borderRadius: tokens.radius.card });
  });

  test('under the workout label, today\'s session by name', async () => {
    await show();
    const tile = await screen.findByRole('button', { name: `${t('plus.workout')}, ${t('programDays.upper_a.name')}` });
    expect(within(tile).getByText(t('plus.workout'))).toBeOnTheScreen();
    expect(within(tile).getByText(t('programDays.upper_a.name'))).toBeOnTheScreen();
  });

  test('with no session today the workout tile has no second line', async () => {
    mockData = { program: { state: 'ready', value: { ...PROGRAM, days: [{ ...PROGRAM.days[0], weekday: 'MONDAY' }] } }, exercises: { state: 'none' }, kept: false };
    await show();
    const tile = screen.getByRole('button', { name: t('plus.workout') });
    expect(within(tile).queryByText(t('programDays.upper_a.name'))).toBeNull();
  });
});

test.each([
  ['plus.weighIn', '/weigh-in'],
  ['plus.meal', '/meal'],
  ['plus.cardio', '/cardio'],
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
    program: { state: 'ready', value: { ...PROGRAM, days: [...PROGRAM.days, { ...PROGRAM.days[0], id: 'b', nameKey: 'programDays.lower_a.name', weekday: 'MONDAY' }] } },
    exercises: { state: 'none' },
    kept: false,
  };
  mockRecords = [
    { kind: 'workout', clientId: 'w1', seq: 1, state: 'sent', body: { startedAt: new Date(Date.now() - 20 * 3_600_000).toISOString(), programDayId: 'b' } } as unknown as LocalRecord,
  ];
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: `${t('plus.workout')}, ${t('programDays.lower_a.name')}` }));
  expect(mockReplace).toHaveBeenCalledWith('/workout');
});

test("a workout left open past the server's close is not continued: the tile starts today's session", async () => {
  mockRecords = [
    {
      kind: 'workout',
      clientId: 'w1',
      seq: 1,
      state: 'sent',
      body: { startedAt: new Date(Date.now() - (workoutParams.unfinishedSessionCloseHours + 2) * 3_600_000).toISOString(), programDayId: 'b' },
    } as unknown as LocalRecord,
  ];
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: `${t('plus.workout')}, ${t('programDays.upper_a.name')}` }));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/workout', params: { day: 'a' } });
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
