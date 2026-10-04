/**
 * ChartScaleTests (K-604): every label on the strength chart is a real value — the lowest and the highest estimated 1RM
 * the line has, drawn at the height of that very point — never a rounded "nice" tick that no week reached. Weeks sit on
 * the calendar, the decision window's band starts at its first week.
 */
import { chartScale } from '@/progress/chartScale';
import type { StrengthPoint } from '@/progress/strength';
import { loadValue } from '@/units/units';

const BOX = { left: 30, right: 290, top: 10, bottom: 140 };
const FROM = '2026-07-10'; // the window's first day: its week is Monday 2026-07-06
const TODAY = '2026-10-07'; // this week: Monday 2026-10-05, 13 weeks on — 14 weeks, 20 apart
const point = (week: string, kg: number, easier = false): StrengthPoint => ({ week, kg, easier });

test('the labels are the lowest and the highest point, each at its own height', () => {
  const points = [point('2026-09-07', 100), point('2026-09-14', 96), point('2026-09-21', 104), point('2026-09-28', 102)];
  const scale = chartScale(points, FROM, TODAY, BOX);
  expect(scale.ticks.map((tick) => tick.point)).toEqual([points[1], points[2]]);
  expect(scale.ticks.map((tick) => tick.y)).toEqual([BOX.bottom, BOX.top]);
  // A point between them is between them, in proportion: 100 is half way from 96 to 104.
  expect(scale.y(100)).toBe(75);
  expect(scale.y(102)).toBe(42.5);
});

test('a value two weeks share is labelled once, at the first of them', () => {
  const points = [point('2026-09-07', 96), point('2026-09-14', 104), point('2026-09-21', 96)];
  expect(chartScale(points, FROM, TODAY, BOX).ticks.map((tick) => tick.point)).toEqual([points[0], points[1]]);
});

test('a flat line has one label, half way up', () => {
  const points = [point('2026-09-21', 100), point('2026-09-28', 100)];
  const scale = chartScale(points, FROM, TODAY, BOX);
  expect(scale.ticks).toEqual([{ point: points[0], y: 75 }]);
  expect(scale.y(100)).toBe(75);
});

test('in pounds the scale is the pounds the labels write', () => {
  const pounds = (kg: number) => loadValue(kg, 'IMPERIAL');
  const points = [point('2026-09-21', 100), point('2026-09-28', 110)];
  const scale = chartScale(points, FROM, TODAY, BOX, pounds);
  expect(scale.y(pounds(100))).toBe(BOX.bottom);
  expect(scale.y(pounds(110))).toBe(BOX.top);
  expect(scale.ticks.map((tick) => tick.y)).toEqual([BOX.bottom, BOX.top]);
});

test('weeks sit on the calendar: the window first week at the left, this week at the right', () => {
  const scale = chartScale([point('2026-09-28', 100)], FROM, TODAY, BOX);
  expect(scale.x('2026-07-06')).toBe(30);
  expect(scale.x('2026-08-31')).toBe(190); // 8 weeks on
  expect(scale.x('2026-10-05')).toBe(290);
  // The decision window (this week and the last) starts half a week before its first week: 270 − 10.
  expect(scale.bandX).toBe(260);
});

describe('any line', () => {
  // A seeded generator: the same lines on every run, many shapes (1 to 14 weeks, 20 to 300 kg, ties).
  let seed = 7;
  const next = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const lines = Array.from({ length: 200 }, () => {
    const weeks = 1 + Math.floor(next() * 14);
    return Array.from({ length: weeks }, (_, i) => point(`w${i}`, Math.round((20 + next() * 280) * 10) / 10));
  });

  test.each(lines.map((line, i) => [i, line] as const))('line %i: labels are its extremes, every point inside the box, in order', (_, line) => {
    const scale = chartScale(line, FROM, TODAY, BOX);
    const values = line.map((p) => p.kg);
    const [low, high] = [Math.min(...values), Math.max(...values)];
    expect(scale.ticks.map((tick) => tick.point.kg)).toEqual(low === high ? [low] : [low, high]);
    for (const tick of scale.ticks) expect(tick.y).toBe(scale.y(tick.point.kg));
    for (const p of line) {
      expect(scale.y(p.kg)).toBeGreaterThanOrEqual(BOX.top);
      expect(scale.y(p.kg)).toBeLessThanOrEqual(BOX.bottom);
    }
    // Heavier is higher on the screen (a smaller y), never the other way.
    const sorted = [...values].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i] > sorted[i - 1]) expect(scale.y(sorted[i])).toBeLessThan(scale.y(sorted[i - 1]));
    }
  });
});
