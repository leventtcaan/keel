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

/**
 * A decimal as a person reads it, in the language's mark ("82,5" in Turkish): at most `decimals` of them, a trailing zero kept only
 * with `fixed` ("82,0"), and no thousands mark unless `grouping` (a weight or a load is never a thousand; a field reads it back).
 * What the code compares or parses (weightInput, loadText) is not this: it stays a plain "82.5".
 */
export const formatDecimal = (value: number, decimals: number, { fixed = false, grouping = false }: { fixed?: boolean; grouping?: boolean } = {}): string =>
  formatNumber(value, { useGrouping: grouping, minimumFractionDigits: fixed ? decimals : 0, maximumFractionDigits: decimals });

/** A number put into copy as it is: the language's decimal mark, every digit it has, no thousands mark (a year stays "2026"). */
export const formatPlain = (value: number): string =>
  Number.isFinite(value) ? formatNumber(value, { useGrouping: false, maximumFractionDigits: 20 }) : String(value);

export const formatDate = (value: Date, options: Intl.DateTimeFormatOptions): string =>
  formatter('d', (locale) => new Intl.DateTimeFormat(locale, options), options).format(value);

/** Hour and minute as the language writes them (3:05 PM, 15:05). */
export const formatTime = (value: Date, options: Intl.DateTimeFormatOptions = {}): string =>
  formatDate(value, { hour: 'numeric', minute: '2-digit', ...options });
