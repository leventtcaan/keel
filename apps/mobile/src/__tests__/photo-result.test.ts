/**
 * The capture's last screen (K-1055): which set was just taken and when the next is due, from the photos on the phone and the
 * window rule alone — never a request, never a guess (window.ts, photo_interval_weeks).
 */
import type { PhotoCheck } from '@/photos/library';
import { summarise } from '@/photos/result';
import { onboardingParams } from '@/onboarding/params';

const check = (takenOn: string, front = true, side = true): PhotoCheck => ({
  takenOn,
  photos: { ...(front ? { front: `file:///docs/${takenOn}-front.jpg` } : {}), ...(side ? { side: `file:///docs/${takenOn}-side.jpg` } : {}) },
});
const both = { front: 'file:///docs/x-front.jpg', side: 'file:///docs/x-side.jpg' };
const interval = onboardingParams.photoIntervalWeeks;

test('the first set: week 1, the next one photo_interval_weeks later, nothing to compare yet', () => {
  expect(summarise([], both, '2026-10-26')).toEqual({ week: 1, nextWeek: 1 + interval, nextOn: '2026-11-23', canCompare: false });
});

test('the next set opens photo_interval_weeks weeks after this one, on the same weekday', () => {
  const { nextOn } = summarise([], both, '2026-10-26');
  expect(Date.parse(`${nextOn}T00:00:00Z`) - Date.parse('2026-10-26T00:00:00Z')).toBe(interval * 7 * 24 * 60 * 60 * 1000);
});

test('the week is counted from the first photo day on the phone', () => {
  const before = [check('2026-10-26')];
  expect(summarise(before, both, '2026-10-26').week).toBe(1); // the same day again: still week 1
  expect(summarise(before, both, '2026-11-01').week).toBe(1); // 6 days on
  expect(summarise(before, both, '2026-11-02').week).toBe(2); // 7 days on
  expect(summarise(before, both, '2026-11-23')).toMatchObject({ week: 5, nextWeek: 5 + interval });
});

test('an earlier set on the phone: Compare has something to show', () => {
  expect(summarise([check('2026-10-26')], both, '2026-11-23').canCompare).toBe(true);
});

test('two days of only one pose are enough', () => {
  expect(summarise([check('2026-10-26', true, false)], { front: 'file:///docs/x-front.jpg' }, '2026-11-23').canCompare).toBe(true);
});

test('the day taken again is the same day, not a second one', () => {
  const result = summarise([check('2026-10-26')], both, '2026-10-26');
  expect(result.canCompare).toBe(false);
  expect(result.week).toBe(1);
});

test('earlier days given out of order still start the count at the first', () => {
  const before = [check('2026-11-23'), check('2026-10-26')];
  expect(summarise(before, both, '2026-12-21').week).toBe(9);
});
