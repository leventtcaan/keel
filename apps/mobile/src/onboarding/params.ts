/** The onboarding's limits, from data/parameters/onboarding.json (ADR-029: parameters the phone reads). */
import type { components } from '@/api/schema';

import params from '../../../../data/parameters/onboarding.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`onboarding.json has no ${key}`);
  return found.value as T;
}

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
};
