/**
 * The user's own cardio as Edit › Cardio changes it (K-970, ADR-074 #4, Ek 1): from the program's cardio as the server
 * sent it (the coach's default or the user's own), the minutes stepped within what the contract takes, a weekday on or
 * off. A day added is after the weights on a training day, at an easy pace on a day without weights (CardioPlace: never
 * before the weights, G2 K-35); a day kept keeps its place. No dose is worked out here: the coach's is the server's.
 */
import type { components } from '@/api/schema';
import { canStepMinutes, cardioDraft, steppedMinutes, toggledDay } from '@/train/cardio';
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
  const added = toggledDay(toggledDay(draft, 'WEDNESDAY', PROGRAM), 'MONDAY', PROGRAM);
  expect(added.sessions).toEqual([
    { weekday: 'MONDAY', place: 'AFTER_LIFT' },
    { weekday: 'WEDNESDAY', place: 'OFF_DAY_LOW_INTENSITY' },
  ]);
});

test('a day on goes off; the others keep their place', () => {
  expect(toggledDay(cardioDraft(PROGRAM), 'THURSDAY', PROGRAM).sessions).toEqual([
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
