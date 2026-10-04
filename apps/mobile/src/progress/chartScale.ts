/**
 * The strength chart's scale (K-604, ChartScaleTests): heights from the line's own lowest and highest value, labelled
 * with exactly those two points — every label is a week that happened, never a rounded tick no week reached (U1). Weeks
 * on the calendar from the evaluation window's first week to this one; the decision window's band from its first week.
 */
import { type StrengthPoint, callFrom, weekOf } from './strength';

/** The drawing area: points from `left` to `right`, the lowest at `bottom`, the highest at `top` (SVG y grows down). */
export type Box = { left: number; right: number; top: number; bottom: number };
/** A label: the point it names, at that point's height. */
export type Tick = { point: StrengthPoint; y: number };
export type Scale = { x: (week: string) => number; y: (value: number) => number; ticks: Tick[]; bandX: number };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const weeksBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / WEEK_MS);

/**
 * `from`: the evaluation window's first day; `shown`: a weight as the screen writes it (the user's unit) — the heights
 * are of the values the labels write. A flat line sits half way up with one label.
 */
export function chartScale(points: StrengthPoint[], from: string, today: string, box: Box, shown: (kg: number) => number = (kg) => kg): Scale {
  const first = weekOf(from);
  const span = Math.max(1, weeksBetween(first, weekOf(today)));
  const step = (box.right - box.left) / span;
  const x = (week: string) => box.left + weeksBetween(first, week) * step;

  const values = points.map((p) => shown(p.kg));
  const [low, high] = [Math.min(...values), Math.max(...values)];
  const y = (value: number) => (high === low ? (box.top + box.bottom) / 2 : box.bottom - ((value - low) / (high - low)) * (box.bottom - box.top));

  // The first point to reach each extreme names it; a flat line has one.
  const named = [points.find((p) => shown(p.kg) === low), points.find((p) => shown(p.kg) === high)].filter(
    (p, i, all): p is StrengthPoint => p !== undefined && all.indexOf(p) === i,
  );
  return { x, y, ticks: named.map((point) => ({ point, y: y(shown(point.kg)) })), bandX: x(callFrom(today)) - step / 2 };
}
