/**
 * The user's own cardio as Edit › Cardio changes it (K-970, ADR-074 #4, Ek 1): from the program's cardio as the server
 * sent it (the coach's default or the user's own), the minutes stepped within what the contract takes, a weekday on or
 * off. A day added is after the weights on a training day, at an easy pace on a day without weights (CardioPlace: never
 * before the weights, G2 K-35); a day kept keeps its place. No dose is worked out here: the coach's is the server's.
 */
import type { components } from '@/api/schema';
import { canStepMinutes, cardioAfterLift, cardioDraft, liftDays, steppedMinutes, toggledDay } from '@/train/cardio';
import { workoutParams as P } from '@/train/params';

type Schemas = components['schemas'];

const PROGRAM: Schemas['Program'] = {
  id: 'p',
  source: 'GENERATED',
  days: [
    { id: 'a', weekday: 'MONDAY', exercises: [] },
    { id: 'b', weekday: 'THURSDAY', exercises: [] },
  ],
  cardio: {
    source: 'GENERATED',
    minutes: 30,
    sessionsPerWeek: 3,
    sessions: [
      { weekday: 'MONDAY', place: 'AFTER_LIFT' },
      { weekday: 'THURSDAY', place: 'AFTER_LIFT' },
      { weekday: 'SATURDAY', place: 'OFF_DAY_LOW_INTENSITY' },
    ],
    doneThisWeek: 0,
    afterLiftOverLine: false,
  },
};

test("starts from the program's cardio as the server sent it", () => {
  expect(cardioDraft(PROGRAM)).toEqual({ minutes: 30, sessions: PROGRAM.cardio?.sessions });
});

test('with no cardio, starts from the start minutes and no day', () => {
  expect(cardioDraft({ ...PROGRAM, cardio: undefined })).toEqual({ minutes: P.cardioMinutesStart, sessions: [] });
});

test('a day added: after the weights on a training day, easy on a day without; Monday first', () => {
  const draft = { minutes: 30, sessions: [] };
  const added = toggledDay(toggledDay(draft, 'WEDNESDAY', liftDays(PROGRAM, null)), 'MONDAY', liftDays(PROGRAM, null));
  expect(added.sessions).toEqual([
    { weekday: 'MONDAY', place: 'AFTER_LIFT' },
    { weekday: 'WEDNESDAY', place: 'OFF_DAY_LOW_INTENSITY' },
  ]);
});

test('a day on goes off; the others keep their place', () => {
  expect(toggledDay(cardioDraft(PROGRAM), 'THURSDAY', liftDays(PROGRAM, null)).sessions).toEqual([
    { weekday: 'MONDAY', place: 'AFTER_LIFT' },
    { weekday: 'SATURDAY', place: 'OFF_DAY_LOW_INTENSITY' },
  ]);
});

test('minutes step by the step, never under one step nor over what the contract takes', () => {
  const draft = { minutes: 30, sessions: [] };
  expect(steppedMinutes(draft, 1).minutes).toBe(30 + P.cardioMinutesStep);
  expect(steppedMinutes(draft, -1).minutes).toBe(30 - P.cardioMinutesStep);
  expect(steppedMinutes({ minutes: P.cardioMinutesStep, sessions: [] }, -1).minutes).toBe(P.cardioMinutesStep);
  expect(steppedMinutes({ minutes: P.cardioMinutesMax, sessions: [] }, 1).minutes).toBe(P.cardioMinutesMax);
  expect(canStepMinutes({ minutes: P.cardioMinutesStep, sessions: [] }, -1)).toBe(false);
  expect(canStepMinutes({ minutes: P.cardioMinutesMax, sessions: [] }, 1)).toBe(false);
  expect(canStepMinutes(draft, 1)).toBe(true);
});

describe('the days the program lifts on, for where a day goes', () => {
  test("the program's weekdays, when every day has one", () => {
    expect(liftDays(PROGRAM, ['TUESDAY'])).toEqual(['MONDAY', 'THURSDAY']);
  });

  test("a day on no weekday: the profile's training days", () => {
    const loose = { ...PROGRAM, days: [{ id: 'a', exercises: [] }, PROGRAM.days[1]] };
    expect(liftDays(loose, ['TUESDAY', 'FRIDAY'])).toEqual(['TUESDAY', 'FRIDAY']);
  });

  test('a day on no weekday and no profile: not known, and no day is guessed to be a rest day', () => {
    const loose = { ...PROGRAM, days: [{ id: 'a', exercises: [] }] };
    expect(liftDays(loose, null)).toBeNull();
    expect(toggledDay({ minutes: 30, sessions: [] }, 'SUNDAY', null).sessions).toEqual([{ weekday: 'SUNDAY', place: 'AFTER_LIFT' }]);
  });
});

// K-973 (ADR-074 #3, ADR-075 #6): the session's last step is the cardio the program plans after the weights that day.
describe('the cardio after the weights today', () => {
  // 2026-10-12 is a Monday, 2026-10-13 a Tuesday, 2026-10-17 a Saturday.
  test('the minutes of the program\'s session after the weights on that weekday', () => {
    expect(cardioAfterLift(PROGRAM, '2026-10-12')).toBe(30);
  });

  test('none on a weekday it has no session; none on a day without weights (easy, no weights); none when turned off', () => {
    expect(cardioAfterLift(PROGRAM, '2026-10-13')).toBeNull();
    expect(cardioAfterLift(PROGRAM, '2026-10-17')).toBeNull();
    const off = { ...PROGRAM, cardio: { ...PROGRAM.cardio!, sessionsPerWeek: 0, sessions: [] } };
    expect(cardioAfterLift(off, '2026-10-12')).toBeNull();
  });

  test('none without cardio in the program, or without a program', () => {
    expect(cardioAfterLift({ ...PROGRAM, cardio: undefined }, '2026-10-12')).toBeNull();
    expect(cardioAfterLift(null, '2026-10-12')).toBeNull();
  });

  test("the user's own minutes are the server's: shown as sent", () => {
    expect(cardioAfterLift({ ...PROGRAM, cardio: { ...PROGRAM.cardio!, source: 'USER', minutes: 20 } }, '2026-10-12')).toBe(20);
  });
});
