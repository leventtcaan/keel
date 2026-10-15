/**
 * The scale of Progress's line charts (K-979, the strength chart and the weight chart): points sit by their calendar day, the
 * highest value at the top. The labels on the left are the lowest and the highest point themselves, at their own heights, so
 * every label is a value that happened, never a rounded tick no day reached (U1; the old strength chart's rule). Days are
 * read as dates only, so no clock change moves a point.
 */

/** A point: its calendar day, the value as the screen writes it (the user's unit), and that written value. */
export type ChartPoint = { day: string; value: number; label: string; marked?: boolean };
/** The drawing area: the earliest day at `left`, the latest at `right`, the lowest value at `bottom`, the highest at `top` (SVG y grows down). */
export type Box = { left: number; right: number; top: number; bottom: number };
export type Tick = { point: ChartPoint; y: number };
export type Scale = { x: (day: string) => number; y: (value: number) => number; ticks: Tick[] };

const DAY_MS = 24 * 60 * 60 * 1000;
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY_MS;

/** `points` oldest first. */
export function lineScale(points: ChartPoint[], box: Box): Scale {
  const [first, last] = [dayNumber(points[0].day), dayNumber(points[points.length - 1].day)];
  const x = (day: string) => (last === first ? (box.left + box.right) / 2 : box.left + ((dayNumber(day) - first) / (last - first)) * (box.right - box.left));

  const values = points.map((p) => p.value);
  const [low, high] = [Math.min(...values), Math.max(...values)];
  const y = (value: number) => (high === low ? (box.top + box.bottom) / 2 : box.bottom - ((value - low) / (high - low)) * (box.bottom - box.top));

  // The first point to reach each extreme names it; a flat line has one.
  const named = [points.find((p) => p.value === low), points.find((p) => p.value === high)].filter(
    (p, i, all): p is ChartPoint => p !== undefined && all.indexOf(p) === i,
  );
  return { x, y, ticks: named.map((point) => ({ point, y: y(point.value) })) };
}
