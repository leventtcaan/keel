/**
 * What the paywall says once the server sees the subscription (K-1256, ADR-091 Ek 2 #6): the weekly calls always, and the coach and
 * meal reading only while their screens are on the surface (food/aiLogging.ts), never a feature that is retired.
 */
import { t } from '@/copy';
import { RETIRED } from '@/navigation/tabs';
import { subscribedLine } from '@/subscription/words';

test.each([
  ['the coach and meal reading on', [], 'subscription.subscribed.all'],
  ['only the coach on (meal reading retired)', ['meal-photo'], 'subscription.subscribed.coach'],
  ['only meal reading on (the coach retired)', ['coach'], 'subscription.subscribed.meals'],
  ['neither on', ['coach', 'meal-photo'], 'subscription.subscribed.calls'],
])('%s: the line names only what is on', (_case, retired, key) => {
  expect(subscribedLine(retired)).toBe(t(key));
});

test('today (meal-photo retired, the coach back): the coach, never meal reading', () => {
  expect(subscribedLine(RETIRED)).toBe(t('subscription.subscribed.coach'));
  expect(subscribedLine(RETIRED)).not.toMatch(/meal/i);
});
