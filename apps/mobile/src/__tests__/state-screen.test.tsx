/**
 * Saying life got in the way (K-518, ADR-038): one of five states, each said in a line; until the user is back, or for a
 * few days. Declared, never asked (U9): the week pauses and the reminders go quiet — nothing is held against anyone (U7).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import StateScreen from '@/app/state';
import { t } from '@/copy';
import { stateParams } from '@/state/params';
import { ThemeProvider } from '@/theme/theme';

const mockDeclare = jest.fn(async (_kind: string, _until?: string) => ({ kind: 'SICK', since: '2026-10-07' }));
const mockBack = jest.fn();
const mockReport = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => ({ state: { declare: mockDeclare }, report: mockReport }),
}));

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 7, 9, 0), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'queueMicrotask'] }));
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  jest.clearAllMocks();
  mockDeclare.mockImplementation(async () => ({ kind: 'SICK', since: '2026-10-07' }));
});

async function show() {
  await render(
    <ThemeProvider>
      <StateScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const choose = async (kind: string) => {
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${t(`state.kind.${kind}.title`)}`) }));
  await act(async () => {});
};
const pause = () => screen.getByRole('button', { name: t('state.screen.pause') });

test('five states, each with what it means; nothing is pre-chosen', async () => {
  await show();
  for (const kind of ['traveling', 'sick', 'pain', 'busy', 'new_gym']) {
    expect(screen.getByRole('radio', { name: `${t(`state.kind.${kind}.title`)}, ${t(`state.kind.${kind}.body`)}` })).toBeOnTheScreen();
  }
  expect(pause()).toBeDisabled();
});

test('until the user is back by default: no last day is sent; then back to Today', async () => {
  await show();
  await choose('sick');
  await press(t('state.screen.pause'));
  expect(mockDeclare).toHaveBeenCalledWith('SICK', undefined);
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('for a few days: the last day counts today in', async () => {
  await show();
  await choose('traveling');
  const days = stateParams.untilChoicesDays[0];
  await press(t('state.screen.forDays', { days }));
  await press(t('state.screen.pause'));
  const last = new Date(2026, 9, 7 + days - 1);
  const day = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  expect(mockDeclare).toHaveBeenCalledWith('TRAVELING', day);
});

test('not recorded: it says so, by connection or not, and stays', async () => {
  mockDeclare.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoConnection' }));
  await show();
  await choose('busy');
  await press(t('state.screen.pause'));
  expect(screen.getByText(t('state.screen.noConnection'))).toBeOnTheScreen();
  expect(mockReport).toHaveBeenCalledWith({ name: 'NoConnection' });
  expect(mockBack).not.toHaveBeenCalled();
  mockDeclare.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'StateRefused' }));
  await press(t('state.screen.pause'));
  expect(screen.getByText(t('state.screen.refused'))).toBeOnTheScreen();
});

test('a way back to Today without declaring anything', async () => {
  await show();
  await press(t('state.screen.back'));
  expect(mockDeclare).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('two taps while it is on its way declare once', async () => {
  let answer: () => void = () => {};
  mockDeclare.mockImplementation(() => new Promise((resolve) => (answer = () => resolve({ kind: 'PAIN', since: '2026-10-07' }))));
  await show();
  await choose('pain');
  const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await act(async () => {
      void fireEvent.press(pause());
      void fireEvent.press(pause());
    });
  } finally {
    overlapNote.mockRestore();
  }
  expect(mockDeclare).toHaveBeenCalledTimes(1);
  await act(async () => answer());
});
