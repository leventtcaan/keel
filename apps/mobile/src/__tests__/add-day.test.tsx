/**
 * "Add a day" (ADR-090 Ek 1, K-1060): the one way a training day is added. A sheet with the free weekday that has the most
 * rest around it as one button, the others as chips; a tap sends the weekday (POST /v1/program/days) and the sheet closes on
 * the server's answer. The server fills the day; nothing else is asked.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import AddDayScreen from '@/app/add-day';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { freeWeekdays, suggestedWeekday, trainedWeekdays } from '@/train/addDay';
import type { TrainData } from '@/train/trainData';

type Schemas = components['schemas'];
type Weekday = Schemas['Weekday'];

const program = (weekdays: (Weekday | undefined)[]): Schemas['Program'] => ({
  id: 'p1',
  source: 'GENERATED',
  canAddDay: true,
  days: weekdays.map((weekday, i) => ({ id: `d${i}`, nameKey: 'programDays.upper.name', ...(weekday === undefined ? {} : { weekday }), exercises: [] })),
});

describe('which day is suggested', () => {
  test('the free weekday furthest from the days trained, the earliest when two are as far', () => {
    expect(suggestedWeekday(program(['MONDAY', 'THURSDAY']))).toBe('SATURDAY');
    expect(suggestedWeekday(program(['MONDAY', 'WEDNESDAY', 'FRIDAY']))).toBe('TUESDAY'); // every free day is next to a trained one: the earliest
    expect(suggestedWeekday(program(['MONDAY', 'FRIDAY']))).toBe('WEDNESDAY');
  });

  test('the week goes round: Sunday and Monday are neighbours', () => {
    // Free: Wednesday, Thursday, Friday. Wednesday is 2 from Monday and 3 from Sunday... Thursday is 3 from both ends.
    expect(suggestedWeekday(program(['MONDAY', 'TUESDAY', 'SATURDAY', 'SUNDAY']))).toBe('THURSDAY');
  });

  test('none free: none suggested; days on no weekday train on none', () => {
    expect(suggestedWeekday(program(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']))).toBeUndefined();
    expect(trainedWeekdays(program(['FRIDAY', undefined, 'MONDAY']))).toEqual(['MONDAY', 'FRIDAY']);
    expect(freeWeekdays(program(['FRIDAY', undefined, 'MONDAY']))).toEqual(['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'SATURDAY', 'SUNDAY']);
  });
});

let mockData: TrainData;
let mockAnswer: () => unknown;
const mockPost = jest.fn(async (..._args: unknown[]) => mockAnswer());
const mockServices = { api: { POST: (...args: unknown[]) => mockPost(...args) }, training: { read: async () => mockData } };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockData = { program: { state: 'ready', value: program(['MONDAY', 'THURSDAY']) }, exercises: { state: 'ready', value: [] }, kept: false };
  mockAnswer = () => ({ data: program(['MONDAY', 'TUESDAY', 'THURSDAY']), response: { status: 200 } });
});

const show = () =>
  render(
    <ThemeProvider>
      <AddDayScreen />
    </ThemeProvider>,
  );

test('one tap on the suggested day adds it, and the sheet closes on the server\'s answer', async () => {
  await show();
  await fireEvent.press(await screen.findByLabelText(t('addDay.addOnLabel', { day: 'Saturday' })));
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockPost).toHaveBeenCalledWith('/v1/program/days', { body: { weekday: 'SATURDAY' } });
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('the other free days are chips, never the days already trained; a chip adds its day', async () => {
  await show();
  expect(await screen.findByText(t('addDay.addOn', { day: 'Saturday' }))).toBeTruthy();
  for (const taken of ['Mon', 'Thu']) expect(screen.queryByText(taken)).toBeNull();
  for (const free of ['Tue', 'Wed', 'Fri', 'Sun']) expect(screen.getByText(free)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(t('addDay.addOnLabel', { day: 'Tuesday' })));
  expect(mockPost).toHaveBeenCalledWith('/v1/program/days', { body: { weekday: 'TUESDAY' } });
});

test.each([
  [409, 'addDay.conflict'],
  [400, 'addDay.conflict'],
  [500, 'addDay.failed'],
])('the server answering %i says why on the sheet, which stays', async (status, key) => {
  mockAnswer = () => ({ error: { code: 'X' }, response: { status } });
  await show();
  await fireEvent.press(await screen.findByText(t('addDay.addOn', { day: 'Saturday' })));
  expect(await screen.findByText(t(key))).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

test('no connection: said, the sheet stays', async () => {
  mockAnswer = () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await fireEvent.press(await screen.findByText(t('addDay.addOn', { day: 'Saturday' })));
  expect(await screen.findByText(t('addDay.offline'))).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

test('two taps while the answer is on its way add the day once', async () => {
  let answer: (value: unknown) => void = () => undefined;
  mockAnswer = () => new Promise((resolve) => (answer = resolve));
  await show();
  const add = await screen.findByText(t('addDay.addOn', { day: 'Saturday' }));
  await fireEvent.press(add);
  await fireEvent.press(add);
  await fireEvent.press(screen.getByLabelText(t('addDay.addOnLabel', { day: 'Tuesday' })));
  expect(mockPost).toHaveBeenCalledTimes(1);
  await act(async () => answer({ data: program(['MONDAY', 'THURSDAY', 'SATURDAY']), response: { status: 200 } }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('seven days: nothing to pick, and why', async () => {
  mockData = {
    ...mockData,
    program: { state: 'ready', value: program(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']) },
  };
  await show();
  expect(await screen.findByText(t('addDay.full'))).toBeTruthy();
  expect(screen.queryByText(t('addDay.hint'))).toBeNull();
});

test('the "good spot" line only when the suggested day has a day off beside it', async () => {
  // Monday and Thursday: Saturday has a day off on both sides.
  await show();
  expect(await screen.findByText(t('addDay.suggested'))).toBeTruthy();
});

test('every free day next to a trained one: no "good spot" claim', async () => {
  mockData = { ...mockData, program: { state: 'ready', value: program(['TUESDAY', 'THURSDAY', 'SUNDAY']) } };
  await show();
  expect(await screen.findByText(t('addDay.addOn', { day: 'Monday' }))).toBeTruthy();
  expect(screen.queryByText(t('addDay.suggested'))).toBeNull();
});

describe('the day always comes from the server, with its moves (Evre 7 B1)', () => {
  test.each([['canAddDay false', false], ['canAddDay absent', undefined]])(
    'the server not saying it can add (%s: an older server, the copy kept offline) still asks: the server decides, the phone never opens an empty day',
    async (_name, canAddDay) => {
      const { canAddDay: _gone, ...older } = program(['MONDAY', 'THURSDAY']);
      mockData = { ...mockData, program: { state: 'ready', value: canAddDay === undefined ? older : { ...older, canAddDay } }, kept: true };
      await show();
      await fireEvent.press(await screen.findByLabelText(t('addDay.addOnLabel', { day: 'Saturday' })));
      expect(mockPost).toHaveBeenCalledWith('/v1/program/days', { body: { weekday: 'SATURDAY' } });
    },
  );

  test('a failure is a retry state: the reason, and the button reads "Try again" for the same day, which sends it again and closes on success', async () => {
    mockAnswer = () => {
      throw new TypeError('Network request failed');
    };
    await show();
    await fireEvent.press(await screen.findByText(t('addDay.addOn', { day: 'Saturday' })));
    expect(await screen.findByText(t('addDay.offline'))).toBeTruthy();
    expect(screen.queryByText(t('addDay.addOn', { day: 'Saturday' }))).toBeNull();
    mockAnswer = () => ({ data: program(['MONDAY', 'THURSDAY', 'SATURDAY']), response: { status: 200 } });
    await fireEvent.press(screen.getByLabelText(t('addDay.retryLabel', { day: 'Saturday' })));
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenLastCalledWith('/v1/program/days', { body: { weekday: 'SATURDAY' } });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('after a failure another day can still be picked, and the retry state goes with the pick', async () => {
    mockAnswer = () => ({ error: { code: 'X' }, response: { status: 500 } });
    await show();
    await fireEvent.press(await screen.findByText(t('addDay.addOn', { day: 'Saturday' })));
    await screen.findByText(t('addDay.failed'));
    mockAnswer = () => ({ data: program(['MONDAY', 'TUESDAY', 'THURSDAY']), response: { status: 200 } });
    await fireEvent.press(screen.getByLabelText(t('addDay.addOnLabel', { day: 'Tuesday' })));
    expect(mockPost).toHaveBeenLastCalledWith('/v1/program/days', { body: { weekday: 'TUESDAY' } });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('the program not read at all (no connection, nothing kept): a retry state that reads again, never a blank sheet', async () => {
    mockData = { program: { state: 'failed', problem: 'NoConnection' }, exercises: { state: 'ready', value: [] }, kept: false } as TrainData;
    await show();
    expect(await screen.findByText(t('addDay.offline'))).toBeTruthy();
    mockData = { program: { state: 'ready', value: program(['MONDAY', 'THURSDAY']) }, exercises: { state: 'ready', value: [] }, kept: false };
    await fireEvent.press(screen.getByText(t('addDay.retry')));
    expect(await screen.findByText(t('addDay.addOn', { day: 'Saturday' }))).toBeTruthy();
  });
});
