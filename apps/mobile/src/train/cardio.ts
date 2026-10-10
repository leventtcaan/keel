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
import { weekdayOf } from './week';

type Schemas = components['schemas'];
type Weekday = Schemas['Weekday'];

export type CardioDraft = { minutes: number; sessions: Schemas['PlannedCardio'][] };

export function cardioDraft(program: Schemas['Program']): CardioDraft {
  const cardio = program.cardio;
  return cardio === undefined ? { minutes: P.cardioMinutesStart, sessions: [] } : { minutes: cardio.minutes, sessions: cardio.sessions };
}

/**
 * The weekdays the program lifts on: its days' weekdays when every day has one; else the profile's training days (the
 * days the user said they train); else not known (null).
 */
export function liftDays(program: Schemas['Program'], profileDays: readonly Weekday[] | null): Weekday[] | null {
  const own = program.days.flatMap((d) => (d.weekday === undefined ? [] : [d.weekday]));
  if (own.length === program.days.length && own.length > 0) return own;
  return profileDays === null ? null : [...profileDays];
}

/**
 * A weekday on (in its place) or off; the week in order, Monday first. With the lifting days not known, no day is
 * guessed to be a rest day: a day added is after the weights.
 */
export function toggledDay(draft: CardioDraft, weekday: Weekday, lifts: readonly Weekday[] | null): CardioDraft {
  if (draft.sessions.some((s) => s.weekday === weekday)) return { ...draft, sessions: draft.sessions.filter((s) => s.weekday !== weekday) };
  const lifting = lifts === null || lifts.includes(weekday);
  const added: Schemas['PlannedCardio'] = { weekday, place: lifting ? 'AFTER_LIFT' : 'OFF_DAY_LOW_INTENSITY' };
  const sessions = [...draft.sessions, added].sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday));
  return { ...draft, sessions };
}

/**
 * The session's last step (ADR-074 #3, ADR-075 #6): the minutes of the cardio the program plans after the weights on the
 * weekday of `date`, as the server sent them (the coach's default or the user's own); none when the program has no cardio,
 * has turned it off, or has no session after the weights that weekday (an easy-pace day is no day for this step). The
 * Train card reads the same session.
 */
export function cardioAfterLift(program: Schemas['Program'] | null, date: string): number | null {
  const cardio = program?.cardio;
  if (cardio === undefined || cardio.sessionsPerWeek === 0) return null;
  const weekday = weekdayOf(date);
  return cardio.sessions.some((s) => s.weekday === weekday && s.place === 'AFTER_LIFT') ? cardio.minutes : null;
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
