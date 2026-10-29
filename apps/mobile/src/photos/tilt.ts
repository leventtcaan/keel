/**
 * How far the phone leans from upright (K-601, H1 §2.4: a level on the capture screen standardises the pose), from the
 * accelerometer's gravity in g. Two leans: sideways in the screen's plane (x against y) and toward or away from the user
 * (z against the screen's plane); the larger one, to a tenth of a degree. Magnitudes only — iOS and Android sign gravity
 * differently, and an upright phone is upright either way.
 */
import { photoParams } from './params';

export type Tilt = { degrees: number; level: boolean };

const DEGREES = 180 / Math.PI;

export function tiltOf({ x, y, z }: { x: number; y: number; z: number }): Tilt {
  // No reading yet (or a broken one) is never "level".
  if (![x, y, z].every(Number.isFinite) || Math.hypot(x, y, z) === 0) return { degrees: 90, level: false };
  const sideways = Math.atan2(Math.abs(x), Math.abs(y));
  const toward = Math.atan2(Math.abs(z), Math.hypot(x, y));
  const degrees = Math.round(Math.max(sideways, toward) * DEGREES * 10) / 10;
  return { degrees, level: degrees <= photoParams.levelToleranceDeg };
}

/** The level as the screen shows it: the lean smoothed over the last readings, and whether the phone counts as straight. */
export type Level = { smoothed: number; straight: boolean };

/**
 * The next level from one more reading (K-1055). A raw reading jitters with every breath and hand tremor, so the lean is an
 * exponential moving average (photo_level_smoothing), and "straight" has two thresholds: it begins at or under
 * photo_level_tolerance_deg and ends only past photo_level_exit_deg. Between the two it keeps what it was, so a phone
 * hovering at the edge does not flip the word on every reading. The first reading is taken as it is: nothing to average with.
 */
export function nextLevel(previous: Level | null, degrees: number): Level {
  const { levelSmoothing, levelToleranceDeg, levelExitDeg } = photoParams;
  const smoothed = previous === null ? degrees : previous.smoothed + levelSmoothing * (degrees - previous.smoothed);
  const straight = previous?.straight === true ? smoothed <= levelExitDeg : smoothed <= levelToleranceDeg;
  return { smoothed, straight };
}
