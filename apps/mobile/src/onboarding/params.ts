/** The onboarding's limits, from data/parameters/onboarding.json (ADR-029: parameters the phone reads). */
import type { components } from '@/api/schema';

import params from '../../../../data/parameters/onboarding.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`onboarding.json has no ${key}`);
  return found.value as T;
}

type Weekday = components['schemas']['Weekday'];

const DAY_SETS = param<Record<string, Weekday[]>>('default_day_sets');

/**
 * The weekdays the app places a chosen number of training days on (ADR-072 #4, default_day_sets); the user moves them
 * any time. None for a count the onboarding does not offer.
 */
export function defaultTrainingDays(count: number): Weekday[] | undefined {
  const days = DAY_SETS[String(count)];
  return days === undefined ? undefined : [...days];
}

/** The day counts the onboarding offers, fewest first. */
export const offeredDayCounts: number[] = Object.keys(DAY_SETS)
  .map(Number)
  .sort((a, b) => a - b);

export const onboardingParams = {
  maxTrainingDays: param<number>('max_training_days'),
  adultMinYearGap: param<number>('adult_min_year_gap'),
  birthYearMin: param<number>('birth_year_min'),
  heightMinCm: param<number>('height_min_cm'),
  heightMaxCm: param<number>('height_max_cm'),
  checkInDay: param<components['schemas']['Weekday']>('check_in_day'),
  photoIntervalWeeks: param<number>('photo_interval_weeks'),
  noInterpretationDays: param<number>('no_interpretation_days'),
  weighInMaxKg: param<number>('weigh_in_max_kg'),
  waistMaxCm: param<number>('waist_max_cm'),
  welcomeExampleMs: param<number>('welcome_example_ms'),
  wheelStart: param<{ height_cm: number; weight_kg: number; age_years: number }>('about_wheel_start'),
  weightWheel: param<{ min_kg: number; step_kg: number; step_lb: number }>('weight_wheel'),
  startingWeightReps: param<number>('starting_weight_reps'),
  startingWeightMoves: param<string[]>('starting_weight_moves'),
  startingWeightStepper: param<{ start_kg: number; step_kg: number; start_lb: number; step_lb: number }>('starting_weight_stepper'),
};
