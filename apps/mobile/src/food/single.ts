/**
 * One number where a person logs (ADR-090 #5, U5 as amended): a portion's numbers are the database's single figures (the middle of
 * its range, a product's label value); a logged item's, a meal's and a day's are the middle of the server's range. The ranges stay in
 * the estimate and in the detail a tap opens. Only the words are arranged here: nothing is estimated (U1) — the middle of two numbers
 * the server gave is not a new estimate, it is how a range is shown at a glance.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

type Schemas = components['schemas'];
type Range = { low: number; high: number };

/** The numbers shown for a food, an item, a meal or a day. */
export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

/** The middle of a range, whole. */
export const mid = (range: Range): number => Math.round((range.low + range.high) / 2);

/** What a range of a logged item, meal or day comes to as single numbers; macros a range does not carry count as 0. */
export function macrosOf(n: { kcal: Range; proteinG: Range; carbsG?: Range; fatG?: Range }): Macros {
  return {
    kcal: mid(n.kcal),
    protein: mid(n.proteinG),
    carbs: n.carbsG === undefined ? 0 : mid(n.carbsG),
    fat: n.fatG === undefined ? 0 : mid(n.fatG),
  };
}

/** `quantity` of a portion, as single numbers: the portion's own numbers times how many. */
export function macrosOfPortion(portion: Schemas['Portion'], quantity: number): Macros {
  return {
    kcal: Math.round(portion.kcal * quantity),
    protein: Math.round(portion.proteinG * quantity),
    carbs: Math.round(portion.carbsG * quantity),
    fat: Math.round(portion.fatG * quantity),
  };
}

/** "72 kcal", thousands grouped. */
export const kcalText = (kcal: number): string => t('food.single.kcal', { value: kcal.toLocaleString('en-US') });

/** "P 6 · C 0 · F 5". */
export const macroText = (m: Macros): string => t('food.single.macros', { protein: m.protein, carbs: m.carbs, fat: m.fat });

/** "72 kcal · P 6 · C 0 · F 5": a row's second line. */
export const numbersText = (m: Macros): string => t('food.single.line', { kcal: kcalText(m.kcal), macros: macroText(m) });

/** Spoken: the same in words a screen reader reads whole. */
export const numbersSpoken = (m: Macros): string => t('food.single.spoken', { kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat });

/** A range as the detail shows it: "66-80 kcal"; a range whose ends are the same number is that one number ("2,050 kcal", never "2,050-2,050"). */
export const rangeText = (range: Range, unit: string): string =>
  range.low === range.high
    ? `${range.low.toLocaleString('en-US')} ${unit}`
    : `${t('format.range', { low: range.low.toLocaleString('en-US'), high: range.high.toLocaleString('en-US') })} ${unit}`;
