/**
 * The trial reminder's offer (K-707, ADR-058 › 105): during a trial, "Remind me before it ends"; once set, the day it comes; iOS
 * saying no is said plainly. Not a trial: nothing. Read from the server when no subscription is given (the paywall's
 * "you're subscribed" step).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { createTrialReminder } from '@/subscription/trialReminder';
import { TrialReminderOffer } from '@/subscription/TrialReminderOffer';
import { ThemeProvider } from '@/theme/theme';

import { memoryKv } from './support/profileServer';

type Subscription = components['schemas']['Subscription'];
const ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
// Noon UTC: the same calendar day on the phone in every time zone a test runs in; the reminder two days before.
const TRIAL: Subscription = { active: true, appUserId: ID, status: 'TRIAL', accessUntil: '2099-10-11T12:00:00Z' };

let mockGranted = true;
const mockSet: string[] = [];
const mockReport = jest.fn();
let mockKv = memoryKv();
const mockAlerts = {
  permission: async () => ({ granted: mockGranted, canAskAgain: false }),
  alertAt: async (id: string) => void mockSet.push(id),
  cancel: async () => {},
};
const mockGET = jest.fn(async () => ({ data: TRIAL, response: new Response(null, { status: 200 }) }));
const mockServices = {
  api: { GET: mockGET },
  report: (problem: { name: string }) => mockReport(problem.name),
  get trialReminder() {
    return mockReminder;
  },
};
let mockReminder = createTrialReminder({ kv: mockKv, alerts: mockAlerts, ask: async () => ({ granted: mockGranted, canAskAgain: false }), now: () => new Date() });
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeEach(() => {
  jest.clearAllMocks();
  mockGranted = true;
  mockSet.length = 0;
  mockKv = memoryKv();
  mockReminder = createTrialReminder({ kv: mockKv, alerts: mockAlerts, ask: async () => ({ granted: mockGranted, canAskAgain: false }), now: () => new Date() });
});

async function show(subscription?: Subscription) {
  await render(
    <ThemeProvider scheme="light">
      <TrialReminderOffer subscription={subscription} />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name })));

test('during a trial: asked for, set, and the day it comes is said', async () => {
  await show(TRIAL);
  await press(t('subscription.reminder.ask'));
  expect(mockSet).toEqual(['trial']);
  expect(screen.getByText(t('subscription.reminder.set', { date: 'Oct 9, 2099' }))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('subscription.reminder.ask') })).toBeNull();
});

test('set before: the day it comes, and no button', async () => {
  await mockReminder.remind(TRIAL);
  await show(TRIAL);
  expect(screen.getByText(t('subscription.reminder.set', { date: 'Oct 9, 2099' }))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('subscription.reminder.ask') })).toBeNull();
});

test('iOS says no: said plainly, nothing set', async () => {
  mockGranted = false;
  await show(TRIAL);
  await press(t('subscription.reminder.ask'));
  expect(screen.getByText(t('subscription.reminder.refused'))).toBeOnTheScreen();
  expect(mockSet).toEqual([]);
});

test.each(['ACTIVE', 'CANCELLED'] as const)('%s: no offer', async (status) => {
  await show({ ...TRIAL, status });
  expect(screen.queryByRole('button', { name: t('subscription.reminder.ask') })).toBeNull();
});

test('no subscription given (the paywall after a purchase): read from the server', async () => {
  await show();
  expect(mockGET).toHaveBeenCalledWith('/v1/subscription');
  expect(screen.getByRole('button', { name: t('subscription.reminder.ask') })).toBeOnTheScreen();
});

test('a reminder that cannot be set says so and is reported by name', async () => {
  mockReminder = { ...mockReminder, remind: async () => Promise.reject(Object.assign(new Error('x'), { name: 'NotificationsFailed' })) };
  await show(TRIAL);
  await press(t('subscription.reminder.ask'));
  expect(screen.getByText(t('subscription.reminder.failed'))).toBeOnTheScreen();
  expect(mockReport).toHaveBeenCalledWith('NotificationsFailed');
});
