/**
 * The phone's notifications behind NotificationAccess (K-410): the plan's times become expo-notifications triggers —
 * weekly on the phone's calendar, or once at a moment — and replacing clears the reminders first, so a slot that left
 * the plan (a training day dropped) leaves the phone too. Only the reminders: the rest timer's notification (K-411) stays.
 */
import * as Notifications from 'expo-notifications';

import { deviceNotifications } from '@/notifications/deviceNotifications';
import type { Reminder } from '@/notifications/plan';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly', DATE: 'date' },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
}));
const scheduledIds = (...ids: string[]) => ids.map((identifier) => ({ identifier, content: {}, trigger: null })) as never;
const N = jest.mocked(Notifications);

const at = new Date(2026, 9, 9, 12, 0);
const plan: Reminder[] = [
  { id: 'training-MONDAY', kind: 'training', when: { weekday: 2, hour: 17, minute: 30 }, title: 'T', body: 'B' },
  { id: 'quiet', kind: 'quiet', when: { at }, title: 'Q', body: 'C' },
];

beforeEach(() => jest.clearAllMocks());

test('replacing clears the reminders scheduled before, then schedules each with its own trigger', async () => {
  const order: string[] = [];
  N.getAllScheduledNotificationsAsync.mockResolvedValue(scheduledIds('reminder:training-FRIDAY', 'rest-timer'));
  N.cancelScheduledNotificationAsync.mockImplementation(async (id) => void order.push(`cancel ${id}`));
  N.scheduleNotificationAsync.mockImplementation(async (request) => (order.push(request.identifier ?? ''), 'id'));
  await deviceNotifications().replace(plan);
  expect(order).toEqual(['cancel reminder:training-FRIDAY', 'reminder:training-MONDAY', 'reminder:quiet']);
  expect(N.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  expect(N.scheduleNotificationAsync).toHaveBeenCalledWith({
    identifier: 'reminder:training-MONDAY',
    content: { title: 'T', body: 'B' },
    trigger: { type: 'weekly', weekday: 2, hour: 17, minute: 30 },
  });
  expect(N.scheduleNotificationAsync).toHaveBeenCalledWith({ identifier: 'reminder:quiet', content: { title: 'Q', body: 'C' }, trigger: { type: 'date', date: at } });
});

test("iOS's answer is passed on as allowed or not, and whether its sheet can show again", async () => {
  N.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' } as never);
  expect(await deviceNotifications().permission()).toEqual({ granted: false, canAskAgain: true });
  N.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' } as never);
  expect(await deviceNotifications().request()).toEqual({ granted: true, canAskAgain: true });
  // Alerts and sound; no badge (a red count is a nagging number, U7).
  expect(N.requestPermissionsAsync).toHaveBeenCalledWith({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
});

test("clearing removes the reminders and nothing else (the rest timer's stays, K-411)", async () => {
  N.getAllScheduledNotificationsAsync.mockResolvedValue(scheduledIds('reminder:check-in', 'rest-timer', 'reminder:quiet'));
  await deviceNotifications().clear();
  expect(N.cancelScheduledNotificationAsync.mock.calls).toEqual([['reminder:check-in'], ['reminder:quiet']]);
  expect(N.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
});
