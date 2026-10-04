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
export type Anchor = Shot & { kind: 'day1' | 'earlier'; days: number; weeks: number | null };
export type Comparison = { latest: Shot; anchors: Anchor[] };

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: string, to: string) => (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;

/** The latest photo of a pose and the points to compare it with; null with fewer than two days of that pose. */
export function comparison(checks: PhotoCheck[], pose: Pose): Comparison | null {
  const shots: Shot[] = checks.flatMap((check) => {
    const uri = check.photos[pose];
    return uri === undefined ? [] : [{ takenOn: check.takenOn, uri }];
  });
  if (shots.length < 2) return null;
  const latest = shots[shots.length - 1];
  const anchor = (shot: Shot, kind: Anchor['kind']): Anchor => {
    const days = Math.round(daysBetween(shot.takenOn, latest.takenOn));
    return { kind, ...shot, days, weeks: days < 7 ? null : Math.round(days / 7) };
  };
  const [first, previous] = [shots[0], shots[shots.length - 2]];
  return { latest, anchors: previous === first ? [anchor(first, 'day1')] : [anchor(first, 'day1'), anchor(previous, 'earlier')] };
}
