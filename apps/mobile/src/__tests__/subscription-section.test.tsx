/**
 * Settings › Subscription (K-702, prototype 5.2, ADR-057 D4): what the server keeps, said plainly — a trial and its end, the
 * renewal date, cancelled and paid until when, a payment problem. Cancelling is two taps: "Cancel or change plan" here, then
 * Apple's own page — no screen in between, no "are you sure", nothing to lose said (U7). Without a subscription, the way to
 * the plans; restore is always there.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { SubscriptionSection } from '@/settings/SubscriptionSection';
import type { SubscriptionStore } from '@/subscription/store';
import { storeUnavailable } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';

type Subscription = components['schemas']['Subscription'];
type Answer = { data?: unknown; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
// Noon UTC: the same calendar day on the phone in every time zone a test runs in.
const UNTIL = '2026-10-11T12:00:00Z';

let mockAnswers: (Answer | 'offline')[] = [];
const mockGET = jest.fn(async (_path: string) => {
  const answer = mockAnswers.length > 1 ? mockAnswers.shift()! : mockAnswers[0];
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
const mockPush = jest.fn();
// Settings coming back into view (the paywall closed over it): the focus effect runs again.
let mockFocus: () => void = () => {};
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    useFocusEffect: (effect: () => void) => {
      mockFocus = effect;
      useEffect(() => effect(), [effect]);
    },
  };
});
let mockStore: SubscriptionStore;
const mockApi = { GET: mockGET };
const mockReport = jest.fn();
const mockServices = { api: mockApi, get purchases() { return mockStore; }, report: (problem: { name: string }) => mockReport(problem.name) };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
jest.mock('@/subscription/paywall', () => ({ ...jest.requireActual('@/subscription/paywall'), wait: async () => {} }));

function store(): SubscriptionStore & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    available: true,
    identify: jest.fn(async (id: string) => void calls.push(`identify ${id}`)),
    forget: jest.fn(async () => {}),
    plans: jest.fn(async () => []),
    buy: jest.fn(async () => 'bought' as const),
    restore: jest.fn(async () => void calls.push('restore')),
    manage: jest.fn(async () => void calls.push('manage')),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore = store();
});

async function show(...answers: (Subscription | 'offline')[]) {
  mockAnswers = answers.map((answer) => (answer === 'offline' ? answer : ok(answer)));
  await render(
    <ThemeProvider scheme="light">
      <SubscriptionSection />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name })));
const sub = (status: Subscription['status'], active: boolean): Subscription => ({ active, appUserId: ID, status, accessUntil: UNTIL });

test.each([
  ['TRIAL', true, 'Free trial until Oct 11, 2026.'],
  ['ACTIVE', true, 'Renews on Oct 11, 2026.'],
  ['CANCELLED', true, "Cancelled. Yours until Oct 11, 2026; it won't renew."],
  ['BILLING_ISSUE', true, "The App Store couldn't charge your payment method. Access stays until Oct 11, 2026 while it tries again."],
] as const)('%s: said plainly with its date, and the way to cancel or change it', async (status, active, words) => {
  await show(sub(status, active));
  expect(screen.getByText(words)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('settings.subscription.manage') })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('subscription.seePlans') })).toBeNull();
});

test("cancelling is two taps: this button opens Apple's own page at once, as the account the server names", async () => {
  await show(sub('ACTIVE', true));
  await press(t('settings.subscription.manage'));
  expect((mockStore as ReturnType<typeof store>).calls).toEqual([`identify ${ID}`, 'manage']);
  expect(mockPush).not.toHaveBeenCalled(); // no screen of ours in between
});

test('never subscribed: not subscribed, what works without one, and the way to the plans', async () => {
  await show({ active: false, appUserId: ID });
  expect(screen.getByText(t('settings.subscription.none'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('settings.subscription.manage') })).toBeNull();
  await press(t('subscription.seePlans'));
  expect(mockPush).toHaveBeenCalledWith('/paywall');
});

test.each([
  ['EXPIRED', 'Ended on Oct 11, 2026.'],
  ['REFUNDED', 'Refunded.'],
] as const)('%s: said, and the way to the plans', async (status, words) => {
  await show(sub(status, false));
  expect(screen.getByText(words)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('subscription.seePlans') })).toBeOnTheScreen();
});

test('restore from here: restored and seen, the section reads the subscription again', async () => {
  await show({ active: false, appUserId: ID }, { active: false, appUserId: ID }, sub('ACTIVE', true));
  await press(t('subscription.restore'));
  expect((mockStore as ReturnType<typeof store>).calls).toEqual([`identify ${ID}`, 'restore']);
  expect(screen.getByText('Renews on Oct 11, 2026.')).toBeOnTheScreen();
});

test('restore with nothing to restore says so', async () => {
  await show({ active: false, appUserId: ID });
  await press(t('subscription.restore'));
  expect(screen.getByText(t('subscription.restoreWaiting'))).toBeOnTheScreen();
});

test('not in this build: the state is still the server’s; managing says where it works, and nothing is pressed', async () => {
  mockStore = storeUnavailable;
  await show(sub('ACTIVE', true));
  expect(screen.getByText('Renews on Oct 11, 2026.')).toBeOnTheScreen();
  expect(screen.getByText(t('settings.subscription.unavailable'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('settings.subscription.manage') })).toBeNull();
  expect(screen.queryByRole('button', { name: t('subscription.restore') })).toBeNull();
});

test('the subscription not read: says so; nothing to press that would act under an unknown account', async () => {
  await show('offline');
  expect(screen.getByText(t('settings.subscription.failed'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('settings.subscription.manage') })).toBeNull();
  expect(screen.queryByRole('button', { name: t('subscription.restore') })).toBeNull();
});

test.each(['BILLING_ISSUE', 'PAUSED'] as const)(
  '%s past its access: still something on the App Store to cancel or change — the way there, not the plans',
  async (status) => {
    await show(sub(status, false));
    expect(screen.getByRole('button', { name: t('settings.subscription.manage') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('subscription.seePlans') })).toBeNull();
  },
);

test('back from the plans (Settings in view again): the subscription is read again — bought there, shown here', async () => {
  await show({ active: false, appUserId: ID });
  expect(screen.getByText(t('settings.subscription.none'))).toBeOnTheScreen();
  mockAnswers = [ok(sub('TRIAL', true))];
  await act(async () => mockFocus());
  expect(screen.getByText('Free trial until Oct 11, 2026.')).toBeOnTheScreen();
});

test("back from Apple's page: read again — a cancellation made there shows here", async () => {
  await show(sub('ACTIVE', true), sub('CANCELLED', true));
  await press(t('settings.subscription.manage'));
  expect(screen.getByText("Cancelled. Yours until Oct 11, 2026; it won't renew.")).toBeOnTheScreen();
});

test("Apple's page that cannot be opened says so and is reported by name", async () => {
  mockStore = { ...store(), manage: jest.fn(async () => Promise.reject(Object.assign(new Error('x'), { name: 'StoreError_2' }))) };
  await show(sub('ACTIVE', true));
  await press(t('settings.subscription.manage'));
  expect(screen.getByText(t('settings.subscription.manageFailed'))).toBeOnTheScreen();
  expect(mockReport).toHaveBeenCalledWith('StoreError_2');
});

test('a restore that fails says so and is reported by name', async () => {
  mockStore = { ...store(), restore: jest.fn(async () => Promise.reject(Object.assign(new Error('x'), { name: 'StoreError_10' }))) };
  await show({ active: false, appUserId: ID });
  await press(t('subscription.restore'));
  expect(screen.getByText(t('subscription.restoreFailed'))).toBeOnTheScreen();
  expect(mockReport).toHaveBeenCalledWith('StoreError_10');
});
