/**
 * The trial is offered at the first locked call, not at the end of onboarding (ADR-091 Ek 7, K-1255): the locked call says the
 * trial when the store says this person can have it, its length the store's; the paywall it opens says the call opens today;
 * bought, the paywall says the call is open only when the server returns it unlocked (ADR-057 D2, U1). Right after onboarding
 * the person's plan stays the paywall's hero wherever the paywall is opened from (ADR-094 Ek 8 #2), but never by itself.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import PaywallScreen from '@/app/paywall';
import { t } from '@/copy';
import type { PlanPreview } from '@/subscription/planPreview';
import type { Plan, SubscriptionStore } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';
import { LockedCallView } from '@/today/LockedCallView';
import { weekdayDate } from '@/today/today';

type Subscription = components['schemas']['Subscription'];
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const failed = () => ({ error: { code: 'X', message: 'x' }, response: new Response(null, { status: 500 }) });
const APP_USER = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const NONE: Subscription = { active: false, appUserId: APP_USER };
const TRIAL: Subscription = { active: true, appUserId: APP_USER, status: 'TRIAL', accessUntil: '2026-12-12T12:00:00Z' } as Subscription;
const ANNUAL: Plan = { id: '$rc_annual', period: 'annual', price: '$59.99', amount: 59.99, currency: 'USD', pricePerMonth: '$5.00', trial: { count: 2, unit: 'week' } };
const MONTHLY: Plan = { id: '$rc_monthly', period: 'monthly', price: '$12.99', amount: 12.99, currency: 'USD', pricePerMonth: null, trial: null };
const WEEK = '2026-11-25';
const LOCKED = { id: 'd9', madeOn: WEEK, weekOf: WEEK, nextCallOn: '2026-12-02', locked: true as const };
const OPEN = {
  id: 'd9', madeOn: WEEK, weekOf: WEEK, nextCallOn: '2026-12-02', action: 'CONTINUE', copyKey: 'decision.continue.on_track', reasons: [], confidence: 'MEDIUM',
  changes: [], application: { state: 'APPLIED' },
};
const PLAN: PlanPreview = {
  own: false, days: 3, firstWorkout: 'MONDAY', firstCall: '2026-12-07', checkInDay: 'MONDAY', hasCardio: false, startingKcal: 2440,
  workoutName: 'Full body', workoutMoves: 5, workoutToday: false,
};

let mockParams: Record<string, string> = {};
let mockSubscription: Subscription | null = NONE;
let mockCall: unknown = LOCKED;
let mockPlans: Plan[] = [ANNUAL, MONTHLY];
let mockAvailable = true;
let mockKept: PlanPreview | null = null;
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockStore: SubscriptionStore = {
  get available() {
    return mockAvailable;
  },
  identify: jest.fn(async () => {}),
  forget: jest.fn(async () => {}),
  plans: jest.fn(async () => mockPlans),
  buy: jest.fn(async () => {
    mockSubscription = TRIAL;
    mockCall = OPEN; // the server releases the held call on the next read once the account is subscribed (ADR-091 Ek 1)
    return 'bought' as const;
  }),
  restore: jest.fn(async () => {}),
  manage: jest.fn(async () => {}),
};
const mockGet = jest.fn(async (path: string) => {
  if (path === '/v1/subscription') return mockSubscription === null ? failed() : ok(mockSubscription);
  if (path === '/v1/decisions/current') return mockCall === null ? failed() : ok(mockCall);
  return failed();
});
const mockServices = {
  reviewPrompt: { noteFinish: jest.fn(async () => {}), notePaywall: jest.fn(async () => {}), maybeAsk: jest.fn(async () => false) },
  api: { GET: mockGet },
  purchases: mockStore,
  report: () => {},
  trialReminder: { keep: async () => {}, when: async () => null, canRemind: () => true, remind: jest.fn(async () => 'set' as const), forget: async () => {} },
  planPreviews: { current: () => mockKept, keep: () => {}, forget: jest.fn() },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useSubscriptionGate: () => 'open', useUnits: () => 'METRIC' }));
let mockRefocus: (() => void)[] = [];
jest.mock('expo-router', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return {
    router: { back: (...a: unknown[]) => mockBack(...a), push: (...a: unknown[]) => mockPush(...a) },
    useLocalSearchParams: () => mockParams,
    // Run on mount as a focus is; the test runs the latest ones again for the screen coming back into focus.
    useFocusEffect: (effect: () => void | (() => void)) => {
      mockRefocus.push(effect as () => void);
      react.useEffect(effect, [effect]);
    },
  };
});
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
  mockRefocus = [];
  jest.useFakeTimers({ now: new Date(2026, 10, 28, 12, 0), advanceTimers: true });
  mockParams = {};
  mockSubscription = NONE;
  mockCall = LOCKED;
  mockPlans = [ANNUAL, MONTHLY];
  mockAvailable = true;
  mockKept = null;
});
afterEach(() => jest.useRealTimers());

async function show(node: React.ReactNode) {
  await render(
    <SafeAreaInsetsContext.Provider value={{ top: 0, bottom: 34, left: 0, right: 0 }}>
      <ThemeProvider scheme="light">{node}</ThemeProvider>
    </SafeAreaInsetsContext.Provider>,
  );
  await act(async () => {});
}

const TRY = t('lockedCall.tryFree', { trial: t('subscription.trialSpan.week', { count: '2' }) });

describe('the locked call says the trial (ADR-091 Ek 7 #2)', () => {
  test('the store says this person can have a trial: its length on the button, and that it opens the call now', async () => {
    await show(<LockedCallView call={LOCKED} />);
    expect(screen.getByText(t('lockedCall.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('lockedCall.lineTrial', { date: weekdayDate(WEEK) }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('subscription.seePlans') })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: TRY }));
    // The purchase and its terms are the paywall's (Apple 3.1.2): the button opens it on this call's week.
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { week: WEEK } });
  });

  test('a one-week trial is said as one week: the length is the store\'s, never the code\'s', async () => {
    mockPlans = [{ ...ANNUAL, trial: { count: 1, unit: 'week' } }, MONTHLY];
    await show(<LockedCallView call={LOCKED} />);
    expect(screen.getByRole('button', { name: t('lockedCall.tryFree', { trial: t('subscription.trialSpanOne.week') }) })).toBeOnTheScreen();
  });

  test('back on the screen, the store is asked again: a trial used meanwhile is no longer promised (Apple 3.1.2)', async () => {
    await show(<LockedCallView call={LOCKED} />);
    expect(screen.getByRole('button', { name: TRY })).toBeOnTheScreen();
    mockPlans = [{ ...ANNUAL, trial: null }, MONTHLY];
    await act(async () => mockRefocus[mockRefocus.length - 1]());
    expect(screen.getByRole('button', { name: t('subscription.seePlans') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: TRY })).toBeNull();
  });

  test.each([
    ['the trial was had already (the store gives none)', () => (mockPlans = [{ ...ANNUAL, trial: null }, MONTHLY])],
    ['no store in this build', () => (mockAvailable = false)],
    ['the server cannot be asked', () => (mockSubscription = null)],
    ['the store cannot show its plans', () => (mockPlans = [])],
  ])('%s: the line and "See plans" as before, no trial promised', async (_case, arrange) => {
    arrange();
    await show(<LockedCallView call={LOCKED} />);
    expect(screen.getByText(t('lockedCall.line', { date: weekdayDate(WEEK) }))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('subscription.seePlans') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: TRY })).toBeNull();
  });
});

describe('the paywall opened from the locked call (ADR-091 Ek 7 #3, #4)', () => {
  beforeEach(() => {
    mockParams = { week: WEEK };
  });

  test('the timeline\'s first line says the call opens today, at no charge', async () => {
    await show(<PaywallScreen />);
    expect(screen.getByText(t('subscription.timeline.callOpensFree'))).toBeOnTheScreen();
    expect(screen.queryByText(t('subscription.timeline.free'))).toBeNull();
  });

  test('a link to a week with no call locked for it: the usual first line (U1)', async () => {
    mockCall = { ...LOCKED, weekOf: '2026-11-18' };
    await show(<PaywallScreen />);
    expect(screen.getByText(t('subscription.timeline.free'))).toBeOnTheScreen();
    expect(screen.queryByText(t('subscription.timeline.callOpensFree'))).toBeNull();
  });

  test('bought: once the server returns the call unlocked, it says the call is open, and "See your call" closes the plans', async () => {
    await show(<PaywallScreen />);
    await fireEvent.press(screen.getByRole('button', { name: t('subscription.startTrial', { trial: t('subscription.trial.week', { count: '2' }) }) }));
    await act(async () => {});
    expect(await screen.findByText(t('subscription.callOpen', { date: weekdayDate(WEEK) }))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('subscription.seeCall') }));
    expect(mockBack).toHaveBeenCalled();
  });

  test('bought, and the server returns another call unlocked: no "open" claim for this one (U1)', async () => {
    (mockStore.buy as jest.Mock).mockImplementationOnce(async () => {
      mockSubscription = TRIAL;
      mockCall = { ...OPEN, id: 'd10' };
      return 'bought';
    });
    await show(<PaywallScreen />);
    await fireEvent.press(screen.getByRole('button', { name: t('subscription.startTrial', { trial: t('subscription.trial.week', { count: '2' }) }) }));
    await act(async () => {});
    expect(await screen.findByText(t('subscription.subscribed.coach'))).toBeOnTheScreen();
    expect(screen.queryByText(t('subscription.callOpen', { date: weekdayDate(WEEK) }))).toBeNull();
  });

  test('without a trial: the first line says the call opens and what is charged today', async () => {
    mockPlans = [{ ...ANNUAL, trial: null }, MONTHLY];
    await show(<PaywallScreen />);
    expect(screen.getByText(t('subscription.timeline.callOpensCharged.annual', { price: '$59.99' }))).toBeOnTheScreen();
  });

  test('bought, but the server still returns it locked: no "open" claim, only the subscription', async () => {
    (mockStore.buy as jest.Mock).mockImplementationOnce(async () => {
      mockSubscription = TRIAL;
      return 'bought';
    });
    await show(<PaywallScreen />);
    await fireEvent.press(screen.getByRole('button', { name: t('subscription.startTrial', { trial: t('subscription.trial.week', { count: '2' }) }) }));
    await act(async () => {});
    expect(await screen.findByText(t('subscription.subscribed.coach'))).toBeOnTheScreen();
    expect(screen.queryByText(t('subscription.callOpen', { date: weekdayDate(WEEK) }))).toBeNull();
    expect(screen.queryByRole('button', { name: t('subscription.seeCall') })).toBeNull();
  });
});

describe('right after onboarding (ADR-091 Ek 7 #1)', () => {
  test('the plan just shown is the hero of a paywall opened in the same run, from anywhere but a locked call', async () => {
    mockKept = PLAN;
    await show(<PaywallScreen />);
    expect(screen.getByLabelText(t('subscription.yours.label'))).toBeOnTheScreen();
  });

  test('a link to a week with no call locked for it: the plan just shown, not the example (U1)', async () => {
    mockKept = PLAN;
    mockParams = { week: WEEK };
    mockCall = { ...LOCKED, weekOf: '2026-11-18' };
    await show(<PaywallScreen />);
    expect(screen.getByLabelText(t('subscription.yours.label'))).toBeOnTheScreen();
  });

  test('from the locked call, the hero is the call, not the plan', async () => {
    mockKept = PLAN;
    mockParams = { week: WEEK };
    await show(<PaywallScreen />);
    expect(screen.queryByLabelText(t('subscription.yours.label'))).toBeNull();
    expect(screen.getByLabelText(t('subscription.ready.label', { date: weekdayDate(WEEK) }))).toBeOnTheScreen();
  });
});
