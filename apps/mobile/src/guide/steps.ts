/**
 * The first-use guide's steps (K-1065): which parts of This week it points at, in order, and where each stands. The parts are
 * measured on the screen when the guide opens; a part that is not there (no workout today) or cannot be seen is left out, so
 * the guide is as long as what the screen has, three to four steps.
 */

export type StepId = 'call' | 'workout' | 'plus' | 'tabs';

/** A part of the screen in window points. */
export type Rect = { x: number; y: number; width: number; height: number };

export type Step = { id: StepId; rect: Rect };

/** The order of the walk: the call first, then what to do today, how to log, and where the rest is. */
export const ORDER: readonly StepId[] = ['call', 'workout', 'plus', 'tabs'];

/** A rect cut to the window (a tall block only partly in view is pointed at where it is seen); null when none of it is seen. */
export function clipped(rect: Rect, window: { width: number; height: number }, bottomInset = 0): Rect | null {
  const left = Math.max(0, rect.x);
  const top = Math.max(0, rect.y);
  const right = Math.min(window.width, rect.x + rect.width);
  const bottom = Math.min(window.height - bottomInset, rect.y + rect.height);
  if (right - left <= 0 || bottom - top <= 0) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** The tab bar: the foot of the window, as high as the bottom inset (inside the tabs it includes the bar). */
export function tabBarRect(window: { width: number; height: number }, bottomInset: number, tabBarHeight: number): Rect {
  const height = Math.max(bottomInset, tabBarHeight);
  return { x: 0, y: window.height - height, width: window.width, height };
}

/**
 * The dim over the window with a rounded hole where a part stands, as one SVG path (even-odd fill). Written as a worklet:
 * the four numbers ease from one step to the next and the path is built from them on the UI thread.
 */
export function holePath(x: number, y: number, width: number, height: number, window: { width: number; height: number }, radius: number): string {
  'worklet';
  const r = Math.min(radius, width / 2, height / 2);
  return (
    `M0 0H${window.width}V${window.height}H0Z` +
    `M${x + r} ${y}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${y + r}V${y + height - r}A${r} ${r} 0 0 1 ${x + width - r} ${y + height}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + height - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

/** The card goes under the part when the part is in the upper half of the window, over it otherwise. */
export function cardPlacement(rect: Rect, window: { height: number }): 'below' | 'above' {
  return rect.y + rect.height / 2 < window.height / 2 ? 'below' : 'above';
}
