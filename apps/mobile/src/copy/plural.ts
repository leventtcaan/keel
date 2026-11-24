/**
 * Plural categories (K-1211). Intl.PluralRules decides where the engine has it; Hermes's Intl documentation
 * (facebook/hermes doc/IntlAPIs.md) lists Collator, NumberFormat and DateTimeFormat but not PluralRules, so there is a table
 * of the CLDR rules for the supported languages behind it. English and Turkish agree: "one" for exactly 1 (CLDR plural
 * rules, en: i = 1 and v = 0; tr: n = 1), "other" for the rest.
 */
import type { Locale } from './locales';

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

const RULES: Record<Locale, (n: number) => PluralCategory> = {
  en: (n) => (n === 1 ? 'one' : 'other'),
  tr: (n) => (n === 1 ? 'one' : 'other'),
};

/** The table's answer. */
export const cldrCategory = (locale: Locale, n: number): PluralCategory => RULES[locale](n);

/** The engine's answer when it has Intl.PluralRules and knows the language; the table's otherwise. */
export function pluralCategory(locale: Locale, n: number): PluralCategory {
  if (typeof Intl !== 'undefined' && typeof Intl.PluralRules === 'function') {
    try {
      return new Intl.PluralRules(locale).select(n);
    } catch {
      // An engine that has the constructor but not this language: the table below.
    }
  }
  return cldrCategory(locale, n);
}
