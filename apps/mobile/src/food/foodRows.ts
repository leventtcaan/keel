/**
 * What a row of foods says about each (ADR-090 #5, K-1063): the portion it opens on and the numbers of that portion, single and
 * short, like "1 large · 72 kcal · P 6 · C 0 · F 5", so a person sees what a tap logs without opening anything. Only words and the
 * server's own numbers are arranged here (U1).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

import { amountPhrase } from './amountText';
import { macrosOf, macrosOfPortion, mid, numbersText } from './single';

type Schemas = components['schemas'];

/** "1 large", "2 × 1 large", "100 g": a portion at a quantity, in the portion's own words. */
export function portionPhrase(portion: Schemas['Portion'], quantity: number): string {
  return amountPhrase({ quantity, unit: portion.unit });
}

/** A food's second line: its brand when it has one, the portion it opens on, and that portion's numbers. */
export function foodDetail(food: Schemas['Food']): string {
  const start = food.defaultAmount;
  const portion = food.portions?.find((p) => p.unit === start?.unit) ?? food.portions?.[0];
  const quantity = portion !== undefined && portion.unit === start?.unit ? (start?.quantity ?? 1) : 1;
  const rest =
    portion === undefined
      ? // An answer without portions: the middle of the database's value per 100 g.
        t('meal.search.per100gSingle', { kcal: mid(food.per100g.kcal) })
      : t('meal.search.portionLine', { portion: portionPhrase(portion, quantity), numbers: numbersText(macrosOfPortion(portion, quantity)) });
  return food.brand === undefined ? rest : t('meal.search.withBrand', { brand: food.brand, rest });
}

/** A food eaten before (Recent, Frequent) in the amount of its last or usual time, with the numbers the server estimated for it. */
export function suggestionDetail(suggestion: Schemas['Suggestion']): string {
  const numbers = macrosOf({ kcal: suggestion.kcal, proteinG: suggestion.proteinG });
  return t('meal.search.portionLine', {
    portion: amountPhrase(suggestion.amount),
    numbers: t('food.single.lineKcalProtein', { kcal: numbers.kcal, protein: numbers.protein }),
  });
}

/** What a food row draws besides its name (Evre 7 A): the brand and the portion it opens on, the single calories of that portion, and its macros. */
export function foodRow(food: Schemas['Food']): { sub: string; kcal: number; macros: { protein: number; carbs: number; fat: number } } {
  const start = food.defaultAmount;
  const portion = food.portions?.find((p) => p.unit === start?.unit) ?? food.portions?.[0];
  const quantity = portion !== undefined && portion.unit === start?.unit ? (start?.quantity ?? 1) : 1;
  // An answer without portions: the middle of the database's value per 100 g.
  const numbers = portion === undefined ? macrosOf(food.per100g) : macrosOfPortion(portion, quantity);
  const rest = portion === undefined ? t('meal.search.per100gShort') : portionPhrase(portion, quantity);
  return {
    sub: food.brand === undefined ? rest : t('meal.search.withBrand', { brand: food.brand, rest }),
    kcal: numbers.kcal,
    macros: { protein: numbers.protein, carbs: numbers.carbs, fat: numbers.fat },
  };
}

/** The same for a food eaten before (Recent, Usually at): the amount of its last or usual time, and the numbers the server estimated for it. */
export function suggestionRow(suggestion: Schemas['Suggestion']): { sub: string; kcal: number; macros: { protein: number; carbs?: number; fat?: number } } {
  const numbers = macrosOf({ kcal: suggestion.kcal, proteinG: suggestion.proteinG, carbsG: suggestion.carbsG, fatG: suggestion.fatG });
  return {
    sub: amountPhrase(suggestion.amount),
    kcal: numbers.kcal,
    macros: {
      protein: numbers.protein,
      ...(suggestion.carbsG === undefined ? {} : { carbs: numbers.carbs }),
      ...(suggestion.fatG === undefined ? {} : { fat: numbers.fat }),
    },
  };
}
