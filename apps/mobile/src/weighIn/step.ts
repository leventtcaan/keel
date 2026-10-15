/**
 * The weigh screen's plus and minus (K-980, ADR-018 Ek 1): the number in the field moves by the tenth a scale shows, in the
 * user's own unit. Nothing is worked out beyond that: a text that is not a weight, a step to zero or below, or past what the
 * server keeps leaves the text as it was (the button is off there).
 */
import { onboardingParams } from '@/onboarding/params';
import { type UnitSystem, parseNumber, parseWeightKg, roundTo, weightDecimals, weightStep } from '@/units/units';

/** `direction` 1 is plus, -1 minus. The text returned is written as the field writes a weight ("80.5"). */
export function stepWeightText(text: string, direction: 1 | -1, system: UnitSystem): string {
  const value = parseNumber(text);
  if (value === null) return text;
  const next = roundTo(value + direction * weightStep, weightDecimals);
  const kg = parseWeightKg(String(next), system);
  if (kg === null || kg > onboardingParams.weighInMaxKg) return text;
  return next.toFixed(weightDecimals);
}

/** Whether a step that way would change the text: the button is off where it would not. */
export function canStepWeight(text: string, direction: 1 | -1, system: UnitSystem): boolean {
  return stepWeightText(text, direction, system) !== text;
}
