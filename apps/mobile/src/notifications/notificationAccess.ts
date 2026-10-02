import type { NotificationAccess } from './reminders';

/** Where notifications cannot be scheduled (tests, a build without the module): never allowed, nothing to clear. */
export const notificationsUnavailable: NotificationAccess = {
  permission: async () => ({ granted: false, canAskAgain: false }),
  request: async () => ({ granted: false, canAskAgain: false }),
  replace: async () => undefined,
  clear: async () => undefined,
};
