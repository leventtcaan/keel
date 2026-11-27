/**
 * The paywall in the warm notebook (ADR-094 Ek 8, K-1253): no band and no card, the page is the paper. Opened from the
 * person's locked call (`?week=`), the hero is that call — with their own weight line, the server's trend (U1) — and otherwise
 * an example told in weight, in their units, marked as one. The timeline comes before the prices, its title the screen's serif
 * heading; the plans side by side, the saving in words, not a filled badge. No weight promise anywhere (U12, ADR-050).
 */
import { act, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import PaywallScreen from '@/app/paywall';
import SubscribeScreen from '@/app/subscribe';
import { t } from '@/copy';
import type { Plan, SubscriptionStore } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';
import { weekdayDate } from '@/today/today';
import { formatWeight } from '@/units/units';

import params from '../../../../data/parameters/subscription.json';

type Subscription = components['schemas']['Subscription'];
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const failed = () => ({ error: { code: 'X', message: 'x' }, response: new Response(null, { status: 500 }) });
const NONE: Subscription = { active: false, appUserId: '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b' };
const ANNUAL: Plan = { id: '$rc_annual', period: 'annual', price: '$59.99', amount: 59.99, currency: 'USD', pricePerMonth: '$5.00', trial: { count: 2, unit: 'week' } };
const MONTHLY: Plan = { id: '$rc_monthly', period: 'monthly', price: '$12.99', amount: 12.99, currency: 'USD', pricePerMonth: null, trial: null };
const WEEK = '2026-11-25';
const TREND = [
  { day: '2026-09-02', kg: 92.2 },
  { day: '2026-10-14', kg: 89.6 },
  { day: '2026-11-25', kg: 87.4 },
];

let mockParams: Record<string, string> = { week: WEEK };
let mockTrendReady = true;
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
const mockStore: SubscriptionStore = {
  available: true,
  identify: jest.fn(async () => {}),
  forget: jest.fn(async () => {}),
  plans: jest.fn(async () => [ANNUAL, MONTHLY]),
  buy: jest.fn(async () => 'cancelled' as const),
  restore: jest.fn(async () => {}),
  manage: jest.fn(async () => {}),
};
const mockGet = jest.fn(async (path: string) => {
  if (path === '/v1/subscription') return ok(NONE);
  if (path === '/v1/weigh-ins/summary') return ok({ weighInCount: 40, trendMinWeighIns: 7, trendReady: mockTrendReady });
  if (path === '/v1/weight-trend') return ok(TREND);
  return failed();
});
const mockServices = {
  api: { GET: mockGet },
  purchases: mockStore,
  gate: { refresh: jest.fn(async () => true), current: () => 'required', subscribe: () => () => {} },
  report: () => {},
  trialReminder: { keep: async () => {}, when: async () => null, canRemind: () => true, remind: jest.fn(async () => 'set' as const), forget: async () => {} },
  exportData: jest.fn(async () => {}),
  deleteAccount: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  pendingCount: jest.fn(async () => 0),
  photos: { photos: jest.fn(async () => []) },
  planPreviews: { current: () => null, keep: () => {}, forget: jest.fn() },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useSubscriptionGate: () => 'required', useUnits: () => mockUnits }));
jest.mock('expo-router', () => ({ router: { back: () => {}, push: () => {} }, useLocalSearchParams: () => mockParams }));
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
  jest.useFakeTimers({ now: new Date(2026, 10, 28, 12, 0), advanceTimers: true });
  mockParams = { week: WEEK };
  mockTrendReady = true;
  mockUnits = 'METRIC';
});
afterEach(() => jest.useRealTimers());

async function show(Screen: () => React.ReactNode = PaywallScreen, top = 0) {
  await render(
    <SafeAreaInsetsContext.Provider value={{ top, bottom: 34, left: 0, right: 0 }}>
      <ThemeProvider scheme="light">
        <Screen />
      </ThemeProvider>
    </SafeAreaInsetsContext.Provider>,
  );
  await act(async () => {});
}

/** The screen top to bottom: each text's own words, and a radio's label. */
function wordsInOrder(): string[] {
  const words: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') return void words.push(node);
    if (node === null || typeof node !== 'object') return;
    const { props, children } = node as { props: { accessibilityLabel?: string; accessibilityRole?: string }; children: unknown[] | null };
    if (props.accessibilityRole === 'radio' && props.accessibilityLabel !== undefined) words.push(props.accessibilityLabel);
    (children ?? []).forEach(walk);
  };
  [screen.toJSON()].flat().forEach(walk);
  return words;
}

/** Every background colour drawn on the screen. */
function backgrounds(): string[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (node === null || typeof node !== 'object') return;
    const { props, children } = node as { props: { style?: unknown }; children: unknown[] | null };
    const style = StyleSheet.flatten(props.style as never) as { backgroundColor?: string } | undefined;
    if (style?.backgroundColor !== undefined) found.push(style.backgroundColor);
    (children ?? []).forEach(walk);
  };
  [screen.toJSON()].flat().forEach(walk);
  return found;
}

describe('the page is the paper', () => {
  test('opened as a sheet: no band for the status bar, even where the phone has a top inset', async () => {
    await show(PaywallScreen, 59);
    expect(screen.queryByTestId('status-bar-band')).toBeNull();
  });

  test('the weight cannot be read: the call is still theirs, with no weight line', async () => {
    mockGet.mockImplementationOnce(async () => failed());
    await show();
    expect(screen.getByText(t('lockedCall.title'))).toBeOnTheScreen();
    expect(screen.queryByText(formatWeight(87.4, 'METRIC'))).toBeNull();
  });

  test('the gate fills the screen: the status bar keeps its place, in the paper colour', async () => {
    await show(SubscribeScreen, 59);
    expect(screen.getByTestId('status-bar-band')).toHaveStyle({ height: 59, backgroundColor: palettes.light.background });
  });

  test('no light petrol ground anywhere: it is not in the role table (ADR-094 §1)', async () => {
    await show();
    expect(backgrounds()).not.toContain(palettes.light.accentSoft);
  });

  test('the saving is words in petrol, not a filled badge', async () => {
    await show();
    const saving = screen.getByText(t('subscription.plan.save', { percent: 61 }));
    expect(saving).toHaveStyle({ color: palettes.light.accent });
    expect(StyleSheet.flatten(saving.props.style).backgroundColor).toBeUndefined();
  });
});

describe('the hero', () => {
  test('opened from a locked call, the trend ready: your call is ready, its week, your weight, its change and its line', async () => {
    await show();
    const hero = screen.getByLabelText(t('subscription.ready.label', { date: weekdayDate(WEEK) }));
    expect(within(hero).getByText(t('lockedCall.title'))).toBeOnTheScreen();
    expect(within(hero).getByText(t('subscription.ready.week', { date: weekdayDate(WEEK) }))).toBeOnTheScreen();
    expect(within(hero).getByText(formatWeight(87.4, 'METRIC'))).toBeOnTheScreen();
    expect(within(hero).getByText(t('subscription.ready.change', { change: t('thisWeek.numbers.down', { size: '4.8 kg' }), span: t('thisWeek.numbers.spanWeeks', { weeks: 12 }) }))).toBeOnTheScreen();
    expect(within(hero).getByText(t('subscription.ready.line'))).toBeOnTheScreen();
    expect(screen.queryByText(t('subscription.example.tag'))).toBeNull();
  });

  test('opened from a locked call, no trend yet: the call is ready, with no weight', async () => {
    mockTrendReady = false;
    await show();
    const hero = screen.getByLabelText(t('subscription.ready.label', { date: weekdayDate(WEEK) }));
    expect(within(hero).getByText(t('lockedCall.title'))).toBeOnTheScreen();
    expect(within(hero).queryByText(formatWeight(87.4, 'METRIC'))).toBeNull();
    expect(mockGet).not.toHaveBeenCalledWith('/v1/weight-trend', expect.anything());
  });

  test('opened from anywhere else: an example told in weight, marked as one, with its call; nothing more is read', async () => {
    mockParams = {};
    await show();
    const hero = screen.getByLabelText(t('subscription.example.weight.label'));
    expect(within(hero).getByText(t('subscription.example.tag'))).toBeOnTheScreen();
    expect(within(hero).getByText(t('subscription.example.weight.title'))).toBeOnTheScreen();
    expect(within(hero).getByText(t('subscription.example.weight.step'))).toBeOnTheScreen();
    expect(screen.queryByText(t('lockedCall.title'))).toBeNull();
    expect(mockGet).not.toHaveBeenCalledWith('/v1/weigh-ins/summary');
  });

  test('the example is in the person\'s own units: pounds for imperial', async () => {
    mockParams = {};
    mockUnits = 'IMPERIAL';
    const points = (params.parameters as { key: string; value: unknown }[]).find((p) => p.key === 'paywall_example_weight_kg')?.value as number[];
    await show();
    expect(screen.getByText(formatWeight(points[points.length - 1], 'IMPERIAL'))).toBeOnTheScreen();
    expect(formatWeight(points[points.length - 1], 'IMPERIAL')).toMatch(/lb/);
  });

  test('a week that is not a day (a link\'s word is checked): the example, no error on the way to the plans', async () => {
    mockParams = { week: '2026-13-45x' };
    await show();
    expect(screen.getByLabelText(t('subscription.example.weight.label'))).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /^Yearly/ })).toBeOnTheScreen();
  });

  test('no weight promise: no projection words, no "by" date on the hero', async () => {
    await show();
    const words = wordsInOrder().join(' ');
    expect(words).not.toMatch(/projection|you will (lose|weigh)|by (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  });
});

describe('the order: the call, then what happens when, then the prices', () => {
  test('the hero, the timeline under the screen\'s heading, Yearly, Monthly, the benefits, the terms', async () => {
    await show();
    const words = wordsInOrder();
    const at = (match: string | RegExp) => words.findIndex((w) => (typeof match === 'string' ? w === match : match.test(w)));
    const order = [t('lockedCall.title'), t('subscription.titleLead'), t('subscription.timeline.today'), /^Yearly/, /^Monthly/, t('subscription.values.weeklyCall'), t('subscription.cancelNote')].map(at);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('the timeline\'s title is the screen\'s heading: the trial in petrol after the lead', async () => {
    await show();
    const heading = screen.getByRole('header', { name: t('subscription.titleTrial', { trial: t('subscription.trialSpan.week', { count: '2' }) }) });
    expect(within(heading).getByText(t('subscription.titleFor', { trial: t('subscription.trialSpan.week', { count: '2' }) }))).toHaveStyle({ color: palettes.light.accent });
  });

  test('two benefits with calls: every week after the first, and the coach (ADR-094 Ek 8 #5)', async () => {
    await show();
    expect(t('subscription.values.weeklyCall')).toBe('A call every week after your first one, with the reason');
    expect(screen.getByText(t('subscription.values.weeklyCall'))).toBeOnTheScreen();
    expect(screen.queryByText(t('subscription.values.after'))).toBeNull();
  });

  test('Restore, Terms and Privacy are links in petrol', async () => {
    await show();
    for (const key of ['subscription.restore', 'subscription.terms', 'subscription.privacy']) {
      expect(screen.getByText(t(key))).toHaveStyle({ color: palettes.light.accent });
    }
  });
});
