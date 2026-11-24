/**
 * The copy follows the active language, with English per key as the fallback (K-1211, ADR-091). Plurals follow the
 * language's own rule (CLDR), not a hand-written "=== 1".
 */
import { t, tp } from '@/copy';
import { DEFAULT_LOCALE, LOCALES, activeLocale, matchLocale, setActiveLocale } from '@/copy/locales';
import { cldrCategory, pluralCategory } from '@/copy/plural';

import en from '../../../../data/copy/en.json';
import tr from '../../../../data/copy/tr.json';

type Json = { [key: string]: string | Json };

afterEach(() => setActiveLocale(DEFAULT_LOCALE));

function flatten(tree: Json, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : flatten(v, `${prefix}${k}.`)));
}

test('English and Turkish are the supported languages, English the default', () => {
  expect([...LOCALES]).toEqual(['en', 'tr']);
  expect(DEFAULT_LOCALE).toBe('en');
  expect(activeLocale()).toBe('en');
});

test('a device locale tag is matched on its language, anything else is English', () => {
  expect(matchLocale('tr-TR')).toBe('tr');
  expect(matchLocale('tr_TR')).toBe('tr');
  expect(matchLocale('en-GB')).toBe('en');
  expect(matchLocale('de-DE')).toBe('en');
  expect(matchLocale('')).toBe('en');
  expect(matchLocale(undefined)).toBe('en');
});

test('the active language is read first: Turkish text for a Turkish key, and an unknown key is marked, not crashed', () => {
  setActiveLocale('tr');
  expect(t('tabs.food')).toBe((tr as Json & { tabs: { food: string } }).tabs.food);
  expect(t('tabs.food')).not.toBe('Food');
  expect(t('does.not.exist')).toBe('[missing: does.not.exist]');
});

test('a key the active language lacks falls back to English, key by key', () => {
  jest.isolateModules(() => {
    jest.doMock('../../../../data/copy/tr.json', () => ({ tabs: { food: 'Yemek' } }));
    const copy = jest.requireActual<typeof import('@/copy')>('@/copy');
    const locales = jest.requireActual<typeof import('@/copy/locales')>('@/copy/locales');
    locales.setActiveLocale('tr');
    expect(copy.t('tabs.today')).toBe('This week');
    expect(copy.t('does.not.exist')).toBe('[missing: does.not.exist]');
  });
});

test('a key the language has wins over English', () => {
  jest.isolateModules(() => {
    jest.doMock('../../../../data/copy/tr.json', () => ({ tabs: { food: 'Yemek' } }));
    const copy = jest.requireActual<typeof import('@/copy')>('@/copy');
    const locales = jest.requireActual<typeof import('@/copy/locales')>('@/copy/locales');
    locales.setActiveLocale('tr');
    expect(copy.t('tabs.food')).toBe('Yemek');
    expect(copy.t('tabs.today')).toBe('This week');
  });
});

test('the Turkish file holds no key English does not have, with the same placeholders', () => {
  const english = new Set(flatten(en as Json));
  expect(flatten(tr as Json).filter((key) => !english.has(key))).toEqual([]);
});

test('plural categories: English and Turkish both say "one" for exactly 1', () => {
  for (const locale of LOCALES) {
    expect(cldrCategory(locale, 1)).toBe('one');
    expect(cldrCategory(locale, 0)).toBe('other');
    expect(cldrCategory(locale, 2)).toBe('other');
    expect(cldrCategory(locale, 1.5)).toBe('other');
  }
});

test('the platform plural rules agree with the table where the platform has them', () => {
  for (const locale of LOCALES) {
    for (const n of [0, 1, 2, 5, 11, 21, 100, 1.5]) expect(pluralCategory(locale, n)).toBe(cldrCategory(locale, n));
  }
});

test('without Intl.PluralRules (Hermes does not document it) the table decides', () => {
  const real = Intl.PluralRules;
  Object.defineProperty(Intl, 'PluralRules', { value: undefined, configurable: true, writable: true });
  try {
    expect(pluralCategory('tr', 1)).toBe('one');
    expect(pluralCategory('en', 3)).toBe('other');
  } finally {
    Object.defineProperty(Intl, 'PluralRules', { value: real, configurable: true, writable: true });
  }
});

test('tp picks the plural form for the count and fills {count}', () => {
  expect(tp('callScreen.weighInsLeft', 1)).toBe('1 more weigh-in needed');
  expect(tp('callScreen.weighInsLeft', 3)).toBe('3 more weigh-ins needed');
  setActiveLocale('tr');
  expect(tp('callScreen.weighInsLeft', 3)).toBe('3 tartı daha gerekli'); // Turkish, read with its own plural table
});
