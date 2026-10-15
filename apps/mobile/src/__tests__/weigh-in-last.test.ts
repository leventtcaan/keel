/**
 * "Last: 80.4 kg" and when it was (K-980 review): the server's `measuredAt`, written as a date on the phone's calendar and
 * left out when it is today's. The phone only formats; a weigh-in brought in from before (IMPORT) is shown but never filled in.
 */
import { lastWeighInDate, prefillKg } from '@/weighIn/last';

const NOW = new Date(2026, 9, 15, 9, 0); // Thursday 15 Oct 2026, phone's calendar
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();

test('today\'s weigh-in has no date', () => {
  expect(lastWeighInDate(at(2026, 9, 15, 7), NOW)).toBeNull();
});

test('another day is written as a short date', () => {
  expect(lastWeighInDate(at(2026, 9, 14), NOW)).toBe('Oct 14');
  expect(lastWeighInDate(at(2026, 8, 30), NOW)).toBe('Sep 30');
});

test('a weigh-in of another year carries its year', () => {
  expect(lastWeighInDate(at(2025, 9, 14), NOW)).toBe('Oct 14, 2025');
});

test('a time that is not a time gives no date', () => {
  expect(lastWeighInDate('soon', NOW)).toBeNull();
});

test('the field is filled from the last weigh-in the user made, never from one brought in', () => {
  expect(prefillKg({ id: 'a', clientId: 'a', measuredAt: at(2026, 9, 14), kg: 80.4, source: 'MANUAL' })).toBe(80.4);
  expect(prefillKg({ id: 'a', clientId: 'a', measuredAt: at(2026, 9, 14), kg: 80.4, source: 'APPLE_HEALTH' })).toBe(80.4);
  expect(prefillKg({ id: 'a', clientId: 'a', measuredAt: at(2026, 9, 14), kg: 80.4, source: 'IMPORT' })).toBeNull();
  expect(prefillKg(undefined)).toBeNull();
});
