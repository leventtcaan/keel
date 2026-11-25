/**
 * User-facing text lives in data/copy/<language>.json at the repository root, never in components (K2, ADR-010).
 * Components ask for a key: t('tabs.today'). copy-keys.test.ts fails if a used key is missing from en.json.
 * The language showing is the active one (locales.ts); a key it does not have yet is read from English (K-1211).
 */
import en from '../../../../data/copy/en.json';
import tr from '../../../../data/copy/tr.json';

import { formatPlain } from './format';
import { DEFAULT_LOCALE, type Locale, activeLocale } from './locales';
import { pluralCategory } from './plural';

type Json = { [key: string]: string | Json };

const COPY: Record<Locale, Json> = { en: en as Json, tr: tr as Json };

function lookup(tree: Json, path: string[]): string | undefined {
  const [head, ...rest] = path;
  const node = tree[head];
  if (node === undefined) return undefined;
  if (rest.length === 0) return typeof node === 'string' ? node : undefined;
  return typeof node === 'string' ? undefined : lookup(node, rest);
}

/** The languages to read, in order: the one showing, then English. */
const readingOrder = (): Locale[] => {
  const locale = activeLocale();
  return locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE];
};

/** A number goes in with the language's decimal mark (formatPlain); a string as it is. */
const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name];
    if (value === undefined || value === null) return `{${name}}`;
    return typeof value === 'number' ? formatPlain(value) : value;
  });

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const path = key.split('.');
  for (const locale of readingOrder()) {
    const template = lookup(COPY[locale], path);
    if (template !== undefined) return fill(template, vars);
  }
  // Visible in development so a missing key is noticed; the test catches it before merge.
  return `[missing: ${key}]`;
}

/**
 * A text that depends on a count: the keys `<key>.one` and `<key>.other` (and `.few`… where a language has them), the form
 * chosen by the language's plural rule (plural.ts). `{count}` is filled. Each language is read with its own rule, so a
 * key falling back to English keeps English's form.
 */
export function tp(key: string, count: number, vars: Record<string, string | number> = {}): string {
  for (const locale of readingOrder()) {
    const tree = COPY[locale];
    const template = lookup(tree, [...key.split('.'), pluralCategory(locale, count)]) ?? lookup(tree, [...key.split('.'), 'other']);
    if (template !== undefined) return fill(template, { count, ...vars });
  }
  return `[missing: ${key}]`;
}

/** Whether the copy has words under this key (a reason's words exist for some actions only, K-401). */
export function has(key: string): boolean {
  return readingOrder().some((locale) => lookup(COPY[locale], key.split('.')) !== undefined);
}
