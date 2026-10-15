/**
 * The Apple Health card (K-980, prototype `#health-jit`): shown at the first weigh-in and at the end of the first workout,
 * once. Continue is Apple's sheet and the consent; "Not now" is free and ends the asking. It says what is read and
 * written, and the consent text is one tap away before anything is given (GDPR: informed).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { t } from '@/copy';
import { HealthJit } from '@/health/HealthJit';
import { createHealthAsk } from '@/health/justInTime';
import { ThemeProvider } from '@/theme/theme';

const kept = new Map<string, string>();
const kv = {
  getItemAsync: async (key: string) => kept.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => void kept.set(key, value),
  removeItemAsync: async (key: string) => void kept.delete(key),
};
let mockAvailable = true;
let mockGranted: Record<string, boolean> = {};
const mockServices = {
  api: { PUT: jest.fn(async (_path: string, _init?: unknown) => ({ data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) })) },
  get health() {
    return { available: mockAvailable, requestRead: mockRequestRead };
  },
  consents: {
    granted: jest.fn(async (kind: string) => mockGranted[kind] ?? false),
    remember: jest.fn(async (_kind: string, _status: string) => {}),
  },
  healthAsk: createHealthAsk({ kv }),
  report: jest.fn(),
};
const mockRequestRead = jest.fn(async () => {});
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeEach(() => {
  jest.clearAllMocks();
  kept.clear();
  mockAvailable = true;
  mockGranted = { HEALTH_DATA: true };
});

async function show(onSettled = jest.fn()) {
  await render(
    <ThemeProvider scheme="light">
      <HealthJit onSettled={onSettled} />
    </ThemeProvider>,
  );
  await act(async () => {});
  return onSettled;
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};

test('says what it reads and writes, and offers Continue and Not now', async () => {
  await show();
  expect(screen.getByRole('header', { name: t('health.jit.title') })).toBeOnTheScreen();
  expect(screen.getByText(t('health.jit.reads'))).toBeOnTheScreen();
  expect(screen.getByText(t('health.jit.writes'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('health.jit.continue') })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('health.jit.notNow') })).toBeOnTheScreen();
});

test('Continue: Apple\'s sheet, the consent, and it is settled as connected', async () => {
  const settled = await show();
  await press(t('health.jit.continue'));
  expect(mockRequestRead).toHaveBeenCalled();
  expect(mockServices.api.PUT).toHaveBeenCalledWith('/v1/consents/{kind}', expect.objectContaining({ params: { path: { kind: 'APPLE_HEALTH' } } }));
  expect(settled).toHaveBeenCalledWith('connected');
  expect(await mockServices.healthAsk.asked()).toBe(true);
});

test('Not now is free: no sheet, no consent, and never asked again', async () => {
  const settled = await show();
  await press(t('health.jit.notNow'));
  expect(mockRequestRead).not.toHaveBeenCalled();
  expect(mockServices.api.PUT).not.toHaveBeenCalled();
  expect(settled).toHaveBeenCalledWith('declined');
  expect(await mockServices.healthAsk.asked()).toBe(true);
});

test('asked before: nothing on the screen, and nothing settled', async () => {
  await mockServices.healthAsk.markAsked();
  const settled = await show();
  expect(screen.queryByRole('button', { name: t('health.jit.continue') })).toBeNull();
  expect(settled).not.toHaveBeenCalled();
});

test.each([
  ['Apple Health cannot be asked here', () => (mockAvailable = false)],
  ['the health data consent is not given', () => (mockGranted = {})],
  ['Apple Health is on already', () => (mockGranted = { HEALTH_DATA: true, APPLE_HEALTH: true })],
])('%s: nothing on the screen', async (_, arrange) => {
  arrange();
  await show();
  expect(screen.queryByRole('button', { name: t('health.jit.continue') })).toBeNull();
});

test('a sheet that did not come up says so, and it can be tried again', async () => {
  mockRequestRead.mockRejectedValueOnce(new Error('no'));
  const settled = await show();
  await press(t('health.jit.continue'));
  expect(screen.getByText(t('health.jit.sheetFailed'))).toBeOnTheScreen();
  expect(settled).not.toHaveBeenCalled();
  expect(await mockServices.healthAsk.asked()).toBe(false);
  await press(t('health.jit.continue'));
  expect(settled).toHaveBeenCalledWith('connected');
});

test('the consent text is there to read before anything is given', async () => {
  await show();
  expect(screen.queryByText(t('consent.apple_health.body'))).toBeNull();
  await press(t('health.jit.read'));
  expect(screen.getByText(t('consent.apple_health.body'))).toBeOnTheScreen();
});

test.each(['steps', 'sleep', 'weight', 'active energy', 'workouts'])(
  'the card names what the consent reads, in the consent\'s words: %s (review of K-980)',
  async (what) => {
    expect(t('consent.apple_health.body').toLowerCase()).toContain(what);
    await show();
    expect(screen.getByText(t('health.jit.reads')).props.children.toLowerCase()).toContain(what);
  },
);
