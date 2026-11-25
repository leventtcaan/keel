/**
 * The walk between two places (K-1227, ADR-093): Apple Maps' walking route, asked once when the two are picked; the straight line
 * times a detour factor when Apple has none (offline, no data), and then it says so. The module is injected so tests (and Expo Go,
 * where the module is not there) go the same way. Nothing here reads where the phone is.
 */
import type { FoundPlace, Places as PlacesModule } from '../../modules/places';

import { walkParams as W } from './params';

export type Point = { lat: number; lng: number };
/** The walk's km, whether it is the fallback's estimate, and the line to draw: Apple's streets, or the two ends when there is none. */
export type Leg = { km: number; approximate: boolean; path: Point[] };

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** The crow's flight in km (haversine). */
export function straightKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const isPoint = (pair: unknown): pair is [number, number] =>
  Array.isArray(pair) && pair.length === 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]) && Math.abs(pair[0]) <= 90 && Math.abs(pair[1]) <= 180;

/** At most `max` points of a line, evenly spaced along it, both ends kept and the order kept. */
export function thinPath(points: Point[], max: number): Point[] {
  if (points.length <= max) return points;
  return Array.from({ length: max }, (_, i) => points[Math.round((i * (points.length - 1)) / (max - 1))]);
}

/** Apple's line as points, or the two ends when it sent none or a point in it is not a place on Earth. */
function lineOf(points: unknown, from: Point, to: Point): Point[] {
  if (!Array.isArray(points) || points.length < 2 || !points.every(isPoint)) return [from, to];
  return thinPath(points.map(([lat, lng]) => ({ lat, lng })), W.routePointsMax);
}

/** The walk: Apple's route and its line, or (approximate, drawn straight) the straight line x the detour factor when Apple gives none or fails. */
export async function walkBetween(module: Pick<PlacesModule, 'walkingRoute'> | null, from: Point, to: Point): Promise<Leg> {
  if (module !== null) {
    try {
      const route = await module.walkingRoute(from.lat, from.lng, to.lat, to.lng);
      const metres = route?.metres;
      if (route != null && typeof metres === 'number' && Number.isFinite(metres) && metres > 0) {
        return { km: metres / 1000, approximate: false, path: lineOf(route.points, from, to) };
      }
    } catch {
      // Offline or refused: the straight line below, said to be approximate.
    }
  }
  return { km: straightKm(from, to) * W.detourFactor, approximate: true, path: [from, to] };
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
