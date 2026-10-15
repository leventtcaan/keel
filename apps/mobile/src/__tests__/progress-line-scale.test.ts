/**
 * The scale of Progress's line charts (K-979): points sit by their calendar day, the highest value at the top; the two labels
 * on the left are the lowest and the highest point themselves, at their own heights, so every label is a value that happened
 * (the old strength chart's rule, ChartScaleTests; U1).
 */
import { type ChartPoint, lineScale } from '@/progress/lineScale';

const BOX = { left: 50, right: 250, top: 20, bottom: 120 };
const point = (day: string, value: number): ChartPoint => ({ day, value, label: `${value} kg` });

describe('where a point sits', () => {
  const points = [point('2026-09-07', 96), point('2026-09-14', 98.7), point('2026-09-28', 104)];
  const scale = lineScale(points, BOX);

  test('the first day at the left edge, the last at the right, the days between in proportion', () => {
    expect(scale.x('2026-09-07')).toBe(50);
    expect(scale.x('2026-09-28')).toBe(250);
    expect(scale.x('2026-09-14')).toBeCloseTo(50 + 200 / 3, 6);
  });

  test('the lowest value at the bottom, the highest at the top, higher is up', () => {
    expect(scale.y(96)).toBe(120);
    expect(scale.y(104)).toBe(20);
    expect(scale.y(98.7)).toBeLessThan(scale.y(96));
    expect(scale.y(98.7)).toBeGreaterThan(scale.y(104));
  });

  test('the labels are the lowest and the highest point, each at its own height', () => {
    expect(scale.ticks.map((t) => [t.point.label, t.y])).toEqual([
      ['96 kg', 120],
      ['104 kg', 20],
    ]);
  });
});

describe('few points', () => {
  test('a flat line sits half way up with one label', () => {
    const scale = lineScale([point('2026-09-07', 80), point('2026-09-14', 80)], BOX);
    expect(scale.y(80)).toBe(70);
    expect(scale.ticks).toHaveLength(1);
    expect(scale.ticks[0].point.day).toBe('2026-09-07');
  });

  test('one day alone sits in the middle of the width', () => {
    const scale = lineScale([point('2026-09-07', 80)], BOX);
    expect(scale.x('2026-09-07')).toBe(150);
  });

  test('the first point to reach an extreme names it', () => {
    const scale = lineScale([point('2026-09-07', 90), point('2026-09-14', 100), point('2026-09-21', 100), point('2026-09-28', 90)], BOX);
    expect(scale.ticks.map((t) => t.point.day)).toEqual(['2026-09-07', '2026-09-14']);
  });

  test('days are counted as calendar days, not hours: a clock change moves nothing', () => {
    const scale = lineScale([point('2026-03-20', 1), point('2026-03-30', 2)], BOX);
    expect(scale.x('2026-03-25')).toBe(150);
  });
});
