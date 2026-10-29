import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';

import { photoParams } from './params';
import { type Level, nextLevel, tiltOf } from './tilt';

/**
 * Whether the phone is straight (K-601, K-1055): the accelerometer's lean, smoothed with a hysteresis (nextLevel), read
 * while the component using it is on the screen and stopped when it leaves — also if it leaves before the sensor answers.
 * null: no reading (no accelerometer, or none yet). The state changes only when the answer does, not on every reading, so
 * the screen redraws a few times a minute rather than five times a second.
 */
export function useLevel(): boolean | null {
  const [straight, setStraight] = useState<boolean | null>(null);
  useEffect(() => {
    let open = true;
    let subscription: { remove(): void } | null = null;
    let level: Level | null = null;
    void Accelerometer.isAvailableAsync().then((available) => {
      if (!open || !available) return;
      Accelerometer.setUpdateInterval(photoParams.levelUpdateMs);
      subscription = Accelerometer.addListener((gravity) => {
        level = nextLevel(level, tiltOf(gravity).degrees);
        setStraight(level.straight);
      });
    });
    return () => {
      open = false;
      subscription?.remove();
    };
  }, []);
  return straight;
}
