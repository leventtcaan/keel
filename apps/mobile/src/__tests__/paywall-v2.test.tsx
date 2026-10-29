/**
 * The paywall, version 2 (K-1033, prototype `prototip/paywall-v2.html`, ADR-072 Ek 3): the app's own call card as the hero
 * (an example, said so), the "Save X%" badge from the store's numbers, the trial only where the store offers it, one sticky
 * bottom with the button, the price in a line and Restore / Terms / Privacy, and the account behind a button (App Review
 * 5.1.1(v): reachable without paying) — on the gate that cannot be closed.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import SubscribeScreen from '@/app/subscribe';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { PlanPreview } from '@/subscription/planPreview';
import type { Plan, SubscriptionStore } from '@/subscription/store';
import { ThemeProvider } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';

// The button names the trial's length, as the store gives it (paywall v2, ADR-072 Ek 3).
const START = 'Start 2-week free trial';

type Subscription = components['schemas']['Subscription'];
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const NONE: Subscription = { active: false, appUserId: ID };
const ANNUAL: Plan = { id: '$rc_annual', period: 'annual', price: '$59.99', amount: 59.99, currency: 'USD', pricePerMonth: '$5.00', trial: { count: 2, unit: 'week' } };
const MONTHLY: Plan = { id: '$rc_monthly', period: 'monthly', price: '$12.99', amount: 12.99, currency: 'USD', pricePerMonth: null, trial: null };
const PREVIEW: PlanPreview = { own: false, days: 3, firstWorkout: 'MONDAY', firstCall: '2026-10-19', checkInDay: 'MONDAY', hasCardio: true };

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
const mockServices = {
  api: { GET: jest.fn(async () => ok(NONE)) },
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
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useSubscriptionGate: () => 'required' }));
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
const press = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name })));

describe('the hero: the app\'s own call card, an example', () => {
  test('with calls (the health data consent given, or not known): the weekly call, marked EXAMPLE', async () => {
    mockPreview = PREVIEW;
    await show();
    const card = screen.getByLabelText(t('subscription.example.call.label'));
    expect(within(card).getByText(t('subscription.example.tag'))).toBeOnTheScreen();
    expect(within(card).getByText(t('subscription.example.call.title'))).toBeOnTheScreen();
    expect(screen.queryByLabelText(t('subscription.example.set.label'))).toBeNull();
    await screen.unmount();
    mockPreview = null;
    await show();
    expect(screen.getByLabelText(t('subscription.example.call.label'))).toBeOnTheScreen();
  });

  test('without the health data consent there are no calls: the set card instead, also marked EXAMPLE', async () => {
    mockPreview = { ...PREVIEW, firstCall: null };
    await show();
    const card = screen.getByLabelText(t('subscription.example.set.label'));
    expect(within(card).getByText(t('subscription.example.tag'))).toBeOnTheScreen();
    expect(within(card).getByText(t('subscription.example.set.title'))).toBeOnTheScreen();
    expect(screen.queryByLabelText(t('subscription.example.call.label'))).toBeNull();
  });
});

describe('"Save X%" on the yearly plan', () => {
  const yearly = () => screen.getByRole('radio', { name: /^Yearly/ });

  test('from the store\'s numbers: 61% (61.5 rounded down) for 59.99 a year against 12.99 a month', async () => {
    await show();
    expect(within(yearly()).getByText('Save 61%')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /^Monthly/ })).not.toHaveTextContent(/Save/);
  });

  test.each([
    ['too small to say', [{ ...ANNUAL, amount: 150 }, MONTHLY]],
    ['two currencies', [ANNUAL, { ...MONTHLY, currency: 'EUR' }]],
    ['no monthly plan to compare with', [ANNUAL]],
  ])('hidden when the saving is %s', async (_, plans) => {
    mockPlans = plans as Plan[];
    await show();
    expect(screen.queryByText(/^Save \d+%$/)).toBeNull();
  });
});

describe('the trial, only where the store offers it', () => {
  test('offered: the headline, the day nothing is charged until, and a button that starts it', async () => {
    await show();
    expect(screen.getByLabelText('Try it free for 2 weeks')).toBeOnTheScreen();
    // Under the headline, and again on the timeline as the day it charges.
    expect(screen.getAllByText('Tue, Oct 27')).toHaveLength(2);
    expect(screen.getByText('No charge today.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: START })).toBeOnTheScreen();
  });

  test('not eligible (none set up, or had it already): no word of a trial, the plain headline and the price in the line', async () => {
    mockPlans = [{ ...ANNUAL, trial: null }, MONTHLY];
    await show();
    expect(screen.queryByText(/free/i)).toBeNull();
    expect(screen.queryByText('No charge today.')).toBeNull();
    expect(screen.queryByText(t('subscription.sub.lead'))).toBeNull();
    expect(screen.getByRole('header', { name: t('subscription.title') })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('subscription.subscribe') })).toBeOnTheScreen();
    expect(screen.getAllByText('$59.99 a year, renewing every year until you cancel.').length).toBeGreaterThan(0);
  });
});

describe('the bottom that stays', () => {
  test('the button, the price in a line, Restore, Terms and Privacy; the full terms are in the scroll above', async () => {
    await show();
    for (const name of [START, t('subscription.restore'), t('subscription.terms'), t('subscription.privacy')]) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
    expect(screen.getByLabelText('No charge today. Then $59.99 a year, renewing every year until you cancel.')).toBeOnTheScreen();
    expect(screen.getByText('When the trial ends: $59.99 a year, renewing every year until you cancel.')).toBeOnTheScreen();
    expect(screen.getByText(t('subscription.cancelNote'))).toBeOnTheScreen();
  });

  test('the billed amount is as prominent as the trial claim: bold, in the text colour, not the muted one (Apple 3.1.2)', async () => {
    await show();
    const line = within(screen.getByLabelText('No charge today. Then $59.99 a year, renewing every year until you cancel.'));
    const bold = { fontWeight: tokens.weight.bold, color: palettes.light.text };
    expect(line.getByText('No charge today.')).toHaveStyle(bold);
    expect(line.getByText('$59.99 a year')).toHaveStyle(bold);
  });

  test('the plan chosen changes the line, the full terms and the plan the button buys', async () => {
    await show();
    await act(async () => fireEvent.press(screen.getByRole('radio', { name: /^Monthly/ })));
    // The renewal in the line at the bottom and in the full terms above.
    expect(screen.getByLabelText('$12.99 a month, renewing every month until you cancel.')).toBeOnTheScreen();
    expect(screen.getAllByText('$12.99 a month, renewing every month until you cancel.')).toHaveLength(2);
    await press(t('subscription.subscribe'));
    expect(mockStore.buy).toHaveBeenCalledWith('$rc_monthly');
  });
});

describe('the status bar (ADR-087 #2, K-6)', () => {
  test('a band of the top inset sits above the scrolling page, so scrolled content never passes under the clock', async () => {
    await render(
      <SafeAreaInsetsContext.Provider value={{ top: 59, bottom: 34, left: 0, right: 0 }}>
        <ThemeProvider scheme="light">
          <SubscribeScreen />
        </ThemeProvider>
      </SafeAreaInsetsContext.Provider>,
    );
    await act(async () => {});
    const band = screen.getByTestId('status-bar-band');
    expect(band).toHaveStyle({ height: 59, backgroundColor: palettes.light.accentSoft });
    // Not inside the scroll: it stays put while the page moves.
    expect(within(screen.getByTestId('paywall-scroll')).queryByTestId('status-bar-band')).toBeNull();
    // Above the page in the column, not laid over it.
    const column = screen.getByTestId('paywall').children.map((child) => (typeof child === 'string' ? '' : child.props.testID));
    expect(column.indexOf('status-bar-band')).toBeLessThan(column.indexOf('paywall-scroll'));
    expect(column.indexOf('status-bar-band')).toBe(0);
  });

  test('no inset known (no safe area): no band, nothing to clear', async () => {
    await show();
    expect(screen.getByTestId('status-bar-band')).toHaveStyle({ height: 0 });
  });
});

describe('the gate and its account', () => {
  test('no way to close the plans', async () => {
    await show();
    expect(screen.queryByRole('button', { name: t('subscription.close') })).toBeNull();
  });

  test('the account is one button; its sheet has export, delete and sign out (App Review 5.1.1(v)), and is left with Done', async () => {
    await show();
    expect(screen.queryByRole('button', { name: t('settings.delete.title') })).toBeNull();
    await press(t('subscription.account'));
    for (const name of [t('settings.export.title'), t('settings.delete.title'), t('settings.signOut.title')]) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
    await press(t('subscription.accountDone'));
    expect(screen.queryByRole('button', { name: t('settings.delete.title') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('subscription.close') })).toBeNull();
  });

  test('the account is there when the plans are not (no connection): deleting never waits for the store', async () => {
    mockStore.available = false;
    await show();
    expect(screen.getByText(t('subscription.unavailable'))).toBeOnTheScreen();
    await press(t('subscription.account'));
    expect(screen.getByRole('button', { name: t('settings.delete.title') })).toBeOnTheScreen();
  });

  test('the brand: the app icon\'s mark and the app\'s name, the mark drawn not read out', async () => {
    await show();
    expect(screen.getByText(t('app.name'))).toBeOnTheScreen();
    expect(screen.getByTestId('brand-mark')).toHaveProp('accessible', false);
  });
});

test('dark: the same screen, drawn', async () => {
  await show('dark');
  expect(screen.getByRole('button', { name: START })).toBeOnTheScreen();
});
