/**
 * Numbers, dates and times, in the language showing (K-1211). The one place the app formats for people: nothing else names
 * a locale (no-fixed-locale.test.ts), so a language picked in Settings changes "1,234.5" to "1.234,5" everywhere.
 * Formatters are made once per language and options.
 */
import { activeLocale } from './locales';

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function formatter<T extends Intl.NumberFormat | Intl.DateTimeFormat>(kind: 'n' | 'd', make: (locale: string) => T, options: object | undefined): T {
  const locale = activeLocale();
  const id = `${kind}|${locale}|${JSON.stringify(options ?? {})}`;
  let found = cache.get(id);
  if (found === undefined) {
    found = make(locale);
    cache.set(id, found);
  }
  return found as T;
}

export const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string =>
  formatter('n', (locale) => new Intl.NumberFormat(locale, options), options).format(value);

export const formatDate = (value: Date, options: Intl.DateTimeFormatOptions): string =>
  formatter('d', (locale) => new Intl.DateTimeFormat(locale, options), options).format(value);

/** Hour and minute as the language writes them (3:05 PM, 15:05). */
export const formatTime = (value: Date, options: Intl.DateTimeFormatOptions = {}): string =>
  formatDate(value, { hour: 'numeric', minute: '2-digit', ...options });
