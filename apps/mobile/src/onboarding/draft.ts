/**
 * The onboarding draft (K-306): the answers so far, kept as typed (text fields stay text until the end, so a half-typed
 * "17" is not rejected mid-word), the rule for leaving each step, and the profile the finished draft becomes.
 * Pure: the screens and the tests share it.
 */
import type { components } from '@/api/schema';
import { type UnitSystem, heightCmFromImperial, parseWaistCm, parseWeightKg, roundTo } from '@/units/units';

import { onboardingParams as P } from './params';

type Schemas = components['schemas'];
export type Weekday = Schemas['Weekday'];
export type SessionsLastMonth = NonNullable<Schemas['Schedule']['sessionsLastMonth']>;
export type Profile = Schemas['Profile'];

/**
 * Every step, in the prototype's order (prototip/keel-prototype.html, section 1). The health consent comes before the
 * first health question (about you asks the weight), and Apple Health is last (1.8). The reference look (K-313) and the
 * AI consent (K-511) join later; with them the walk stays within 12 screens (I1 F1).
 */
export const STEPS = [
  'goal', 'program', 'schedule', 'healthData', 'about', 'activity', 'foods', 'photos', 'expectations', 'appleHealth',
] as const;

/** The steps this user walks: the foods to avoid may be health data (an allergy), so only with the consent (#14). */
export function stepsFor(draft: Draft): Step[] {
  return STEPS.filter((step) => step !== 'foods' || draft.healthConsent === 'granted');
}

/** The foods typed, one per comma or line, trimmed; empty and repeated ones dropped. */
export function avoidList(typed: string): string[] {
  return [...new Set(typed.split(/[,\n]/).map((food) => food.trim()).filter((food) => food !== ''))];
}
export type Step = (typeof STEPS)[number];

export const WEEK: readonly Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export type Draft = {
  goal: Profile['goal'] | null;
  programChoice: Profile['programChoice'] | null;
  trainingDays: Weekday[];
  sessionsLastMonth: SessionsLastMonth | null;
  /** As typed; empty when not given (it is optional). */
  usualTrainingTime: string;
  /** Metric fills `cm`, imperial `feet` and `inches`; only the fields of the units shown count. */
  height: { cm: string; feet: string; inches: string };
  birthYear: string;
  sex: Schemas['Sex'] | null;
  activityLevel: Schemas['ActivityLevel'] | null;
  healthConsent: 'granted' | 'declined' | null;
  weight: string;
  waist: string;
  avoid: string;
  ids: { weighIn: string; waist: string };
};

export const emptyDraft: Draft = {
  goal: null,
  programChoice: null,
  trainingDays: [],
  sessionsLastMonth: null,
  usualTrainingTime: '',
  height: { cm: '', feet: '', inches: '' },
  birthYear: '',
  sex: null,
  activityLevel: null,
  healthConsent: null,
  weight: '',
  waist: '',
  avoid: '',
  ids: { weighIn: '', waist: '' },
};

/** Adds or removes a day, in week order. A day past the limit is not added: the seventh stays rest (ADR-027 #15). */
export function toggleDay(days: Weekday[], day: Weekday): Weekday[] {
  const chosen = new Set(days);
  if (chosen.has(day)) chosen.delete(day);
  else if (chosen.size < P.maxTrainingDays) chosen.add(day);
  return WEEK.filter((d) => chosen.has(d));
}

/**
 * The most sessions each answer allows in a month — the answers' own bounds, not a tunable number; "5+" has none.
 * A month holds at least four weeks, so the plan asks at least 4 × days a month.
 */
const MOST_LAST_MONTH: Record<SessionsLastMonth, number> = {
  NONE_OR_ONE: 1,
  TWO_TO_THREE: 3,
  FOUR: 4,
  FIVE_OR_MORE: Infinity,
};
const WEEKS_IN_A_MONTH_AT_LEAST = 4;

/** Even at the top of their answer, did they train less last month than the plan asks? (I1: start near what you do.) */
export function lighterThanLastMonth(last: SessionsLastMonth, days: number): boolean {
  return MOST_LAST_MONTH[last] < days * WEEKS_IN_A_MONTH_AT_LEAST;
}

/** "HH:mm" (the contract's pattern) · null when nothing is typed · undefined when it is not a time. */
export function usualTime(typed: string): string | null | undefined {
  const text = typed.trim();
  if (text === '') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (match === null) return undefined;
  const [hours, minutes] = [Number(match[1]), Number(match[2])];
  if (hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

export type BirthYearProblem = 'missing' | 'not_a_year' | 'too_young';

/**
 * Only the year is kept, so an adult is someone certainly 18 on every day of this year: born at least 19 years before
 * it (ADR-027 #13, the contract's rule). A younger year is never sent.
 */
export function birthYearProblem(typed: string, thisYear: number): BirthYearProblem | null {
  const text = typed.trim();
  if (text === '') return 'missing';
  if (!/^\d{4}$/.test(text)) return 'not_a_year';
  const year = Number(text);
  if (year < P.birthYearMin || year > thisYear) return 'not_a_year';
  return thisYear - year < P.adultMinYearGap ? 'too_young' : null;
}

const wholeNumber = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);
const decimalNumber = (text: string): number | null =>
  /^\d+([.,]\d+)?$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : null;

/** Whole centimetres, rounded once (ADR-029), within what the profile accepts; null when it is not a height. */
export function heightCm(height: Draft['height'], system: UnitSystem): number | null {
  let cm: number | null;
  if (system === 'METRIC') {
    const typed = decimalNumber(height.cm);
    cm = typed === null ? null : roundTo(typed, 0);
  } else {
    const feet = wholeNumber(height.feet);
    const inches = height.inches.trim() === '' ? 0 : wholeNumber(height.inches);
    cm = feet === null || inches === null || inches >= 12 ? null : heightCmFromImperial(feet, inches);
  }
  return cm !== null && cm >= P.heightMinCm && cm <= P.heightMaxCm ? cm : null;
}

/** Whether the step's answers let the user go on. The information steps ask nothing. */
export function stepComplete(step: Step, draft: Draft, system: UnitSystem, thisYear: number): boolean {
  switch (step) {
    case 'goal':
      return draft.goal !== null;
    case 'program':
      return draft.programChoice !== null;
    case 'schedule':
      return (
        draft.trainingDays.length > 0 &&
        draft.sessionsLastMonth !== null &&
        usualTime(draft.usualTrainingTime) !== undefined
      );
    case 'healthData':
      return draft.healthConsent !== null;
    case 'about':
      return (
        heightCm(draft.height, system) !== null &&
        birthYearProblem(draft.birthYear, thisYear) === null &&
        draft.sex !== null &&
        (draft.healthConsent !== 'granted' || healthAnswersValid(draft, system))
      );
    case 'activity':
      return draft.activityLevel !== null;
    case 'foods':
    case 'photos':
    case 'expectations':
    case 'appleHealth':
      return true;
  }
}

/** With the consent, about you asks the weight (needed for the starting calories, K-114) and, if typed, the waist. */
function healthAnswersValid(draft: Draft, system: UnitSystem): boolean {
  return startingWeightKg(draft.weight, system) !== null && (draft.waist.trim() === '' || startingWaistCm(draft.waist, system) !== null);
}

// Within what the server keeps (the contract's bounds, after the one rounding): a value it would refuse must not leave
// onboarding looking saved and then vanish from the queue.
const within = (value: number | null, max: number) => (value !== null && value > 0 && value <= max ? value : null);

/** The starting weight in kg, rounded once (K-310); null when it is not one the server keeps. */
export function startingWeightKg(typed: string, system: UnitSystem): number | null {
  return within(parseWeightKg(typed, system), P.weighInMaxKg);
}

/** The waist in cm, rounded once; null when it is not one the server keeps. */
export function startingWaistCm(typed: string, system: UnitSystem): number | null {
  return within(parseWaistCm(typed, system), P.waistMaxCm);
}

type Context = { units: UnitSystem; timeZone: string; thisYear: number };

/** The profile to PUT. Throws on a draft that is not complete: the screens only offer "finish" once it is. */
export function toProfile(draft: Draft, { units, timeZone, thisYear }: Context): Profile {
  const incomplete = stepsFor(draft).find((step) => !stepComplete(step, draft, units, thisYear));
  if (incomplete !== undefined) throw new Error(`onboarding step ${incomplete} is not complete`);
  // Checked by stepComplete above; the non-null reads below cannot fail.
  const time = usualTime(draft.usualTrainingTime);
  const avoid = draft.healthConsent === 'granted' ? avoidList(draft.avoid) : [];
  return {
    goal: draft.goal!,
    sex: draft.sex!,
    heightCm: heightCm(draft.height, units)!,
    birthYear: Number(draft.birthYear.trim()),
    activityLevel: draft.activityLevel!,
    programChoice: draft.programChoice!,
    schedule: {
      trainingDays: draft.trainingDays,
      ...(time ? { usualTrainingTime: time } : {}),
      sessionsLastMonth: draft.sessionsLastMonth!,
      checkInDay: P.checkInDay,
      timeZone,
    },
    units,
    ...(avoid.length > 0 ? { food: { avoid } } : {}),
  };
}
