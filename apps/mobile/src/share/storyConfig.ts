/**
 * The Facebook App ID Instagram Stories need (K-976, ADR-076 #5, ADR-071 #2) comes from configuration, never from code (K2).
 * Expo inlines EXPO_PUBLIC_* variables at build time from the environment or apps/mobile/.env (git-ignored); the static
 * `process.env.EXPO_PUBLIC_FACEBOOK_APP_ID` read is what Expo replaces, so it must stay spelled out. The ID is not a
 * secret (it ships in the app), but its value is not kept in the repository either. Unset, Stories are simply unavailable.
 */
export function facebookAppId(): string | undefined {
  return parseAppId(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID);
}

/**
 * Pure part, tested without touching the real environment. A Facebook App ID is digits only: anything else (a typo, a
 * placeholder, a secret pasted by mistake) is no App ID, and Stories stay off rather than send it to Instagram.
 */
export function parseAppId(value: string | undefined): string | undefined {
  const id = value?.trim();
  return id !== undefined && /^\d+$/.test(id) ? id : undefined;
}
