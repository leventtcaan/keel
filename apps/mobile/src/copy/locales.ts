/**
 * The languages the app is written in (K-1211, ADR-091) and the one showing now. The copy files are data/copy/<lang>.json;
 * English is the default and the fallback for any key a language does not have yet. The active language lives here, as
 * plain state, because t() and the number and date helpers are plain functions called from anywhere (not hooks);
 * language.ts decides it, from the phone or from the person's choice.
 */
export const LOCALES = ['en', 'tr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** What the person picks in Settings: a language, or "System" (the phone's). */
export type Language = 'system' | Locale;
export const LANGUAGES: readonly Language[] = ['system', ...LOCALES];
export const isLanguage = (value: string | null): value is Language => value !== null && (LANGUAGES as readonly string[]).includes(value);

/** The supported language a BCP 47 tag ("tr-TR", "tr_TR", "en-GB") asks for; English for any other. */
export function matchLocale(tag: string | undefined): Locale {
  const language = (tag ?? '').split(/[-_]/)[0].toLowerCase();
  return LOCALES.find((locale) => locale === language) ?? DEFAULT_LOCALE;
}

let active: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export const activeLocale = (): Locale => active;

export function setActiveLocale(next: Locale): void {
  if (next === active) return;
  active = next;
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
