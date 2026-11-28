/**
 * The paywall names the coach only while the server's model is on (K-1268, Apple 3.1.2 / 2.3.1): its AI offer
 * (GET /v1/consents/ai-offer) is the server's word, 404 while it has no provider (production today, ADR-064 #5). The screen being on
 * the surface (aiLogging.coachAvailable) is not enough: a coach sold while it cannot answer is a feature that is not there.
 */
import { act, render, screen } from '@testing-library/react-native';

import SubscribeScreen from '@/app/subscribe';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { PlanPreview } from '@/subscription/planPreview';
import type { Plan, SubscriptionStore } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';

type Subscription = components['schemas']['Subscription'];
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const NONE: Subscription = { active: false, appUserId: ID };
const ANNUAL: Plan = { id: '$rc_annual', period: 'annual', price: '$59.99', amount: 59.99, currency: 'USD', pricePerMonth: '$5.00', trial: { count: 2, unit: 'week' } };
const MONTHLY: Plan = { id: '$rc_monthly', period: 'monthly', price: '$12.99', amount: 12.99, currency: 'USD', pricePerMonth: null, trial: null };
const PREVIEW: PlanPreview = {
  own: false,
  days: 3,
  firstWorkout: 'MONDAY',
  firstCall: '2026-10-19',
  checkInDay: 'MONDAY',
  hasCardio: true,
  startingKcal: 2440, workoutName: 'Upper A', workoutMoves: 9, workoutToday: true,
};

let mockPlans: Plan[] = [ANNUAL, MONTHLY];
let mockPreview: PlanPreview | null = null;
const mockStore: SubscriptionStore = {
  available: true,
  identify: jest.fn(async () => {}),
  forget: jest.fn(async () => {}),
  plans: jest.fn(async () => mockPlans),
  buy: jest.fn(async () => 'bought' as const),
  restore: jest.fn(async () => {}),
  manage: jest.fn(async () => {}),
};
let mockOffer: 'on' | 'none' | 'offline' = 'on';
const OFFER = { provider: 'OpenAI', dataTypes: ['messages'] };
const missing = () => ({ error: { code: 'NOT_FOUND' }, response: new Response(null, { status: 404 }) });
const mockServices = {
  reviewPrompt: { noteFinish: async () => {}, notePaywall: async () => {}, maybeAsk: async () => false },
  api: {
    GET: jest.fn(async (path: string) => {
      if (path !== '/v1/consents/ai-offer') return ok(NONE);
      if (mockOffer === 'offline') throw new Error('offline');
      return mockOffer === 'on' ? ok(OFFER) : missing();
    }),
  },
  purchases: mockStore,
  gate: { refresh: jest.fn(async () => true), current: () => 'required', subscribe: () => () => {} },
  report: () => {},
  trialReminder: { keep: async () => {}, when: async () => null, canRemind: () => true, remind: jest.fn(async () => 'set' as const), forget: async () => {} },
  exportData: jest.fn(async () => {}),
  deleteAccount: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  pendingCount: jest.fn(async () => 0),
  photos: { photos: jest.fn(async () => []) },
  planPreviews: { current: () => mockPreview, keep: () => {}, forget: jest.fn() },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useSubscriptionGate: () => 'required', useUnits: () => 'METRIC' }));
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
  jest.useFakeTimers({ now: new Date(2026, 9, 13, 12, 0), advanceTimers: true });
  mockPlans = [ANNUAL, MONTHLY];
  mockPreview = null;
  mockOffer = 'on';
  mockStore.available = true;
});
afterEach(() => jest.useRealTimers());

async function show(scheme: 'light' | 'dark' = 'light') {
  await render(
    <ThemeProvider scheme={scheme}>
      <SubscribeScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}


describe('the second value line (K-1268)', () => {
  test('the server has a model: the coach, to ask about your week', async () => {
    mockPreview = PREVIEW;
    await show();
    expect(screen.getByText(t('subscription.values.coach'))).toBeOnTheScreen();
    expect(screen.queryByText(t('subscription.values.adjust'))).toBeNull();
  });

  test.each([
    ['the server has no provider (its AI offer is 404)', 'none' as const],
    ['the offer cannot be read', 'offline' as const],
  ])('%s: never the coach, the cardio and food that adjust instead', async (_case, offer) => {
    mockOffer = offer;
    mockPreview = PREVIEW;
    await show();
    expect(screen.queryByText(t('subscription.values.coach'))).toBeNull();
    expect(screen.getByText(t('subscription.values.adjust'))).toBeOnTheScreen();
  });

  test('met later from Settings (no plan just shown), with no provider: the weekly call and the adjusting, no coach', async () => {
    mockOffer = 'none';
    await show();
    expect(screen.getByText(t('subscription.values.weeklyCall'))).toBeOnTheScreen();
    expect(screen.queryByText(t('subscription.values.coach'))).toBeNull();
  });
});
