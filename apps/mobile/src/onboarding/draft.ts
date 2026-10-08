/**
 * The onboarding draft (K-306): the answers so far, kept as typed (text fields stay text until the end, so a half-typed
 * "17" is not rejected mid-word), the rule for leaving each step, and the profile the finished draft becomes.
 * Pure: the screens and the tests share it. The order of the steps is the route's (flow.ts).
 */
import type { components } from '@/api/schema';
import { type UnitSystem, heightCmFromImperial, parseWaistCm, parseWeightKg, roundTo } from '@/units/units';

import { type RetiredStep, type Step, walk } from './flow';
import { onboardingParams as P } from './params';
import type { StartingWeights } from './weights';

type Schemas = components['schemas'];
export type Weekday = Schemas['Weekday'];
export type Profile = Schemas['Profile'];

/** The foods typed, one per comma or line, trimmed; empty and repeated ones dropped. */
export function avoidList(typed: string): string[] {
  return [...new Set(typed.split(/[,\n]/).map((food) => food.trim()).filter((food) => food !== ''))];
}

export const WEEK: readonly Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export type Draft = {
  goal: Profile['goal'] | null;
  experience: Schemas['Experience'] | null;
  programChoice: Profile['programChoice'] | null;
  /** Placed by the app from the number of days chosen (ADR-072 #4, default_day_sets). */
  trainingDays: Weekday[];
  /** Metric fills `cm`, imperial `feet` and `inches`; only the fields of the units shown count. */
  height: { cm: string; feet: string; inches: string };
  birthYear: string;
  sex: Schemas['Sex'] | null;
  activityLevel: Schemas['ActivityLevel'] | null;
  healthConsent: 'granted' | 'declined' | null;
  weight: string;
  waist: string;
  avoid: string;
  /** The starting weights set, in kg by move (weights.ts); a move not here is skipped (ADR-072 #5). */
  startingWeights: StartingWeights;
  ids: { weighIn: string; waist: string };
  /**
   * The program the user brought in, as the server kept it (PUT /v1/program, K-968) and as the review left it; its review
   * rides on it. Set, it is the user's program on the server already: the end of the walk keeps it and builds none.
   */
  ownProgram: Schemas['Program'] | null;
  /** The user decided on that program's review: changes applied, or kept as it is (ADR-073 #3). */
  reviewed: boolean;
};

export const emptyDraft: Draft = {
  goal: null,
  experience: null,
  programChoice: null,
  trainingDays: [],
  height: { cm: '', feet: '', inches: '' },
  birthYear: '',
  sex: null,
  activityLevel: null,
  healthConsent: null,
  weight: '',
  waist: '',
  avoid: '',
  startingWeights: {},
  ids: { weighIn: '', waist: '' },
  ownProgram: null,
  reviewed: false,
};

/**
 * A program brought in (ADR-073 #1) answers the days question: its weekdays are the training days, Monday first. A day
 * on no weekday adds none. A program brought in anew is reviewed anew.
 */
export function broughtProgram(program: Schemas['Program']): Pick<Draft, 'ownProgram' | 'trainingDays' | 'reviewed'> {
  const on = new Set(program.days.flatMap((day) => (day.weekday === undefined ? [] : [day.weekday])));
  return { ownProgram: program, trainingDays: WEEK.filter((weekday) => on.has(weekday)), reviewed: false };
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
export function stepComplete(step: Step | RetiredStep, draft: Draft, system: UnitSystem, thisYear: number): boolean {
  switch (step) {
    case 'goal':
      return draft.goal !== null;
    case 'experience':
      return draft.experience !== null;
    case 'program':
      return draft.programChoice !== null;
    case 'ownProgram':
      return draft.ownProgram !== null;
    case 'review':
      return draft.ownProgram !== null && draft.reviewed;
    case 'days':
      return draft.trainingDays.length > 0;
    case 'consent':
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
    case 'weights':
      // Continue sends the weights set; with none, the step's own "Skip" goes on (each move skippable, ADR-072 #5).
      return Object.keys(draft.startingWeights).length > 0;
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

/** The steps a profile needs left unanswered; the starting weights go to the program, not the profile, and may all be skipped. */
const unanswered = (draft: Draft, units: UnitSystem, thisYear: number) =>
  walk(draft).find((step) => step !== 'weights' && !stepComplete(step, draft, units, thisYear));

/** Whether the walk's answers make a profile (the plan can be prepared on them). */
export function profileReady(draft: Draft, units: UnitSystem, thisYear: number): boolean {
  return unanswered(draft, units, thisYear) === undefined;
}

/** The profile to PUT. Throws on a draft that is not complete: the screens only offer "finish" once it is. */
export function toProfile(draft: Draft, { units, timeZone, thisYear }: Context): Profile {
  const incomplete = unanswered(draft, units, thisYear);
  if (incomplete !== undefined) throw new Error(`onboarding step ${incomplete} is not complete`);
  // Checked by stepComplete above; the non-null reads below cannot fail. Last month's sessions and a usual time are no
  // longer asked, so none goes out (ADR-072 #4).
  const avoid = draft.healthConsent === 'granted' ? avoidList(draft.avoid) : [];
  return {
    goal: draft.goal!,
    sex: draft.sex!,
    heightCm: heightCm(draft.height, units)!,
    birthYear: Number(draft.birthYear.trim()),
    activityLevel: draft.activityLevel!,
    experience: draft.experience!,
    programChoice: draft.programChoice!,
    schedule: {
      trainingDays: draft.trainingDays,
      checkInDay: P.checkInDay,
      timeZone,
    },
    units,
    ...(avoid.length > 0 ? { food: { avoid } } : {}),
  };
}
