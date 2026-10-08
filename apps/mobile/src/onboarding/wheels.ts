/**
 * The about-you wheels (#ob-about, ADR-072 #2): height, weight and birth year are picked from rows, never typed. Every
 * row is a value the profile and the server keep (the same bounds the typed fields had), in the user's units; the draft
 * keeps them as the text it always kept, so the profile is made as before (draft.ts). Pure: the screen and the tests
 * share it.
 */
import { type UnitSystem, INCHES_PER_FOOT, parseNumber, roundTo, weightInput } from '@/units/units';

import { type Draft, heightCm, startingWeightKg } from './draft';
import { onboardingParams as P } from './params';

type Height = Draft['height'];

/** From `from` to `to`, `step` apart; the sums rounded so half steps stay exact. */
function rows(from: number, to: number, step: number): number[] {
  return Array.from({ length: Math.floor(roundTo((to - from) / step, 6)) + 1 }, (_, i) => roundTo(from + i * step, 2));
}

/** The wheel's row as the draft's height fields: centimetres, or feet and inches from a count of inches. */
export function heightFromWheel(value: number, system: UnitSystem, height: Height): Height {
  if (system === 'METRIC') return { ...height, cm: String(value) };
  return { ...height, feet: String(Math.floor(value / INCHES_PER_FOOT)), inches: String(value % INCHES_PER_FOOT) };
}

/**
 * Metric: every whole centimetre the profile accepts. Imperial: every whole inch whose height it accepts (a count of
 * inches is never more than the centimetres it measures, so the profile's top in centimetres bounds the search).
 */
export function heightValues(system: UnitSystem): number[] {
  if (system === 'METRIC') return rows(P.heightMinCm, P.heightMaxCm, 1);
  const none: Height = { cm: '', feet: '', inches: '' };
  return rows(0, P.heightMaxCm, 1).filter((inches) => heightCm(heightFromWheel(inches, 'IMPERIAL', none), 'IMPERIAL') !== null);
}

/** The starting height in both systems' fields: the centimetres, and the whole inches nearest to them. */
function suggestedHeight(): Height {
  const cm = P.wheelStart.height_cm;
  const none: Height = { cm: '', feet: '', inches: '' };
  const distance = (inches: number) => Math.abs((heightCm(heightFromWheel(inches, 'IMPERIAL', none), 'IMPERIAL') ?? 0) - cm);
  const inches = heightValues('IMPERIAL').reduce((best, value) => (distance(value) < distance(best) ? value : best));
  return heightFromWheel(inches, 'IMPERIAL', { cm: String(cm), feet: '', inches: '' });
}

/** Where the wheels start: a height in both systems' fields and a year; never a weight (it would become a weigh-in). */
export function suggestedAnswers(thisYear: number): Pick<Draft, 'height' | 'birthYear'> {
  return { height: suggestedHeight(), birthYear: String(thisYear - P.wheelStart.age_years) };
}

/** The row the draft's height is on; the suggestion while it is none the profile keeps. */
export function heightOnWheel(height: Height, system: UnitSystem): number {
  const answered = heightCm(height, system) === null ? suggestedHeight() : height;
  return system === 'METRIC'
    ? Number(answered.cm)
    : Number(answered.feet) * INCHES_PER_FOOT + Number(answered.inches === '' ? 0 : answered.inches);
}

const pounds = (kg: number) => Number(weightInput(kg, 'IMPERIAL'));

/** Half kilograms or whole pounds, from the wheel's first row to what the server keeps. */
export function weightValues(system: UnitSystem): number[] {
  const { min_kg: min, step_kg: kg, step_lb: lb } = P.weightWheel;
  return system === 'METRIC' ? rows(min, P.weighInMaxKg, kg) : rows(Math.ceil(pounds(min)), Math.floor(pounds(P.weighInMaxKg)), lb);
}

/** The row the draft's weight is on, in the user's units; the starting row while none is set. */
export function weightOnWheel(weight: string, system: UnitSystem): number {
  const typed = parseNumber(weight);
  if (typed !== null && startingWeightKg(weight, system) !== null) return typed;
  return system === 'METRIC' ? P.wheelStart.weight_kg : Math.round(pounds(P.wheelStart.weight_kg));
}

/** Every year the profile accepts, up to the youngest an adult can be born in this year (ADR-027 #13). */
export function yearValues(thisYear: number): number[] {
  return rows(P.birthYearMin, thisYear - P.adultMinYearGap, 1);
}
