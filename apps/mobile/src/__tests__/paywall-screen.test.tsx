/**
 * The paywall (K-702, prototype 1.11, ADR-057): the store's plans, annual chosen first, each with the store's price; the
 * chosen plan's terms (the trial only for someone who can have it); the button buys, then the server is asked until it
 * sees the purchase. Restore is always there; so is a way out. No price in code; nothing bought without the server
 * naming the account.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import PaywallScreen from '@/app/paywall';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { Plan, SubscriptionStore } from '@/subscription/store';
import { storeUnavailable } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';

type Subscription = components['schemas']['Subscription'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const NONE: Subscription = { active: false, appUserId: ID };
const TRIAL: Subscription = { active: true, appUserId: ID, status: 'TRIAL', accessUntil: '2026-10-11T12:00:00Z' };
const PLANS: Plan[] = [
  { id: '$rc_annual', period: 'annual', price: '$59.99', pricePerMonth: '$5.00', trial: { count: 7, unit: 'day' } },
  { id: '$rc_monthly', period: 'monthly', price: '$12.99', pricePerMonth: null, trial: null },
];

let mockAnswers: (Answer | 'offline')[] = [];
const mockGET = jest.fn(async (_path: string) => {
  const answer = mockAnswers.length > 1 ? mockAnswers.shift()! : mockAnswers[0];
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: () => {} } }));
let mockStore: SubscriptionStore;
// One api for the screen's life, as the app's services are built once (a new one each render would open the paywall again).
const mockApi = { GET: mockGET };
const mockServices = { api: mockApi, get purchases() { return mockStore; }, report: () => {} };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
// No real waiting between the looks at the server.
jest.mock('@/subscription/paywall', () => ({ ...jest.requireActual('@/subscription/paywall'), wait: async () => {} }));
const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
let mockLinks = [{ key: 'subscription.terms', url: 'https://example.test/terms' }];
jest.mock('@/subscription/links', () => ({ configuredLegalLinks: () => mockLinks }));

function store(overrides: Partial<SubscriptionStore> = {}): SubscriptionStore {
  return {
    available: true,
    identify: jest.fn(async () => {}),
    forget: jest.fn(async () => {}),
    plans: jest.fn(async () => PLANS),
    buy: jest.fn(async () => 'bought' as const),
    restore: jest.fn(async () => {}),
    manage: jest.fn(async () => {}),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAnswers = [ok(NONE)];
  mockStore = store();
  mockLinks = [{ key: 'subscription.terms', url: 'https://example.test/terms' }];
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <PaywallScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name })));

test("the store's plans, annual chosen first, with the trial's terms and the button that starts it", async () => {
  await show();
  expect(mockStore.identify).toHaveBeenCalledWith(ID);
  expect(screen.getByText('Try it free for 7 days')).toBeOnTheScreen();
  expect(screen.getByRole('radio', { name: `${t('subscription.plan.annual')}, $59.99 a year · $5.00 a month, billed once a year` })).toHaveProp(
    'accessibilityState',
    expect.objectContaining({ checked: true }),
  );
  expect(screen.getByText(t('subscription.today'))).toBeOnTheScreen();
  expect(screen.getByText('When the trial ends: $59.99 a year, renewing every year until you cancel.')).toBeOnTheScreen();
  expect(screen.getByText(t('subscription.cancelNote'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('subscription.startTrial') })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('subscription.restore') })).toBeOnTheScreen();
});

test('choosing the monthly plan (no trial for it): its renewal, no trial anywhere, and the button subscribes', async () => {
  await show();
  await act(async () => fireEvent.press(screen.getByRole('radio', { name: `${t('subscription.plan.monthly')}, $12.99 a month · Billed every month` })));
  expect(screen.getByRole('header', { name: t('subscription.title') })).toBeOnTheScreen();
  expect(screen.getByText('$12.99 a month, renewing every month until you cancel.')).toBeOnTheScreen();
  expect(screen.queryByText(t('subscription.today'))).toBeNull();
  await press(t('subscription.subscribe'));
  expect(mockStore.buy).toHaveBeenCalledWith('$rc_monthly');
});

test('bought, and the server sees it: subscribed, and a way back', async () => {
  mockAnswers = [ok(NONE), ok(NONE), ok(TRIAL)];
  await show();
  await press(t('subscription.startTrial'));
  expect(mockStore.buy).toHaveBeenCalledWith('$rc_annual');
  expect(screen.getByText(t('subscription.active'))).toBeOnTheScreen();
  await press(t('subscription.close'));
  expect(mockBack).toHaveBeenCalled();
});

test('bought, not seen in time: it can take a minute, and looking again asks the server — never buys again', async () => {
  await show();
  await press(t('subscription.startTrial'));
  expect(screen.getByText(t('subscription.waiting'))).toBeOnTheScreen();
  mockAnswers = [ok(TRIAL)];
  await press(t('subscription.lookAgain'));
  expect(screen.getByText(t('subscription.active'))).toBeOnTheScreen();
  expect(mockStore.buy).toHaveBeenCalledTimes(1);
});

test('backing out of Apple’s sheet changes nothing; waiting for approval says so', async () => {
  mockStore = store({ buy: jest.fn(async () => 'cancelled' as const) });
  await show();
  await press(t('subscription.startTrial'));
  expect(screen.getByRole('button', { name: t('subscription.startTrial') })).toBeEnabled();
  mockStore.buy = jest.fn(async () => 'pending' as const);
  await press(t('subscription.startTrial'));
  expect(screen.getByText(t('subscription.pending'))).toBeOnTheScreen();
});

test('a purchase that fails says so; the plans stay', async () => {
  mockStore = store({
    buy: jest.fn(async () => {
      throw Object.assign(new Error('x'), { name: 'PurchaseFailed' });
    }),
  });
  await show();
  await press(t('subscription.startTrial'));
  expect(screen.getByText(t('subscription.purchaseFailed'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('subscription.startTrial') })).toBeEnabled();
});

test('while buying, the button cannot be pressed again (a second sheet would be a second purchase attempt)', async () => {
  let finish: (bought: 'bought') => void = () => {};
  mockStore = store({ buy: jest.fn(() => new Promise<'bought'>((resolve) => (finish = resolve))) });
  await show();
  await press(t('subscription.startTrial'));
  expect(screen.getByText(t('subscription.buying'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('subscription.startTrial') })).toBeNull();
  await act(async () => finish('bought'));
});

test('restore: restored and seen is subscribed; nothing seen says so', async () => {
  mockAnswers = [ok(NONE), ok(NONE), ok(TRIAL)];
  await show();
  await press(t('subscription.restore'));
  expect(mockStore.restore).toHaveBeenCalled();
  expect(screen.getByText(t('subscription.active'))).toBeOnTheScreen();
});

test('restore with nothing to restore: says so, the plans stay', async () => {
  await show();
  await press(t('subscription.restore'));
  expect(screen.getByText(t('subscription.restoreWaiting'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('subscription.startTrial') })).toBeOnTheScreen();
});

test('already subscribed on the server: nothing to sell', async () => {
  mockAnswers = [ok(TRIAL)];
  await show();
  expect(screen.getByText(t('subscription.active'))).toBeOnTheScreen();
  expect(mockStore.plans).not.toHaveBeenCalled();
});

test('no connection: nothing can be bought; trying again asks again', async () => {
  mockAnswers = ['offline'];
  await show();
  expect(screen.getByText(t('subscription.offline'))).toBeOnTheScreen();
  expect(mockStore.identify).not.toHaveBeenCalled();
  mockAnswers = [ok(NONE)];
  await press(t('subscription.tryAgain'));
  expect(screen.getByRole('button', { name: t('subscription.startTrial') })).toBeOnTheScreen();
});

test('not in this build (Expo Go): said so, with a way out', async () => {
  mockStore = storeUnavailable;
  await show();
  expect(screen.getByText(t('subscription.unavailable'))).toBeOnTheScreen();
  await press(t('subscription.close'));
  expect(mockBack).toHaveBeenCalled();
});

test('the legal links set in the build open; one not set is not shown', async () => {
  await show();
  await press(t('subscription.terms'));
  expect(openURL).toHaveBeenCalledWith('https://example.test/terms');
  expect(screen.queryByRole('button', { name: t('subscription.privacy') })).toBeNull();
});

test('there is always a way out of the plans', async () => {
  await show();
  await press(t('subscription.close'));
  expect(mockBack).toHaveBeenCalled();
});
