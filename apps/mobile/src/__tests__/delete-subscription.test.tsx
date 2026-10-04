/**
 * Deleting the account with a subscription (K-811, App Review 5.1.1(v); Apple's "Offering account deletion in your app":
 * "If the user has auto-renewable subscriptions, notify them that their billing will continue through Apple and request
 * that they cancel their subscription before continuing"). The confirming step says so whenever a subscription runs or the
 * phone cannot tell, offers Apple's page where the store is in the build, and the deletion stays one tap away.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { AccountSection } from '@/settings/AccountSection';
import type { SubscriptionStore } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';

type Subscription = components['schemas']['Subscription'];
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const UNTIL = '2026-10-11T12:00:00Z';

let mockAnswer: Subscription | 'offline' | 500 = { appUserId: ID, active: false };
const mockGET = jest.fn(async (_path: string) => {
  if (mockAnswer === 'offline') throw new TypeError('Network request failed');
  if (mockAnswer === 500) return { error: { code: 'INTERNAL' }, response: new Response(null, { status: 500 }) };
  return { data: mockAnswer, response: new Response(null, { status: 200 }) };
});
let mockStore: SubscriptionStore & { calls: string[] };
const mockServices = {
  api: { GET: mockGET },
  get purchases() {
    return mockStore;
  },
  deleteAccount: jest.fn(async () => {}),
  exportData: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  pendingCount: jest.fn(async () => 0),
  photos: { photos: jest.fn(async () => []) },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

function store(available = true): SubscriptionStore & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    available,
    identify: jest.fn(async (id: string) => void calls.push(`identify ${id}`)),
    forget: jest.fn(async () => {}),
    plans: jest.fn(async () => []),
    buy: jest.fn(async () => 'bought' as const),
    restore: jest.fn(async () => {}),
    manage: jest.fn(async () => void calls.push('manage')),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore = store();
});

async function askToDelete(answer: Subscription | 'offline' | 500) {
  mockAnswer = answer;
  await render(
    <ThemeProvider scheme="light">
      <AccountSection />
    </ThemeProvider>,
  );
  await act(async () => fireEvent.press(screen.getByText(t('settings.delete.title'))));
}

const billing = () => screen.queryByText(t('settings.delete.subscription'));
const manage = () => screen.queryByText(t('settings.subscription.manage'));

test.each<[string, Subscription]>([
  ['running', { appUserId: ID, active: true, status: 'ACTIVE', accessUntil: UNTIL }],
  ['in its trial', { appUserId: ID, active: true, status: 'TRIAL', accessUntil: UNTIL }],
  ['with a payment problem', { appUserId: ID, active: false, status: 'BILLING_ISSUE', accessUntil: UNTIL }],
  ['paused (it resumes)', { appUserId: ID, active: false, status: 'PAUSED', accessUntil: UNTIL }],
])('a subscription %s: Apple goes on billing, said before the deletion, with its page one tap away', async (_, subscription) => {
  await askToDelete(subscription);
  expect(mockGET).toHaveBeenCalledWith('/v1/subscription');
  expect(billing()).toBeOnTheScreen();
  await act(async () => fireEvent.press(manage()!));
  expect(mockStore.calls).toEqual([`identify ${ID}`, 'manage']);
  expect(mockServices.deleteAccount).not.toHaveBeenCalled();
  // Still one tap away: cancelling first is asked, not required.
  await act(async () => fireEvent.press(screen.getByText(t('settings.delete.confirm'))));
  expect(mockServices.deleteAccount).toHaveBeenCalledTimes(1);
});

test('no subscription: nothing said about billing', async () => {
  await askToDelete({ appUserId: ID, active: false });
  expect(screen.getByText(t('settings.delete.confirmBody'))).toBeOnTheScreen();
  expect(billing()).toBeNull();
  expect(manage()).toBeNull();
});

test.each<[string, Subscription]>([
  ['cancelled, paid until a date', { appUserId: ID, active: true, status: 'CANCELLED', accessUntil: UNTIL }],
  ['expired', { appUserId: ID, active: false, status: 'EXPIRED', accessUntil: UNTIL }],
  ['refunded', { appUserId: ID, active: false, status: 'REFUNDED', accessUntil: UNTIL }],
])('%s: nothing more is billed, nothing said about billing', async (_, subscription) => {
  await askToDelete(subscription);
  expect(billing()).toBeNull();
  expect(manage()).toBeNull();
});

test.each<['offline' | 500]>([['offline'], [500]])('the phone cannot tell (%s): it says so anyway, without the button it cannot back', async (answer) => {
  await askToDelete(answer);
  expect(billing()).toBeOnTheScreen();
  expect(manage()).toBeNull();
  await act(async () => fireEvent.press(screen.getByText(t('settings.delete.confirm'))));
  expect(mockServices.deleteAccount).toHaveBeenCalledTimes(1);
});

test('the store not in the build: said, with no button to a page it cannot open', async () => {
  mockStore = store(false);
  await askToDelete({ appUserId: ID, active: true, status: 'ACTIVE', accessUntil: UNTIL });
  expect(billing()).toBeOnTheScreen();
  expect(manage()).toBeNull();
});
