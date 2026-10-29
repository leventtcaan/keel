import type { components } from '@/api/schema';
import { t } from '@/copy';

import { PORTION } from './draft';

const GRAMS = 'g';

/** A serving's name may begin with its own count: "1 medium", "2 tbsp", "1/2 pie", "½ cup". */
const BEGINS_WITH_COUNT = /^\s*(\d+([./]\d+)?|[¼½¾⅓⅔⅛])\s/;

/**
 * A food and its amount as one line ("Potato, baked · 1 medium", K-1029). `unit` is grams, millilitres or the name of a serving
 * (Amount.unit). A serving named with its count already says the amount once ("1 medium"), so the quantity is not put before
 * it again ("1 1 medium"); several of such a serving is "2 × 1 medium". Any other unit follows the quantity ("170 g", "1 bowl").
 * Only the words are arranged: no amount is worked out here (U1).
 */
export function amountLine(name: string, amount: Pick<components['schemas']['Amount'], 'quantity' | 'unit'>): string {
  const { quantity, unit } = amount;
  if (BEGINS_WITH_COUNT.test(unit)) {
    return quantity === 1 ? t('food.suggestions.itemServing', { name, unit }) : t('food.suggestions.itemServings', { name, quantity: String(quantity), unit });
  }
  return t('food.suggestions.item', { name, quantity: String(quantity), unit });
}

/** A unit on its chip: grams and a recipe's portions in the app's words, a serving by its name. */
export function unitLabel(unit: string): string {
  if (unit === GRAMS) return t('meal.item.grams');
  return unit === PORTION ? t('meal.item.portions') : unit;
}

/**
 * What stands after the number on an amount field: the chip's words, and "× 1 medium" for a serving named with its own count,
 * as `amountLine` writes it ("2 × 1 medium"), so the field never reads "2 1 medium".
 */
export function unitAfterNumber(unit: string): string {
  return BEGINS_WITH_COUNT.test(unit) ? t('meal.item.servingOf', { unit }) : unitLabel(unit);
}

/**
 * An amount alone, as a row's second line says it (K-1063): "1 large", "2 × 1 large", "150 g", "1.5 cup". The same arranging of words
 * as `amountLine`, without the food's name before it.
 */
export function amountPhrase(amount: Pick<components['schemas']['Amount'], 'quantity' | 'unit'>): string {
  const { quantity, unit } = amount;
  if (BEGINS_WITH_COUNT.test(unit)) return quantity === 1 ? unit : t('food.suggestions.times', { quantity: String(quantity), unit });
  return t('food.suggestions.amount', { quantity: String(quantity), unit: unitLabel(unit) });
}
