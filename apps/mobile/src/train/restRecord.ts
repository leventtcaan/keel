/**
 * The rest actually taken (K-1214): from the moment a set was logged and the rest began to the moment the user said Ready,
 * kept on the next set (NewSet.restSeconds) so the engine can one day read how long people really rest (the adapting rule
 * is a proposal that waits for the product owner, kural-ekle). A span is only what one rest was; anything that ends a rest
 * any other way than Ready (a pause, a skip or swap, the move's last set, leaving) voids it, so a pause can never leak
 * into a set's rest, and a move's first set carries none.
 */

/** `since`: when the rest began (ms); `endedAt`: when Ready was pressed, null while it runs or when it ended some other way. */
export type RestSpan = { since: number; endedAt: number | null };

export const startSpan = (since: number): RestSpan => ({ since, endedAt: null });

/** Ready: the span ends now. A span that already ended, or none, stays as it is. */
export const readySpan = (span: RestSpan | null, now: number): RestSpan | null =>
  span === null || span.endedAt !== null ? span : { since: span.since, endedAt: now };

/**
 * The whole seconds the rest lasted, at `now` when Ready was not used; null when there was none or it cannot be believed (a clock that went back,
 * or longer than `max`: a break the user forgot to pause is no rest). Never negative.
 */
export function restSecondsOf(span: RestSpan | null, now: number, max: number): number | null {
  if (span === null) return null;
  const end = span.endedAt ?? now;
  if (!Number.isFinite(end) || !Number.isFinite(span.since) || end < span.since) return null;
  const seconds = Math.round((end - span.since) / 1000);
  return seconds > max ? null : seconds;
}
