/**
 * The user's own cardio as Edit › Cardio changes it (K-970, ADR-074 #4, Ek 1), before it is sent (PUT
 * /v1/program/cardio). It starts from the program's cardio as the server sent it (the coach's default or the user's
 * own); with none, from cardio_minutes_start and no day. The minutes step within what CardioPlan takes; a weekday goes
 * on or off. A day added sits where CardioPlace says it can: after the weights on a day the program trains, at an easy
 * pace on a day it does not (never before the weights, G2 K-35); a day kept keeps the place it had. No dose is worked
 * out here: the coach's default is the server's, and "Back to the coach's default" asks the server for it again.
 */
import type { components } from '@/api/schema';

import { workoutParams as P } from './params';
import { WEEKDAYS } from './programEdit';

type Schemas = components['schemas'];
type Weekday = Schemas['Weekday'];

export type CardioDraft = { minutes: number; sessions: Schemas['PlannedCardio'][] };

export function cardioDraft(program: Schemas['Program']): CardioDraft {
  const cardio = program.cardio;
  return cardio === undefined ? { minutes: P.cardioMinutesStart, sessions: [] } : { minutes: cardio.minutes, sessions: cardio.sessions };
}

/** A weekday on (in its place) or off; the week in order, Monday first. */
export function toggledDay(draft: CardioDraft, weekday: Weekday, program: Schemas['Program']): CardioDraft {
  if (draft.sessions.some((s) => s.weekday === weekday)) return { ...draft, sessions: draft.sessions.filter((s) => s.weekday !== weekday) };
  const lifts = program.days.some((d) => d.weekday === weekday);
  const added: Schemas['PlannedCardio'] = { weekday, place: lifts ? 'AFTER_LIFT' : 'OFF_DAY_LOW_INTENSITY' };
  const sessions = [...draft.sessions, added].sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday));
  return { ...draft, sessions };
}

const bounded = (minutes: number) => Math.min(P.cardioMinutesMax, Math.max(P.cardioMinutesStep, minutes));

/** The minutes a step up or down, never under one step nor over the contract's most. */
export function steppedMinutes(draft: CardioDraft, by: number): CardioDraft {
  return { ...draft, minutes: bounded(draft.minutes + by * P.cardioMinutesStep) };
}

/** Whether a step that way would change the minutes: the stepper's button is off where it would not. */
export function canStepMinutes(draft: CardioDraft, by: number): boolean {
  return steppedMinutes(draft, by).minutes !== draft.minutes;
}
