/**
 * The capture screen's level (K-601, H1 §2.4): from the accelerometer's gravity, how far the phone leans from upright —
 * sideways in the screen's plane, or toward/away from the user — whichever is more, in degrees to a tenth. Level within
 * photo_level_tolerance_deg. Signs do not matter (platforms report gravity's direction differently); a phone lying flat or
 * held sideways is far from level.
 */
import { photoParams } from '@/photos/params';
import { type Level, nextLevel, tiltOf } from '@/photos/tilt';

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

test('no reading (all zero, or not a number) is not level, and shows as far from it — never "NaN°"', () => {
  expect(tiltOf({ x: 0, y: 0, z: 0 })).toEqual({ degrees: 90, level: false });
  expect(tiltOf({ x: Number.NaN, y: -1, z: 0 })).toEqual({ degrees: 90, level: false });
});

test('a large lean both ways: toward the user is measured against the screen plane, not one axis', () => {
  expect(tiltOf(gravity(40, 45))).toEqual({ degrees: 45, level: false });
});

describe('the smoothed level (K-1055)', () => {
  const { levelSmoothing: alpha, levelToleranceDeg: tolerance, levelExitDeg: exit } = photoParams;
  /** Feeds readings one after the other, as the sensor does; every level on the way. */
  const feed = (readings: number[], from: Level | null = null) => {
    const levels: Level[] = [];
    let level = from;
    for (const degrees of readings) {
      level = nextLevel(level, degrees);
      levels.push(level);
    }
    return levels;
  };

  test('the thresholds make sense: a gap above the tolerance, a smoothing weight in (0, 1]', () => {
    expect(exit).toBeGreaterThan(tolerance);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThanOrEqual(1);
  });

  test('the first reading is taken as it is: nothing to average with', () => {
    expect(nextLevel(null, 1)).toEqual({ smoothed: 1, straight: true });
    expect(nextLevel(null, 30)).toEqual({ smoothed: 30, straight: false });
  });

  test('each reading moves the smoothed lean by photo_level_smoothing of the way to it', () => {
    const [, second] = feed([10, 0]);
    expect(second.smoothed).toBeCloseTo(10 - alpha * 10, 10);
    const [, third] = feed([2, 10]);
    expect(third.smoothed).toBeCloseTo(2 + alpha * 8, 10);
  });

  test('one wild reading does not flip a steady phone', () => {
    const levels = feed([0, 0, 0, 0, 20, 0, 0]);
    expect(levels.every((level) => level.straight)).toBe(true);
  });

  test('a tremor around zero stays straight', () => {
    const levels = feed([0.5, 3, 0.2, 3.5, 0.1, 3, 0.4, 3.2]);
    expect(levels.every((level) => level.straight)).toBe(true);
  });

  test('a phone that leans for good stops being straight, and only past the exit threshold', () => {
    const levels = feed([0, 0, ...Array(40).fill(20)]);
    const firstOff = levels.findIndex((level) => !level.straight);
    expect(firstOff).toBeGreaterThan(2); // not at the first reading of the lean: it is smoothed
    expect(levels[firstOff].smoothed).toBeGreaterThan(exit);
    expect(levels[firstOff - 1].smoothed).toBeLessThanOrEqual(exit);
    expect(levels.slice(firstOff).every((level) => !level.straight)).toBe(true);
  });

  test('between the tolerance and the exit threshold it keeps what it was (hysteresis)', () => {
    const between = (tolerance + exit) / 2;
    expect(nextLevel({ smoothed: between, straight: true }, between)).toEqual({ smoothed: between, straight: true });
    expect(nextLevel({ smoothed: between, straight: false }, between)).toEqual({ smoothed: between, straight: false });
  });

  test('not straight becomes straight only at or under the tolerance', () => {
    expect(nextLevel({ smoothed: tolerance, straight: false }, tolerance).straight).toBe(true);
    expect(nextLevel({ smoothed: tolerance + 0.01, straight: false }, tolerance + 0.01).straight).toBe(false);
  });

  test('straight stays straight up to the exit threshold, not past it', () => {
    expect(nextLevel({ smoothed: exit, straight: true }, exit).straight).toBe(true);
    expect(nextLevel({ smoothed: exit + 0.01, straight: true }, exit + 0.01).straight).toBe(false);
  });

  test('a phone hovering between the two thresholds does not flip back and forth', () => {
    const hover = [3, 3.5, 2.5, 3.8, 2.2, 3.1, 3.9, 2.4].map((degrees) => degrees);
    const straightStart = feed(hover, { smoothed: 1, straight: true });
    expect(new Set(straightStart.map((level) => level.straight))).toEqual(new Set([true]));
    const offStart = feed(hover, { smoothed: 10, straight: false });
    expect(offStart.every((level) => !level.straight)).toBe(true);
  });

  test('a phone that comes back straight is called straight again', () => {
    const levels = feed([30, ...Array(60).fill(0)]);
    expect(levels[0].straight).toBe(false);
    expect(levels[levels.length - 1]).toEqual({ smoothed: expect.closeTo(0, 2), straight: true });
  });

  test('no reading (tiltOf says 90) is not straight', () => {
    expect(nextLevel(null, tiltOf({ x: 0, y: 0, z: 0 }).degrees).straight).toBe(false);
  });
});
