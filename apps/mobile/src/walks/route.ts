/**
 * The walk between two places (K-1227, ADR-093): Apple Maps' walking route, asked once when the two are picked; the straight line
 * times a detour factor when Apple has none (offline, no data), and then it says so. The module is injected so tests (and Expo Go,
 * where the module is not there) go the same way. Nothing here reads where the phone is.
 */
import type { FoundPlace, Places as PlacesModule } from '../../modules/places';

import { walkParams as W } from './params';

export type Point = { lat: number; lng: number };
export type Leg = { km: number; approximate: boolean };

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** The crow's flight in km (haversine). */
export function straightKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The walk's km: Apple's route, or (approximate) the straight line x the detour factor when Apple gives none or fails. */
export async function walkBetween(module: Pick<PlacesModule, 'walkingDistance'> | null, from: Point, to: Point): Promise<Leg> {
  if (module !== null) {
    try {
      const metres = await module.walkingDistance(from.lat, from.lng, to.lat, to.lng);
      if (metres !== null && Number.isFinite(metres) && metres > 0) return { km: metres / 1000, approximate: false };
    } catch {
      // Offline or refused: the straight line below, said to be approximate.
    }
  }
  return { km: straightKm(from, to) * W.detourFactor, approximate: true };
}

/** Matches for typed text; nothing is sent under the minimum length, and a failed search is no matches (the screen says so). */
export async function findPlaces(module: Pick<PlacesModule, 'search'> | null, text: string): Promise<FoundPlace[] | null> {
  const query = text.trim();
  if (module === null || Array.from(query).length < W.searchMinChars) return [];
  try {
    return await module.search(query);
  } catch {
    return null;
  }
}
