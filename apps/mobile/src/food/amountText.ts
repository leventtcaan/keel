import type { components } from '@/api/schema';
import { t } from '@/copy';

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
