/**
 * The about-you wheels (#ob-about, ADR-072 #2): height, weight and year are picked, not typed, so every row a wheel
 * offers must be a value the profile and the server keep, in both unit systems, and the year an adult's (ADR-027 #13).
 */
import { birthYearProblem, heightCm, startingWeightKg } from '@/onboarding/draft';
import { onboardingParams as P } from '@/onboarding/params';
import {
  heightFromWheel,
  heightOnWheel,
  heightValues,
  suggestedAnswers,
  weightOnWheel,
  weightValues,
  yearValues,
} from '@/onboarding/wheels';

const THIS_YEAR = 2026;
const SYSTEMS = ['METRIC', 'IMPERIAL'] as const;
const NO_HEIGHT = { cm: '', feet: '', inches: '' };

describe('height', () => {
  test('metric: every whole centimetre the profile accepts, shortest to tallest', () => {
    const values = heightValues('METRIC');
    expect(values[0]).toBe(P.heightMinCm);
    expect(values[values.length - 1]).toBe(P.heightMaxCm);
    expect(values).toHaveLength(P.heightMaxCm - P.heightMinCm + 1);
  });

  test.each(SYSTEMS)('%s: every row is a height the profile keeps, and reads back as the same row', (system) => {
    expect(heightValues(system).length).toBeGreaterThan(50);
    for (const value of heightValues(system)) {
      const height = heightFromWheel(value, system, NO_HEIGHT);
      expect(heightCm(height, system)).not.toBeNull();
      expect(heightOnWheel(height, system)).toBe(value);
    }
  });

  test('imperial: in inches, the first and last rows as close to the profile\'s bounds as whole inches get', () => {
    const values = heightValues('IMPERIAL');
    expect(heightCm(heightFromWheel(values[0], 'IMPERIAL', NO_HEIGHT), 'IMPERIAL')).not.toBeNull();
    const below = heightFromWheel(values[0] - 1, 'IMPERIAL', NO_HEIGHT);
    const above = heightFromWheel(values[values.length - 1] + 1, 'IMPERIAL', NO_HEIGHT);
    expect(heightCm(below, 'IMPERIAL')).toBeNull();
    expect(heightCm(above, 'IMPERIAL')).toBeNull();
  });

  test('a height not answered yet shows on the suggestion', () => {
    expect(heightValues('METRIC')).toContain(heightOnWheel(NO_HEIGHT, 'METRIC'));
    expect(heightOnWheel(NO_HEIGHT, 'METRIC')).toBe(heightOnWheel(suggestedAnswers(THIS_YEAR).height, 'METRIC'));
  });
});

describe('weight', () => {
  test.each(SYSTEMS)('%s: every row is a weight the server keeps', (system) => {
    const values = weightValues(system);
    expect(values.length).toBeGreaterThan(100);
    for (const value of values) expect(startingWeightKg(String(value), system)).not.toBeNull();
  });

  test('metric: half kilograms, up to what the server keeps', () => {
    const values = weightValues('METRIC');
    expect(values[1] - values[0]).toBe(0.5);
    expect(values[values.length - 1]).toBe(P.weighInMaxKg);
  });

  test('not set, the wheel shows its starting row in the user\'s units; set, the value typed in', () => {
    expect(weightValues('METRIC')).toContain(weightOnWheel('', 'METRIC'));
    expect(weightValues('IMPERIAL')).toContain(weightOnWheel('', 'IMPERIAL'));
    expect(weightOnWheel('82.5', 'METRIC')).toBe(82.5);
    expect(weightOnWheel('180', 'IMPERIAL')).toBe(180);
  });
});

describe('year', () => {
  test('from the earliest year the profile accepts to the youngest adult year, and every one an adult\'s (ADR-027 #13)', () => {
    const values = yearValues(THIS_YEAR);
    expect(values[0]).toBe(P.birthYearMin);
    for (const year of values) expect(birthYearProblem(String(year), THIS_YEAR)).toBeNull();
    expect(birthYearProblem(String(values[values.length - 1] + 1), THIS_YEAR)).toBe('too_young');
  });
});

describe('the suggestions the wheels start on', () => {
  test('a height in both systems\' fields, the same height, and an adult\'s year; never a weight', () => {
    const suggested = suggestedAnswers(THIS_YEAR);
    const metric = heightCm(suggested.height, 'METRIC');
    const imperial = heightCm(suggested.height, 'IMPERIAL');
    expect(metric).not.toBeNull();
    expect(Math.abs((imperial ?? 0) - (metric ?? 0))).toBeLessThanOrEqual(2); // whole inches
    expect(yearValues(THIS_YEAR)).toContain(Number(suggested.birthYear));
    expect(suggested).not.toHaveProperty('weight');
  });
});
