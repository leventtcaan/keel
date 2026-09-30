/**
 * The server address comes from configuration, never from code (K2). Expo inlines EXPO_PUBLIC_* variables at build
 * time from the environment or apps/mobile/.env (git-ignored); the static `process.env.EXPO_PUBLIC_API_URL` read is
 * what Expo replaces, so it must stay spelled out.
 */
export function apiBaseUrl(value: string | undefined = process.env.EXPO_PUBLIC_API_URL): string {
  if (value === undefined || value.trim() === '') {
    throw new Error('EXPO_PUBLIC_API_URL is not set: put the server address in apps/mobile/.env (see CLAUDE.md).');
  }
  return value.trim().replace(/\/+$/, '');
}
