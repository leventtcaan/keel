/**
 * The meal log's upgrade moment (ADR-091 #1, K-1202): at the third meal typed by hand in a day, a photo or a sentence is suggested,
 * and only while the AI is on. It is off in production today (ADR-080 #4): then nothing shows.
 */
import { aiLoggingAvailable, photoSuggested } from '@/food/aiLogging';
import { RETIRED } from '@/navigation/tabs';
import { subscriptionParams } from '@/subscription/params';

test('the third is a parameter, not a number in the code: three today', () => {
  expect(subscriptionParams.photoSuggestionAfterManualMeals).toBe(3);
});

test('from the third meal of the day, while the AI is on', () => {
  const after = subscriptionParams.photoSuggestionAfterManualMeals;
  expect(photoSuggested({ meals: after - 1, available: true })).toBe(false);
  expect(photoSuggested({ meals: after, available: true })).toBe(true);
  expect(photoSuggested({ meals: after + 2, available: true })).toBe(true);
});

test('with the AI off, never, however many meals', () => {
  expect(photoSuggested({ meals: 9, available: false })).toBe(false);
});

test('the AI is as available as the meal photo screen is: retired today, so off; back on the surface, on', () => {
  expect(RETIRED).toContain('meal-photo');
  expect(aiLoggingAvailable()).toBe(false);
  expect(aiLoggingAvailable(RETIRED.filter((screen) => screen !== 'meal-photo'))).toBe(true);
});
