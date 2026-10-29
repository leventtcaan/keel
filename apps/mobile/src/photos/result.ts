/**
 * What the capture's last screen says once both photos are kept (K-1055): which set this is and when the next one is due,
 * from the photos on the phone alone (V1: no request for it) and the window rule (window.ts, photo_interval_weeks).
 * Nothing is invented: the week is counted from the first photo day on the phone (that day is week 1, the app's "Day 1"),
 * and the next set is the day the window opens, `photoWindow` of the set just taken.
 */
import { onboardingParams } from '@/onboarding/params';

import { comparison } from './compare';
import { type PhotoCheck, type Pose, POSES } from './library';
import { photoWindow } from './window';

export type SetSummary = {
  /** This set's week, counted from the first photo day: that day's week is 1. */
  week: number;
  /** The week of the next set, photo_interval_weeks on. */
  nextWeek: number;
  /** The day the next set's window opens. */
  nextOn: string;
  /** Two days of one pose are on the phone: Compare has something to show. */
  canCompare: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/**
 * `before`: the photo days on the phone when the screen opened. `saved`: the photos kept now, by pose, taken on `day`
 * (a day already there is replaced, as the library does for the same name).
 */
export function summarise(before: PhotoCheck[], saved: Partial<Record<Pose, string>>, day: string): SetSummary {
  const checks = [...before.filter((check) => check.takenOn !== day), { takenOn: day, photos: saved }].sort((a, b) => a.takenOn.localeCompare(b.takenOn));
  const week = Math.max(0, Math.floor(daysBetween(checks[0].takenOn, day) / 7)) + 1;
  const window = photoWindow(day, day, null);
  // The window of a photo taken today is always "next": it opens interval weeks on.
  const nextOn = window.kind === 'next' ? window.opensOn : day;
  return {
    week,
    nextWeek: week + onboardingParams.photoIntervalWeeks,
    nextOn,
    canCompare: POSES.some((pose) => comparison(checks, pose) !== null),
  };
}
