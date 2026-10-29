/**
 * The portion step (ADR-090 #1, #5, K-1063): a food is logged in the portion people think in ("1 large" egg, "1 slice", "1 serving"),
 * with a quantity (half, 1, 2 …) a tap away, and g or oz when they weigh it. These helpers choose the step of the stepper, what a
 * quantity becomes when the portion changes, and the numbers shown. No amount is estimated here (U1): the portion's own numbers and
 * grams come from the server.
 */
import type { components } from '@/api/schema';

import type { DraftItem } from './draft';
import { parseQuantity } from './meals';
import { foodParams } from './params';

type Portion = components['schemas']['Portion'];

const GRAMS = 'g';
const OUNCES = 'oz';

/** One tap of the stepper for a portion: tens of grams or millilitres, half an ounce, half of anything counted. */
export function stepOf(unit: string, portion?: Portion): number {
  if (unit === OUNCES) return foodParams.amountStepOz;
  if (unit === GRAMS || portion?.kind === 'VOLUME') return foodParams.amountStepG;
  return foodParams.amountStepServing;
}

/** Whether the quantity is counted in pieces or servings (the common case that gets the half, 1, 2, 3 chips). */
export function isCounted(portion: Portion | undefined, unit: string): boolean {
  if (portion === undefined) return unit !== GRAMS && unit !== OUNCES;
  return portion.kind !== 'WEIGHT' && portion.kind !== 'VOLUME';
}

/** Whether the unit is weighed on a scale (g, oz): only then "Weighed" means something. */
export const isWeight = (unit: string): boolean => unit === GRAMS || unit === OUNCES;

/** The portion of an item by its unit. */
export const portionOf = (item: DraftItem): Portion | undefined => item.portions?.find((portion) => portion.unit === item.unit);

const round = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);
const clean = (value: number) => String(Math.round(value * 100) / 100);

/**
 * What the amount becomes in another portion: the same weight when both portions are known (1 large egg, about 50 g, is 50 g, about
 * 1.8 oz → 2), rounded to the new step; else one of a counted portion, a plain 100 g. A tap on a portion chip never leaves the amount
 * empty and never makes the user type.
 */
export function quantityInPortion(item: DraftItem, unit: string): string {
  const to = item.portions?.find((portion) => portion.unit === unit);
  const from = portionOf(item);
  const quantity = parseQuantity(item.quantity);
  if (to !== undefined && from !== undefined && quantity !== null) {
    return clean(round((from.grams * quantity) / to.grams, stepOf(unit, to)));
  }
  return isCounted(to, unit) ? '1' : String(foodParams.defaultGrams);
}
