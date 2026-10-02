/** Meal logging's slots, search bounds and amount ceilings, from data/parameters/food.json (ADR-029: parameters the phone reads). */
import type { components } from '@/api/schema';

import params from '../../../../data/parameters/food.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`food.json has no ${key}`);
  return found.value as T;
}

export const foodParams = {
  slotStarts: param<{ slot: components['schemas']['MealSlot']; fromHour: number }[]>('meal_slot_starts'),
  searchMinChars: param<number>('food_search_min_chars'),
  searchMaxChars: param<number>('food_search_max_chars'),
  searchResults: param<number>('food_search_results'),
  amountMaxG: param<number>('meal_amount_max_g'),
  amountDecimals: param<number>('meal_amount_decimals'),
  itemsMax: param<number>('meal_items_max'),
  amountMaxChars: param<number>('meal_amount_max_chars'),
  barcodeMinDigits: param<number>('barcode_min_digits'),
  barcodeMaxDigits: param<number>('barcode_max_digits'),
};
