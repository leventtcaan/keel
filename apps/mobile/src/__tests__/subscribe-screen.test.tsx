/**
 * The gate screen after onboarding (K-706, ADR-058 #1): an account that never subscribed sees the plans with no way to close
 * them — but with its account: export, delete (App Review 5.1.1(v): deletion in the app, reachable without paying) and sign
 * out. Bought or restored, the gate asks the server again and the tabs open. Not known yet: it asks, and waits.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import SubscribeScreen from '@/app/subscribe';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { GateState } from '@/subscription/gate';
import type { Plan, SubscriptionStore } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';

type Subscription = components['schemas']['Subscription'];
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const NONE: Subscription = { active: false, appUserId: ID };
const TRIAL: Subscription = { active: true, appUserId: ID, status: 'TRIAL', accessUntil: '2026-10-11T12:00:00Z' };
const PLANS: Plan[] = [{ id: '$rc_annual', period: 'annual', price: '$59.99', pricePerMonth: '$5.00', trial: { count: 7, unit: 'day' } }];

let mockAnswers: unknown[] = [];
const mockGET = jest.fn(async () => (mockAnswers.length > 1 ? mockAnswers.shift() : mockAnswers[0]));
let mockGateState: GateState = 'required';
const mockGate = { refresh: jest.fn(async () => {}), current: () => mockGateState, subscribe: () => () => {} };
const mockStore: SubscriptionStore = {
  available: true,
  identify: jest.fn(async () => {}),
  forget: jest.fn(async () => {}),
  plans: jest.fn(async () => PLANS),
  buy: jest.fn(async () => 'bought' as const),
  restore: jest.fn(async () => {}),
  manage: jest.fn(async () => {}),
};
const mockApi = { GET: mockGET };
const mockServices = {
  api: mockApi,
  purchases: mockStore,
  gate: mockGate,
  report: () => {},
  // The account section (K-309): its own behaviour is settings-screen.test.tsx.
  exportData: jest.fn(async () => {}),
  deleteAccount: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  pendingCount: jest.fn(async () => 0),
  photos: { photos: jest.fn(async () => []) },
};
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useSubscriptionGate: () => mockGateState,
}));
jest.mock('expo-router', () => ({ router: { back: () => {}, push: () => {} } }));
jest.mock('@/subscription/paywall', () => ({ ...jest.requireActual('@/subscription/paywall'), wait: async () => {} }));
jest.mock('@/subscription/links', () => ({
  ...jest.requireActual('@/subscription/links'),
  configuredLegalLinks: () => [
    { key: 'subscription.terms', url: 'https://example.test/terms' },
    { key: 'subscription.privacy', url: 'https://example.test/privacy' },
  ],
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAnswers = [ok(NONE)];
  mockGateState = 'required';
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <SubscribeScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name })));

test('the plans with no way to close them', async () => {
  await show();
  expect(screen.getByRole('button', { name: t('subscription.startTrial') })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('subscription.close') })).toBeNull();
});

test('the account is reachable without paying: export, delete, sign out (App Review 5.1.1(v))', async () => {
  await show();
  expect(screen.getByRole('button', { name: t('settings.delete.title') })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('settings.signOut.title') })).toBeOnTheScreen();
});

test('bought and seen on the server: the gate asks again, and the tabs open', async () => {
  mockAnswers = [ok(NONE), ok(TRIAL)];
  await show();
  await press(t('subscription.startTrial'));
  expect(screen.getByText(t('subscription.active'))).toBeOnTheScreen();
  expect(mockGate.refresh).toHaveBeenCalled();
});

test('restored and seen: the gate asks again', async () => {
  mockAnswers = [ok(NONE), ok(NONE), ok(TRIAL)];
  await show();
  await press(t('subscription.restore'));
  expect(mockGate.refresh).toHaveBeenCalled();
});

test('already subscribed on the server (bought on another phone): the gate asks again at once', async () => {
  mockAnswers = [ok(TRIAL)];
  await show();
  expect(mockGate.refresh).toHaveBeenCalled();
});

test('not known yet: it asks the gate, says it is checking, and shows no plans', async () => {
  mockGateState = 'unknown';
  await show();
  expect(mockGate.refresh).toHaveBeenCalled();
  expect(screen.getByText(t('subscription.checking'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('subscription.startTrial') })).toBeNull();
});
