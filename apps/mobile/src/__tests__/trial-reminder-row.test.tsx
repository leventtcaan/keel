/**
 * The free trial's reminder as a row of Settings › Reminders (K-1062): it was under Subscription, so the reminders were in two
 * places. During a trial, "Remind me before it ends"; once set, the row says the day it comes; iOS saying no is said under it.
 * Not a trial: no row. The state and the tap are the paywall offer's own (trial-reminder-offer.test.tsx).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { TrialReminderRow } from '@/settings/TrialReminderRow';
import { createTrialReminder } from '@/subscription/trialReminder';
import { dayWords } from '@/subscription/words';
import { ThemeProvider } from '@/theme/theme';

import { memoryKv } from './support/profileServer';

type Subscription = components['schemas']['Subscription'];
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const TRIAL: Subscription = { active: true, appUserId: ID, status: 'TRIAL', accessUntil: '2099-10-11T12:00:00Z' };
const ACTIVE: Subscription = { active: true, appUserId: ID, status: 'ACTIVE', accessUntil: '2099-10-11T12:00:00Z' };

let mockGranted = true;
let mockSubscription: Subscription = TRIAL;
const mockServices = {
  api: { GET: jest.fn(async () => ({ data: mockSubscription, response: new Response(null, { status: 200 }) })) },
  report: jest.fn(),
  get trialReminder() {
    return mockReminder;
  },
};
let mockReminder = make();
function make() {
  return createTrialReminder({
    kv: memoryKv(),
    alerts: { permission: async () => ({ granted: mockGranted, canAskAgain: false }), alertAt: async () => {}, cancel: async () => {} },
    ask: async () => ({ granted: mockGranted, canAskAgain: false }),
    now: () => new Date(),
  });
}
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeEach(() => {
  jest.clearAllMocks();
  mockGranted = true;
  mockSubscription = TRIAL;
  mockReminder = make();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <TrialReminderRow />
    </ThemeProvider>,
  );
  await act(async () => {});
}

test('during a trial: the row asks, then says the day the reminder comes', async () => {
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('subscription.reminder.ask') })));

  expect(screen.queryByRole('button', { name: t('subscription.reminder.ask') })).toBeNull();
  expect(screen.getByText(t('settings.reminders.trial'))).toBeOnTheScreen();
  expect(screen.getByText(dayWords(new Date('2099-10-09T12:00:00Z')))).toBeOnTheScreen();
});

test('iOS saying no is said under the row', async () => {
  mockGranted = false;
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: new RegExp(t('subscription.reminder.ask')) })));

  expect(screen.getByText(t('subscription.reminder.refused'))).toBeOnTheScreen();
});

test('not a trial: no row at all', async () => {
  mockSubscription = ACTIVE;
  await show();

  expect(screen.queryByText(t('subscription.reminder.ask'))).toBeNull();
  expect(screen.queryByText(t('settings.reminders.trial'))).toBeNull();
});
