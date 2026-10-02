/**
 * The phone's notifications (K-410, ADR-036): expo-notifications behind NotificationAccess. Local notifications only —
 * no push token is asked for, nothing reaches a server — so they work in Expo Go on iOS as in a device build
 * (docs.expo.dev v57: only remote push is missing from Expo Go, and that on Android).
 */
import * as Notifications from 'expo-notifications';

import type { Reminder } from './plan';
import type { AlertAccess } from '@/train/restAlert';

import type { NotificationAccess, NotificationPermission } from './reminders';

/** The reminders' own identifiers: clearing them leaves every other notification (the rest timer's, K-411) alone. */
const PREFIX = 'reminder:';

async function clearReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const { identifier } of scheduled) {
    if (identifier.startsWith(PREFIX)) await Notifications.cancelScheduledNotificationAsync(identifier);
  }
}

const answer = ({ granted, canAskAgain }: NotificationPermission): NotificationPermission => ({ granted, canAskAgain });

// The installed 57.x types (Notifications.types.d.ts): WEEKLY counts weekday 1 = Sunday, as the plan does; DATE fires once.
function triggerOf(when: Reminder['when']): Notifications.NotificationTriggerInput {
  return 'at' in when
    ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when.at }
    : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: when.weekday, hour: when.hour, minute: when.minute };
}

export function deviceNotifications(): NotificationAccess {
  return {
    permission: async () => answer(await Notifications.getPermissionsAsync()),
    // Alerts and sound; no badge — a red count on the icon is a nagging number (U7).
    request: async () => answer(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })),
    replace: async (reminders) => {
      // The reminders first, then the plan: a slot that left it (a training day dropped) leaves the phone too.
      await clearReminders();
      for (const reminder of reminders) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${PREFIX}${reminder.id}`,
          content: { title: reminder.title, body: reminder.body },
          trigger: triggerOf(reminder.when),
        });
      }
    },
    clear: clearReminders,
  };
}

/** One notification at a moment under the caller's id — the rest timer's (K-411); not a reminder, so never cleared with them. */
export function deviceAlerts(): AlertAccess {
  return {
    permission: async () => answer(await Notifications.getPermissionsAsync()),
    alertAt: async (id, at, title, body) => {
      await Notifications.scheduleNotificationAsync({ identifier: id, content: { title, body }, trigger: triggerOf({ at }) });
    },
    cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  };
}
