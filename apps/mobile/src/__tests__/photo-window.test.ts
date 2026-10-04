/**
 * PhotoWindowTests (K-614, H1 §2.5): a photo every photo_interval_weeks weeks (4) — a window, not a fixed day. It opens
 * that many weeks after the last photo and stays open until the next one: no "missed", no "late" (U7). The first photo is
 * due in week 4 of the first eight (onboarding: "We'll ask for the camera in week 4"), or once that flow is over; when
 * the week can't be read (no health consent, offline), it is offered without being called due.
 */
import { onboardingParams } from '@/onboarding/params';
import { photoWindow } from '@/photos/window';

const TODAY = '2026-10-07';

test('the interval is photo_interval_weeks', () => {
  expect(onboardingParams.photoIntervalWeeks).toBe(4);
});

describe('after a photo', () => {
  test('the window opens four weeks after it', () => {
    expect(photoWindow('2026-09-10', TODAY, 'over')).toEqual({ kind: 'next', opensOn: '2026-10-08' });
  });

  test('on the day it opens it is open', () => {
    expect(photoWindow('2026-09-09', TODAY, 'over')).toEqual({ kind: 'open', since: TODAY });
  });

  test('it stays open, however long, from the day it opened', () => {
    expect(photoWindow('2026-06-01', TODAY, 'over')).toEqual({ kind: 'open', since: '2026-06-29' });
  });

  test('the flow week does not matter once there is a photo', () => {
    expect(photoWindow('2026-09-10', TODAY, 2)).toEqual({ kind: 'next', opensOn: '2026-10-08' });
    expect(photoWindow('2026-09-10', TODAY, null)).toEqual({ kind: 'next', opensOn: '2026-10-08' });
  });
});

describe('before the first photo', () => {
  test('weeks 1 to 3: due in week 4', () => {
    expect(photoWindow(null, TODAY, 1)).toEqual({ kind: 'first', week: 4 });
    expect(photoWindow(null, TODAY, 3)).toEqual({ kind: 'first', week: 4 });
  });

  test('from week 4, and after the first eight weeks: due', () => {
    expect(photoWindow(null, TODAY, 4)).toEqual({ kind: 'firstDue' });
    expect(photoWindow(null, TODAY, 9)).toEqual({ kind: 'firstDue' });
    expect(photoWindow(null, TODAY, 'over')).toEqual({ kind: 'firstDue' });
  });

  test('the week unknown: offered, not called due', () => {
    expect(photoWindow(null, TODAY, null)).toEqual({ kind: 'anytime' });
  });
});
