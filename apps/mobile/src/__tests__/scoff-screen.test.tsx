/**
 * The SCOFF screen (K-607, ADR-050): the five questions, word for word; Continue once all five are answered. Two or more yes:
 * the projection stays off on this phone, a neutral sentence and — in a region with a checked organisation — its link.
 * Nothing goes to the server, and only the result is kept. Opened again after "off", it is not asked again.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import ScoffScreen from '@/app/scoff';
import { t } from '@/copy';
import { SCOFF_QUESTIONS, createProjectionAccess } from '@/projection/scoff';
import { ThemeProvider } from '@/theme/theme';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));

const mockApi = { GET: jest.fn(), POST: jest.fn(), PUT: jest.fn(), DELETE: jest.fn() };
let mockServices: Record<string, unknown> = {};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

let stored: Map<string, string>;
const kv = {
  getItemAsync: async (key: string) => stored.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    stored.set(key, value);
  },
  removeItemAsync: async (key: string) => stored.delete(key),
};
const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

async function show(locale: string) {
  mockServices = { api: mockApi, projection: await createProjectionAccess({ kv, locale }) };
  await render(
    <ThemeProvider scheme="light">
      <ScoffScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

async function answer(yes: number) {
  for (const [index, question] of SCOFF_QUESTIONS.entries()) {
    await act(async () => {
      fireEvent.press(screen.getByLabelText(`${t(`projection.scoff.${question}`)} ${t(index < yes ? 'projection.scoff.yes' : 'projection.scoff.no')}`));
    });
  }
}

async function carryOn() {
  await act(async () => {
    fireEvent.press(screen.getByText(t('projection.scoff.continue')));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  stored = new Map();
});

afterEach(() => {
  Object.values(mockApi).forEach((call) => expect(call).not.toHaveBeenCalled());
});

test('the five questions word for word, with where they come from', async () => {
  await show('en-US');

  SCOFF_QUESTIONS.forEach((question) => expect(screen.getByText(t(`projection.scoff.${question}`))).toBeOnTheScreen());
  expect(screen.getByText(t('projection.scoff.intro'))).toBeOnTheScreen();
  expect(screen.getByText(t('projection.scoff.source'))).toBeOnTheScreen();
});

test('Continue does nothing until all five are answered', async () => {
  await show('en-US');
  await act(async () => {
    fireEvent.press(screen.getByLabelText(`${t('projection.scoff.q1')} ${t('projection.scoff.yes')}`));
  });

  await carryOn();

  expect(stored.size).toBe(0);
  expect(mockBack).not.toHaveBeenCalled();
});

test('two yes: off on this phone, the neutral sentence and the region link; only the result kept', async () => {
  await show('en-US');
  await answer(2);
  await carryOn();

  expect([...stored.values()]).toEqual(['unavailable']);
  expect(screen.getByText(t('projection.unavailable.title'))).toBeOnTheScreen();
  expect(screen.getByText(t('projection.unavailable.support'))).toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(screen.getByText(t('projection.unavailable.open', { name: t('projection.support.US') })));
  });
  expect(openURL).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/anad\.org\//));
});

test('in Turkey the neutral sentence stands alone', async () => {
  await show('tr-TR');
  await answer(5);
  await carryOn();

  expect(screen.getByText(t('projection.unavailable.support'))).toBeOnTheScreen();
  expect(screen.queryByText(/^Open /)).toBeNull();
});

test('one yes: kept as clear and the screen closes', async () => {
  await show('en-GB');
  await answer(1);
  await carryOn();

  expect([...stored.values()]).toEqual(['clear']);
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(t('projection.unavailable.title'))).toBeNull();
});

test('opened again after "off": not asked again', async () => {
  stored.set('projection.access', 'unavailable');
  await show('en-GB');

  expect(screen.getByText(t('projection.unavailable.title'))).toBeOnTheScreen();
  expect(screen.queryByText(t('projection.scoff.q1'))).toBeNull();
  expect(screen.getByText(t('projection.unavailable.open', { name: t('projection.support.GB') }))).toBeOnTheScreen();
});

test('Done closes the screen', async () => {
  stored.set('projection.access', 'unavailable');
  await show('de-DE');

  await act(async () => {
    fireEvent.press(screen.getByText(t('projection.unavailable.done')));
  });
  expect(mockBack).toHaveBeenCalledTimes(1);
});
