/**
 * The comparison anchor (K-602, 01 §15): people remember yesterday, not the start, so beside yesterday nothing seems to
 * change. The latest photo is set beside a past point the user picks — Day 1, or the photo day before the latest — in the
 * same pose, from the phone's photos only (K-614, V1).
 */
import type { PhotoCheck, Pose } from './library';

export type Shot = { takenOn: string; uri: string };
/**
 * A past point, `days` before the latest; `weeks` to the nearest whole week from a week on, null under a week — a gap of a
 * day or two is said in days, never as a week that did not pass.
 */
export type Anchor = Shot & { kind: 'day1' | 'earlier' | 'picked'; days: number; weeks: number | null };
export type Comparison = { latest: Shot; anchors: Anchor[] };

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: string, to: string) => (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;

/** Every photo day of a pose, oldest first: all of them are the user's to see (ADR-096, free). */
export function shotsOf(checks: PhotoCheck[], pose: Pose): Shot[] {
  return checks.flatMap((check) => {
    const uri = check.photos[pose];
    return uri === undefined ? [] : [{ takenOn: check.takenOn, uri }];
  });
}

function anchorOf(shot: Shot, latest: Shot, kind: Anchor['kind']): Anchor {
  const days = Math.round(daysBetween(shot.takenOn, latest.takenOn));
  return { kind, ...shot, days, weeks: days < 7 ? null : Math.round(days / 7) };
}

/** The latest photo of a pose and the points to compare it with; null with fewer than two days of that pose. */
export function comparison(checks: PhotoCheck[], pose: Pose): Comparison | null {
  const shots = shotsOf(checks, pose);
  if (shots.length < 2) return null;
  const latest = shots[shots.length - 1];
  const anchor = (shot: Shot, kind: Anchor['kind']) => anchorOf(shot, latest, kind);
  const [first, previous] = [shots[0], shots[shots.length - 2]];
  return { latest, anchors: previous === first ? [anchor(first, 'day1')] : [anchor(first, 'day1'), anchor(previous, 'earlier')] };
}

/**
 * Two days the user picked, in either order (ADR-096: with a subscription): the later as `latest`, the earlier as its one anchor.
 * Null unless both are photo days of the pose and not the same day.
 */
export function picked(checks: PhotoCheck[], pose: Pose, days: readonly string[]): Comparison | null {
  const shots = shotsOf(checks, pose).filter((shot) => days.includes(shot.takenOn));
  if (days.length !== 2 || shots.length !== 2) return null;
  const [earlier, later] = shots;
  return { latest: later, anchors: [anchorOf(earlier, later, 'picked')] };
}
