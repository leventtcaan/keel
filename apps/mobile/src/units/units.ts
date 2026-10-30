/**
 * Units (K-310, ADR-029). The server and the engine are metric; the phone shows and takes the user's units. A value
 * typed in lb or in is converted and rounded once, to what the server keeps (kg: 2 decimals, waist cm: 1, height: whole
 * cm) — nowhere else — so a value typed in lb is shown back in lb exactly as typed.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

import params from '../../../../data/parameters/units.json';

export type UnitSystem = components['schemas']['Profile']['units'];

// Exact by definition (the 1959 international yard and pound agreement), not tunable: ADR-029 §2.
const KG_PER_LB = 0.45359237;
/** lb plates come in quarters of a pound at the finest (ADR-032): four steps a pound. */
const LB_PLATE_STEPS = 4;
export const CM_PER_IN = 2.54;
export const INCHES_PER_FOOT = 12;

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`units.json has no ${key}`);
  return found.value as T;
}

const P = {
  weightDecimals: param<number>('weight_display_decimals'),
  loadDecimals: param<number>('load_display_decimals'),
  waistDecimals: param<number>('waist_display_decimals'),
  storedKgDecimals: param<number>('stored_kg_decimals'),
  storedWaistDecimals: param<number>('stored_waist_cm_decimals'),
  imperialRegions: param<string[]>('imperial_regions'),
  loadStepLb: param<number>('load_display_step_lb'),
  loadSmallBelowLb: param<number>('load_display_small_below_lb'),
  loadSmallStepLb: param<number>('load_display_small_step_lb'),
  loadKgGrid: param<number>('load_display_kg_grid'),
};

/** The most decimals a typed load keeps (the stored kilo's, stored_kg_decimals): 11.34 kg is a 25 lb dumbbell. */
export const loadInputDecimals = P.storedKgDecimals;

/**
 * Half away from zero at `decimals`. The nudge by one part in 2^52 undoes binary representation: 1.005 is stored as
 * 1.00499999…, and plain Math.round(100.4999…) would give 1.00.
 */
/** The kilograms the server keeps (K-402: Apple Health's weights are rounded to it before they are sent). */
export const storedKgDecimals = P.storedKgDecimals;
/** One step of a body weight, as a scale shows it (K-980): the last decimal of `weight_display_decimals`, in kg and lb alike. */
export const weightDecimals = P.weightDecimals;
export const weightStep = 10 ** -P.weightDecimals;

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return (Math.sign(value) * Math.round(Math.abs(value) * factor * (1 + Number.EPSILON))) / factor;
}

/**
 * A plain decimal number as a person types it: digits with at most one separator, a point or a comma (the iOS number
 * pad types "," where the region writes decimals that way). No thousands separators, signs or exponents.
 */
export function parseNumber(text: string): number | null {
  const typed = text.trim();
  return /^(\d+([.,]\d+)?|[.,]\d+)$/.test(typed) ? Number(typed.replace(',', '.')) : null;
}

const fixed = (value: number, decimals: number) => roundTo(value, decimals).toFixed(decimals);
/** A trailing ".0" dropped: 100, 102.5. */
const trimmed = (value: number, decimals: number) => String(roundTo(value, decimals));

// ── body weight ──────────────────────────────────────────────────────────────────────────────────────────────
/** The number alone, as an input field shows it. */
export function weightInput(kg: number, system: UnitSystem): string {
  return fixed(system === 'METRIC' ? kg : kg / KG_PER_LB, P.weightDecimals);
}

/** One step of the shown weight, in kg: what the last shown decimal moves (a tenth of a kilo, a tenth of a pound). */
export function weightStepKg(system: UnitSystem): number {
  const step = 10 ** -P.weightDecimals;
  return system === 'METRIC' ? step : step * KG_PER_LB;
}

export function formatWeight(kg: number, system: UnitSystem): string {
  return t(system === 'METRIC' ? 'units.kg' : 'units.lb', { value: weightInput(kg, system) });
}

/**
 * How far one body weight is from another, as the two numbers on the screen differ (not the kilo difference converted: 176.8 lb
 * after 185.4 lb is 8.6 lb): the signed `delta` in the shown unit to the shown decimal, and its size alone as text ("8.6 lb").
 */
export function weightChange(fromKg: number, toKg: number, system: UnitSystem): { delta: number; size: string } {
  const delta = roundTo(Number(weightInput(toKg, system)) - Number(weightInput(fromKg, system)), P.weightDecimals);
  return { delta, size: t(system === 'METRIC' ? 'units.kg' : 'units.lb', { value: Math.abs(delta).toFixed(P.weightDecimals) }) };
}

/** kg as the server keeps it, or null when the text is not a weight (empty, text, zero). */
export function parseWeightKg(text: string, system: UnitSystem): number | null {
  const value = parseNumber(text);
  if (value === null || value <= 0) return null;
  return roundTo(system === 'METRIC' ? value : value * KG_PER_LB, P.storedKgDecimals);
}

// ── loads ────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * A load as a pound reads. What the user typed in pounds on the half pound (to the kilo's stored hundredths) is shown
 * back exactly as typed (ADR-029). A load that came from the kilos (a target the engine made: 180 kg is 396.8 lb to the decimal)
 * is the nearest 5 lb (2.5 under 10 lb), a weight a gym really has (Evre 7, the walk of 30 Oct). Kilos are shown as the server keeps them.
 */
function lbOfLoad(kg: number): number {
  const lb = kg / KG_PER_LB;
  // How far a typed lb load can be from its pound once stored as kg to its decimals, in pounds.
  const typedError = (0.5 * 10 ** -P.storedKgDecimals) / KG_PER_LB;
  // A load on the kilo grid (a multiple of 1.25 kg, what the engine makes for a kilo gym) is a target made in kilos, however near a
  // pound it falls by chance (110 kg is 242.51 lb, 160 kg is 352.74 lb): it reads to the rack. Only what is off that grid can be a
  // load typed in pounds, and that is kept as typed on the half pound (every whole or half lb round-trips, ADR-029).
  const grid = kg / P.loadKgGrid;
  const derived = Math.abs(grid - Math.round(grid)) * P.loadKgGrid <= 0.5 * 10 ** -P.storedKgDecimals;
  const halves = lb * 2;
  if (!derived && Math.abs(halves - Math.round(halves)) / 2 <= typedError) return roundTo(lb, P.loadDecimals);
  const step = lb < P.loadSmallBelowLb ? P.loadSmallStepLb : P.loadStepLb;
  return roundTo(Math.round(lb / step) * step, P.loadDecimals);
}

/** A load's number as formatLoad writes it, in the user's unit: two loads with the same value read as one weight. */
export function loadValue(kg: number, system: UnitSystem): number {
  return system === 'METRIC' ? roundTo(kg, P.loadDecimals) : lbOfLoad(kg);
}

/**
 * A volume (the kilos lifted over a session: a sum, no weight on any bar) as a whole number in the user's unit. It is not stepped to
 * plates as a load is: 1,257 lb lifted is a total, and the nearest 5 would make it look guessed.
 */
export function volumeValue(kg: number, system: UnitSystem): number {
  return Math.round(system === 'METRIC' ? kg : kg / KG_PER_LB);
}

export function formatLoad(kg: number, system: UnitSystem): string {
  const value = system === 'METRIC' ? trimmed(kg, P.loadDecimals) : String(lbOfLoad(kg));
  return t(system === 'METRIC' ? 'units.kg' : 'units.lb', { value });
}

/**
 * A plate as its size, the number alone: kg to the hundredth (1.25), lb on the quarter pound plates are made in — a
 * 1.25 lb plate is stored as 0.57 kg, which is 1.26 lb.
 */
export function formatPlate(kg: number, system: UnitSystem): string {
  return String(system === 'METRIC' ? roundTo(kg, P.storedKgDecimals) : Math.round((kg / KG_PER_LB) * LB_PLATE_STEPS) / LB_PLATE_STEPS);
}

/** Zero is a load: a bodyweight move logs 0 added. */
export function parseLoadKg(text: string, system: UnitSystem): number | null {
  const value = parseNumber(text);
  if (value === null) return null;
  return roundTo(system === 'METRIC' ? value : value * KG_PER_LB, P.storedKgDecimals);
}

// ── waist ────────────────────────────────────────────────────────────────────────────────────────────────────
export function formatWaist(cm: number, system: UnitSystem): string {
  const value = fixed(system === 'METRIC' ? cm : cm / CM_PER_IN, P.waistDecimals);
  return t(system === 'METRIC' ? 'units.cm' : 'units.in', { value });
}

export function parseWaistCm(text: string, system: UnitSystem): number | null {
  const value = parseNumber(text);
  if (value === null || value <= 0) return null;
  return roundTo(system === 'METRIC' ? value : value * CM_PER_IN, P.storedWaistDecimals);
}

// ── height (the profile keeps whole cm) ──────────────────────────────────────────────────────────────────────
export function formatHeight(cm: number, system: UnitSystem): string {
  if (system === 'METRIC') return t('units.cm', { value: String(Math.round(cm)) });
  const total = Math.round(cm / CM_PER_IN);
  return t('units.feetInches', { feet: Math.floor(total / INCHES_PER_FOOT), inches: total % INCHES_PER_FOOT });
}

export function heightCmFromImperial(feet: number, inches: number): number {
  if (!Number.isInteger(feet) || !Number.isInteger(inches) || feet < 0 || inches < 0 || inches >= INCHES_PER_FOOT) {
    throw new Error('a height is whole feet and 0–11 inches');
  }
  return Math.round((feet * INCHES_PER_FOOT + inches) * CM_PER_IN);
}

// ── the default before the user chooses ──────────────────────────────────────────────────────────────────────
/** From a BCP 47 locale ("en-US", "zh-Hans-US"): the region subtag is the two-letter one. */
export function defaultSystem(locale: string): UnitSystem {
  const region = regionOf(locale);
  return region !== undefined && P.imperialRegions.includes(region) ? 'IMPERIAL' : 'METRIC';
}

/** The region of a BCP 47 locale ("en-US" → "US"), or none ("en"). */
export function regionOf(locale: string): string | undefined {
  return locale.split(/[-_]/).find((part, index) => index > 0 && /^[A-Z]{2}$/.test(part));
}
