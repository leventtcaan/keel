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
