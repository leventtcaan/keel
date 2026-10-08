/**
 * The gate screen after onboarding (K-706, ADR-058 › 107): an account that never subscribed sees the plans with no way to close
 * them — but with its account: export, delete (App Review 5.1.1(v): deletion in the app, reachable without paying) and sign
 * out. Bought or restored, the gate asks the server again and the tabs open. Not known yet: it asks, and waits.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import SubscribeScreen from '@/app/subscribe';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { GateState } from '@/subscription/gate';
import type { PlanPreview } from '@/subscription/planPreview';
import type { Plan, SubscriptionStore } from '@/subscription/store';
import { paywallTimeline } from '@/subscription/words';
import { weekdayDate } from '@/today/today';
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
let mockAnswered = true;
const mockGate = { refresh: jest.fn(async () => mockAnswered), current: () => mockGateState, subscribe: () => () => {} };
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
  trialReminder: { keep: async () => {}, when: async () => null, canRemind: () => true, remind: jest.fn(async () => 'set' as const), forget: async () => {} },
  // The account section (K-309): its own behaviour is settings-screen.test.tsx.
  exportData: jest.fn(async () => {}),
  deleteAccount: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  pendingCount: jest.fn(async () => 0),
  photos: { photos: jest.fn(async () => []) },
  // The plan just shown at the end of onboarding (K-967); none when the gate is met later.
  planPreviews: { current: () => mockPreview, keep: () => {}, forget: jest.fn() },
};
let mockPreview: PlanPreview | null = null;
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
  mockAnswered = true;
  mockPreview = null;
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

test('bought and seen on the server: said, and Continue lets the gate ask again (the tabs open) — not before', async () => {
  mockAnswers = [ok(NONE), ok(TRIAL)];
  await show();
  await press(t('subscription.startTrial'));
  expect(screen.getByText(t('subscription.active'))).toBeOnTheScreen();
  expect(mockGate.refresh).not.toHaveBeenCalled();
  await press(t('subscription.continue'));
  expect(mockGate.refresh).toHaveBeenCalledTimes(1);
});

test('restored and seen: Continue lets the gate ask again', async () => {
  mockAnswers = [ok(NONE), ok(NONE), ok(TRIAL)];
  await show();
  await press(t('subscription.restore'));
  expect(mockGate.refresh).not.toHaveBeenCalled();
  await press(t('subscription.continue'));
  expect(mockGate.refresh).toHaveBeenCalledTimes(1);
});

test('already subscribed on the server (bought on another phone): Continue', async () => {
  mockAnswers = [ok(TRIAL)];
  await show();
  await press(t('subscription.continue'));
  expect(mockGate.refresh).toHaveBeenCalledTimes(1);
});

test('bought, seen only on looking again: Continue', async () => {
  mockAnswers = [ok(NONE)];
  await show();
  await press(t('subscription.startTrial'));
  expect(screen.getByText(t('subscription.waiting'))).toBeOnTheScreen();
  mockAnswers = [ok(TRIAL)];
  await press(t('subscription.lookAgain'));
  await press(t('subscription.continue'));
  expect(mockGate.refresh).toHaveBeenCalledTimes(1);
});

test('opened offline, tried again and already subscribed: Continue', async () => {
  mockAnswers = [{ error: { code: 'INTERNAL', message: 'x' }, response: new Response(null, { status: 500 }) }];
  await show();
  mockAnswers = [ok(TRIAL)];
  await press(t('subscription.tryAgain'));
  await press(t('subscription.continue'));
  expect(mockGate.refresh).toHaveBeenCalledTimes(1);
});

test('the screen drawn again (a theme change) does not open the plans again — a purchase in progress stays', async () => {
  await show();
  await screen.rerender(
    <ThemeProvider scheme="dark">
      <SubscribeScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(mockStore.plans).toHaveBeenCalledTimes(1);
});

test('not known yet: it asks the gate, says it is checking, and shows no plans', async () => {
  mockGateState = 'unknown';
  await show();
  expect(mockGate.refresh).toHaveBeenCalledTimes(1);
  expect(screen.getByText(t('subscription.checking'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('subscription.startTrial') })).toBeNull();
});

test('not known, and no answer: says so, and asks again on request — the gate never opens by failing', async () => {
  mockGateState = 'unknown';
  mockAnswered = false;
  await show();
  expect(screen.getByText(t('subscription.checkFailed'))).toBeOnTheScreen();
  mockAnswered = true;
  await press(t('subscription.tryAgain'));
  expect(mockGate.refresh).toHaveBeenCalledTimes(2);
});

describe('#paywall after the plan (ADR-072 #7)', () => {
  // A Tuesday at noon, the phone's clock (review): the first call (Mon 19), the 7-day trial's reminder (Sun 18) and its
  // charge (Tue 20) fall on three different days, whatever day the tests run.
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 13, 12, 0), advanceTimers: true });
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  const FIRST_CALL = '2026-10-19';
  const PREVIEW: PlanPreview = { own: false, days: 3, firstWorkout: 'MONDAY', firstCall: FIRST_CALL, checkInDay: 'MONDAY', hasCardio: true };

  test('the plan just shown, in brief: how many days, the first workout (the first call is on the timeline, once)', async () => {
    mockPreview = PREVIEW;
    await show();
    expect(screen.getByText(t('subscription.preview.program', { count: 3 }))).toBeOnTheScreen();
    expect(screen.getByText(t('subscription.preview.firstWorkout', { day: t('onboarding.schedule.dayName.MONDAY') }))).toBeOnTheScreen();
    expect(screen.getAllByText(weekdayDate(FIRST_CALL))).toHaveLength(1);
  });

  test('three values: the program for the days (or the own program, tuned), every set\'s weight and reps, the call on its day', async () => {
    mockPreview = PREVIEW;
    await show();
    for (const key of ['subscription.values.built', 'subscription.values.sets']) expect(screen.getByText(t(key))).toBeOnTheScreen();
    expect(screen.getByText(t('subscription.values.call', { day: t('onboarding.schedule.dayName.MONDAY') }))).toBeOnTheScreen();
    await screen.unmount();
    mockPreview = { ...PREVIEW, own: true };
    await show();
    expect(screen.getByText(t('subscription.values.own'))).toBeOnTheScreen();
    expect(screen.queryByText(t('subscription.values.built'))).toBeNull();
  });

  test('the call on the profile\'s own check-in day', async () => {
    mockPreview = { ...PREVIEW, checkInDay: 'SUNDAY' };
    await show();
    expect(screen.getByText(t('subscription.values.call', { day: t('onboarding.schedule.dayName.SUNDAY') }))).toBeOnTheScreen();
  });

  test('the timeline with the store\'s trial: today, the first call, the reminder, the charge, each on its day', async () => {
    mockPreview = PREVIEW;
    await show();
    const timeline = paywallTimeline(PLANS[0], { today: '2026-10-13', firstCall: FIRST_CALL });
    expect(timeline.map((row) => row.when)).toEqual(['Today', 'Sun, Oct 18', 'Mon, Oct 19', 'Tue, Oct 20']);
    for (const row of timeline) {
      expect(screen.getAllByText(row.when).length).toBeGreaterThan(0);
      expect(screen.getByText(row.words)).toBeOnTheScreen();
    }
  });

  test('met later, with no plan just shown: no preview, no first call on the timeline, the call named without a day', async () => {
    await show();
    expect(screen.queryByText(t('subscription.preview.program', { count: 3 }))).toBeNull();
    expect(screen.queryByText(t('subscription.timeline.firstCall'))).toBeNull();
    expect(screen.getByText(t('subscription.values.weeklyCall'))).toBeOnTheScreen();
  });

  test('without the health data consent there are no calls: none on the timeline, and another value in the call\'s place', async () => {
    mockPreview = { ...PREVIEW, firstCall: null };
    await show();
    expect(screen.queryByText(t('subscription.timeline.firstCall'))).toBeNull();
    expect(screen.queryByText(t('subscription.values.call', { day: t('onboarding.schedule.dayName.MONDAY') }))).toBeNull();
    expect(screen.getByText(t('subscription.values.cardio'))).toBeOnTheScreen();
  });

  test('without the consent and without cardio in the program (very active work): no cardio promised, a value every program has', async () => {
    mockPreview = { ...PREVIEW, firstCall: null, hasCardio: false };
    await show();
    expect(screen.queryByText(t('subscription.values.cardio'))).toBeNull();
    expect(screen.getByText(t('subscription.values.swap'))).toBeOnTheScreen();
  });

  test('bought: the plan kept for the paywall is let go before the tabs open', async () => {
    mockPreview = PREVIEW;
    mockAnswers = [ok(NONE), ok(TRIAL)];
    await show();
    await press(t('subscription.startTrial'));
    await press(t('subscription.continue'));
    expect(mockServices.planPreviews.forget).toHaveBeenCalledTimes(1);
    expect(mockServices.planPreviews.forget.mock.invocationCallOrder[0]).toBeLessThan(mockGate.refresh.mock.invocationCallOrder[0]);
  });
});
