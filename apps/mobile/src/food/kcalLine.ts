import type { components } from '@/api/schema';
import { t } from '@/copy';

/** A food's energy per 100 g as a range (U5), in the words the rest of the app uses for one: written, and spoken for a screen reader. */
export function kcalPer100g(food: components['schemas']['Food']): { written: string; spoken: string } {
  const unit = t('food.budget.kcalUnit');
  const { low, high } = food.per100g.kcal;
  return {
    written: t('meal.search.per100g', { kcal: `${t('format.range', { low, high })} ${unit}` }),
    spoken: t('meal.search.per100gSpoken', { kcal: `${t('format.rangeSpoken', { low, high })} ${unit}` }),
  };
}
