import type { NotificationAccess } from '@/notifications/reminders';

type Options = { access: NotificationAccess; report: (problem: { name: string }) => void };

export function createRestAlert(_options: Options) {
  return { start: async (_since: number) => undefined, stop: async () => undefined };
}
