/**
 * The capture screen's level (K-601, H1 §2.4): from the accelerometer's gravity, how far the phone leans from upright —
 * sideways in the screen's plane, or toward/away from the user — whichever is more, in degrees to a tenth. Level within
 * photo_level_tolerance_deg. Signs do not matter (platforms report gravity's direction differently); a phone lying flat or
 * held sideways is far from level.
 */
import { photoParams } from '@/photos/params';
import { tiltOf } from '@/photos/tilt';

const rad = (deg: number) => (deg * Math.PI) / 180;
/** Gravity on an upright phone leaning `side` degrees in its plane and `toward` degrees toward the user. */
const gravity = (side: number, toward: number) => ({
  x: Math.sin(rad(side)) * Math.cos(rad(toward)),
  y: -Math.cos(rad(side)) * Math.cos(rad(toward)),
  z: Math.sin(rad(toward)),
});

test('the tolerance is photo_level_tolerance_deg', () => {
  expect(photoParams.levelToleranceDeg).toBe(2);
});

test('upright is level, whichever way the platform signs gravity', () => {
  expect(tiltOf({ x: 0, y: -1, z: 0 })).toEqual({ degrees: 0, level: true });
  expect(tiltOf({ x: 0, y: 1, z: 0 })).toEqual({ degrees: 0, level: true });
});

test('leaning sideways: level up to the tolerance, not past it', () => {
  expect(tiltOf(gravity(2, 0))).toEqual({ degrees: 2, level: true });
  expect(tiltOf(gravity(-2.1, 0))).toEqual({ degrees: 2.1, level: false });
});

test('leaning toward or away from the user counts the same way', () => {
  expect(tiltOf(gravity(0, 1.5))).toEqual({ degrees: 1.5, level: true });
  expect(tiltOf(gravity(0, -5))).toEqual({ degrees: 5, level: false });
});

test('both at once: the larger lean is the one shown', () => {
  expect(tiltOf(gravity(1, 3))).toEqual({ degrees: 3, level: false });
  expect(tiltOf(gravity(3, 1))).toEqual({ degrees: 3, level: false });
});

test('flat on a table or held sideways: far from level', () => {
  expect(tiltOf({ x: 0, y: 0, z: -1 })).toEqual({ degrees: 90, level: false });
  expect(tiltOf({ x: 1, y: 0, z: 0 })).toEqual({ degrees: 90, level: false });
});

test('no reading (all zero, or not a number) is not level', () => {
  expect(tiltOf({ x: 0, y: 0, z: 0 }).level).toBe(false);
  expect(tiltOf({ x: Number.NaN, y: -1, z: 0 }).level).toBe(false);
});
