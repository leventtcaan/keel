/**
 * What the steps left are, as a walk (K-1216). Pure and deterministic, and it knows nothing of where the phone is: a route is a
 * distance the user typed. The steps left are the engine's target less Apple Health's count (U1, done by the caller); this only turns
 * steps into a stride, a round trip and minutes. A suggestion is an offer, never a debt (U7).
 */
import { walkParams as W } from './params';

export type WalkRoute = { id: string; name: string; km: number };

export type Suggestion =
  | { kind: 'route'; route: WalkRoute; roundTripSteps: number; minutes: number }
  | { kind: 'minutes'; minutes: number };

/** A height this far out is a typo in the profile, not a person. */
const HEIGHT_RANGE_CM = [100, 250] as const;

/**
 * Steps in a km: from the height (stride = factor x height), else the parameter default. Apple Health's walking distance or step
 * length is not read (not in READ_TYPES; this card adds no type).
 */
export function stepsPerKm(heightCm: number | null | undefined): number {
  if (heightCm == null || !Number.isFinite(heightCm) || heightCm < HEIGHT_RANGE_CM[0] || heightCm > HEIGHT_RANGE_CM[1]) return W.stepsPerKmDefault;
  return Math.round(1000 / (W.strideHeightFactor * (heightCm / 100)));
}

/**
 * The walk for `remaining` steps: the route whose round trip covers them with the least overshoot (and no more than the overshoot
 * limit), else the minutes of walking; nothing when nothing, or too little, is left.
 */
export function suggestWalk({ remaining, routes, stepsPerKm: perKm }: { remaining: number; routes: WalkRoute[]; stepsPerKm: number }): Suggestion | null {
  if (!Number.isFinite(remaining) || remaining < W.minRemainingSteps) return null;
  const minutes = Math.max(1, Math.round(remaining / W.cadence));
  let best: Suggestion | null = null;
  for (const route of routes) {
    const roundTripSteps = Math.round(2 * route.km * perKm);
    if (roundTripSteps < remaining || roundTripSteps > remaining * W.maxOvershoot) continue;
    if (best === null || (best.kind === 'route' && roundTripSteps < best.roundTripSteps)) best = { kind: 'route', route, roundTripSteps, minutes };
  }
  return best ?? { kind: 'minutes', minutes };
}
