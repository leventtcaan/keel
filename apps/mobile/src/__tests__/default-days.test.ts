/**
 * The onboarding asks how many days and places them itself (ADR-072 #4, plan/yeni-yuz-kurallar.md R6): from
 * default_day_sets in data/parameters/onboarding.json, never from a list in the code.
 */
import { WEEK } from '@/onboarding/draft';
import { defaultTrainingDays, offeredDayCounts, onboardingParams } from '@/onboarding/params';

test('two to five days are offered', () => {
  expect(offeredDayCounts).toEqual([2, 3, 4, 5]);
});

test.each([
  [2, ['MONDAY', 'THURSDAY']],
  [3, ['MONDAY', 'WEDNESDAY', 'FRIDAY']],
  [4, ['MONDAY', 'TUESDAY', 'THURSDAY', 'FRIDAY']],
  [5, ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'FRIDAY', 'SATURDAY']],
])('%i days fall on %j', (count, days) => {
  expect(defaultTrainingDays(count)).toEqual(days);
});

test.each(offeredDayCounts)('%i days: that many weekdays, each once, in the order of the week, a rest day kept', (count) => {
  const days = defaultTrainingDays(count) ?? [];
  expect(days).toHaveLength(count);
  expect(days).toEqual(WEEK.filter((day) => days.includes(day)));
  expect(count).toBeLessThanOrEqual(onboardingParams.maxTrainingDays);
  expect(WEEK.filter((day) => !days.includes(day)).length).toBeGreaterThanOrEqual(1);
});

test('a count the onboarding does not offer has no days, and the days handed out are a copy', () => {
  expect(defaultTrainingDays(1)).toBeUndefined();
  expect(defaultTrainingDays(6)).toBeUndefined();
  defaultTrainingDays(3)?.pop();
  expect(defaultTrainingDays(3)).toHaveLength(3);
});
