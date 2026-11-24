/** A route's one-way distance in the user's unit (K-1216): typed in km or mi, kept in km, shown back in the unit it was typed in. */
import { type UnitSystem, parseNumber, roundTo } from '@/units/units';
import { t } from '@/copy';

import { walkParams as W } from './params';

/** Exact by definition (the international mile), not tunable, as units.ts's pound and inch. */
export const KM_PER_MI = 1.609344;
/** The finest distance kept: 3 decimals of a km is a metre, so a mile typed comes back as a mile. */
const KEPT_DECIMALS = 3;
/** Less than this is a typo, not a walk. */
const MIN_KM = 0.1;

/** The km a typed distance is, or null when it is not a number between 0.1 km and the limit. */
export function kmFromInput(text: string, system: UnitSystem): number | null {
  const typed = parseNumber(text);
  if (typed === null) return null;
  const km = roundTo(system === 'METRIC' ? typed : typed * KM_PER_MI, KEPT_DECIMALS);
  return km >= MIN_KM && km <= W.routeMaxKm ? km : null;
}

/** The number alone, as an input field shows it. */
export function distanceInput(km: number, system: UnitSystem): string {
  return String(roundTo(system === 'METRIC' ? km : km / KM_PER_MI, W.distanceDecimals));
}

export function formatDistance(km: number, system: UnitSystem): string {
  return t(system === 'METRIC' ? 'walks.km' : 'walks.mi', { value: distanceInput(km, system) });
}
