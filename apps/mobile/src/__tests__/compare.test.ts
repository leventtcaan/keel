/**
 * CompareTests, the anchors (K-602, 01 §15): people remember yesterday, not the start — so the latest photo is set beside a
 * past point the user picks: Day 1 (the first photo), or the photo day before the latest ("N weeks earlier"). Always the
 * same pose; a day without that pose is skipped. Fewer than two days of a pose: nothing to compare.
 */
import { comparison } from '@/photos/compare';
import type { PhotoCheck } from '@/photos/library';

const day = (takenOn: string, poses: ('front' | 'side')[] = ['front', 'side']): PhotoCheck => ({
  takenOn,
  photos: Object.fromEntries(poses.map((pose) => [pose, `file:///docs/${takenOn}-${pose}.jpg`])),
});

test('one day of a pose: nothing to compare', () => {
  expect(comparison([], 'front')).toBeNull();
  expect(comparison([day('2026-07-06')], 'front')).toBeNull();
  expect(comparison([day('2026-07-06'), day('2026-08-03', ['side'])], 'front')).toBeNull();
});

test('two days: Day 1 beside the latest', () => {
  expect(comparison([day('2026-07-06'), day('2026-08-03')], 'front')).toEqual({
    latest: { takenOn: '2026-08-03', uri: 'file:///docs/2026-08-03-front.jpg' },
    anchors: [{ kind: 'day1', takenOn: '2026-07-06', uri: 'file:///docs/2026-07-06-front.jpg', days: 28, weeks: 4 }],
  });
});

test('more days: Day 1, or the photo day before the latest, weeks counted to the latest', () => {
  const checks = [day('2026-07-06'), day('2026-08-03'), day('2026-09-02'), day('2026-10-05')];
  expect(comparison(checks, 'side')).toEqual({
    latest: { takenOn: '2026-10-05', uri: 'file:///docs/2026-10-05-side.jpg' },
    anchors: [
      { kind: 'day1', takenOn: '2026-07-06', uri: 'file:///docs/2026-07-06-side.jpg', days: 91, weeks: 13 },
      { kind: 'earlier', takenOn: '2026-09-02', uri: 'file:///docs/2026-09-02-side.jpg', days: 33, weeks: 5 },
    ],
  });
});

test('the same pose only: a day without it is not a point to compare with', () => {
  const checks = [day('2026-07-06'), day('2026-08-03', ['front']), day('2026-09-02')];
  expect(comparison(checks, 'side')?.anchors.map((a) => a.takenOn)).toEqual(['2026-07-06']);
  expect(comparison(checks, 'front')?.anchors.map((a) => a.takenOn)).toEqual(['2026-07-06', '2026-08-03']);
});

test('under a week the gap is in days, never a week that did not pass; from a week, to the nearest whole week', () => {
  const gap = (from: string, to: string) => {
    const anchor = comparison([day(from), day(to)], 'front')?.anchors[0];
    return anchor === undefined ? null : { days: anchor.days, weeks: anchor.weeks };
  };
  expect(gap('2026-10-04', '2026-10-05')).toEqual({ days: 1, weeks: null });
  expect(gap('2026-09-29', '2026-10-05')).toEqual({ days: 6, weeks: null });
  expect(gap('2026-09-28', '2026-10-05')).toEqual({ days: 7, weeks: 1 });
  expect(gap('2026-07-06', '2026-07-30')).toEqual({ days: 24, weeks: 3 });
  expect(gap('2026-07-06', '2026-08-01')).toEqual({ days: 26, weeks: 4 });
});
