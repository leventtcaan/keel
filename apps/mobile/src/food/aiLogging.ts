/**
 * Logging a meal by photo or sentence needs the AI, which is off in production (ADR-080 #4) and so is its screen: the meal photo is
 * one of the retired screens (navigation/tabs RETIRED, K-909). It is available when that screen is back on the surface, so there is
 * one place to switch it on, and the upgrade moment of the meal log (ADR-091 #1, K-1202) cannot offer a way that leads nowhere.
 */
import type { ApiClient } from '@/api/client';
import { RETIRED } from '@/navigation/tabs';
import { subscriptionParams } from '@/subscription/params';
import { load } from '@/today/today';

export function aiLoggingAvailable(retired: readonly string[] = RETIRED): boolean {
  return !retired.includes('meal-photo');
}

/** The coach is as available as its screen is on the surface (back since ADR-092; retired before, K-909): the paywall names it only then, never as a promise. */
export function coachAvailable(retired: readonly string[] = RETIRED): boolean {
  return !retired.includes('coach');
}

/**
 * Whether the server's coach model is on (K-1268): its AI offer (GET /v1/consents/ai-offer), 404 while it has no provider
 * (production until the coach is switched on, ADR-064 #5, ADR-092 #4). Unread is off: what is sold is never guessed (Apple 3.1.2).
 */
export async function readCoachOffered(api: ApiClient): Promise<boolean> {
  const offer = await load(() => api.GET('/v1/consents/ai-offer'));
  return offer.state === 'ready';
}

/** The coach is sold (the paywall's line, the subscribed line) only with its screen on the surface and the server's model on (K-1268). */
export function coachSold(offered: boolean, retired: readonly string[] = RETIRED): boolean {
  return offered && coachAvailable(retired);
}

/** From the Nth meal typed by hand in a day (a parameter), while the AI is on. */
export function photoSuggested({ meals, available }: { meals: number; available: boolean }): boolean {
  return available && meals >= subscriptionParams.photoSuggestionAfterManualMeals;
}
