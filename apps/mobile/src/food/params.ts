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
  searchDelayMs: param<number>('food_search_delay_ms'),
  servingVolumeWords: param<string[]>('food_serving_volume_words'),
  defaultGrams: param<number>('meal_default_grams'),
  searchMaxChars: param<number>('food_search_max_chars'),
  searchResults: param<number>('food_search_results'),
  amountMaxG: param<number>('meal_amount_max_g'),
  amountDecimals: param<number>('meal_amount_decimals'),
  amountStepG: param<number>('meal_amount_step_g'),
  amountStepServing: param<number>('meal_amount_step_serving'),
  itemsMax: param<number>('meal_items_max'),
  amountMaxChars: param<number>('meal_amount_max_chars'),
  recipeNameMaxChars: param<number>('recipe_name_max_chars'),
  recipePortionsMax: param<number>('recipe_portions_max'),
  barcodeMinDigits: param<number>('barcode_min_digits'),
  barcodeMaxDigits: param<number>('barcode_max_digits'),
  barcodeMaxChars: param<number>('barcode_max_chars'),
  photoMaxSide: param<number>('meal_photo_max_side'),
  photoQuality: param<number>('meal_photo_jpeg_quality'),
  quickRecentMax: param<number>('quick_recent_max'),
  pastDaySlotHours: param<Record<components['schemas']['MealSlot'], number>>('past_day_slot_hours'),
  dayStripDays: param<number>('day_strip_days'),
  logAgainDays: param<number>('log_again_days'),
  logAgainMax: param<number>('log_again_max'),
  slotsUsedWindowDays: param<number>('slots_used_window_days'),
  quickQuantities: param<number[]>('portion_quick_quantities'),
  amountStepOz: param<number>('meal_amount_step_oz'),
  quickAddKcalMax: param<number>('quick_add_kcal_max'),
  quickAddMacroMax: param<number>('quick_add_macro_max'),
  ownFoodNameMax: param<number>('own_food_name_max_chars'),
  ownFoodServingG: param<number>('own_food_default_serving_g'),
  swipeDeletePx: param<number>('swipe_delete_px'),
  mealHintRoundKcal: param<number>('meal_hint_round_kcal'),
};
