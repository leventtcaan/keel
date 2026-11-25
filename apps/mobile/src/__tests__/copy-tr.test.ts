// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * The Turkish copy (K-1212, ADR-091): data/copy/tr.json and the Turkish store listing hold what English holds, and the
 * constitution holds in Turkish too. Every English key is there with the same placeholders and plural shape; a string left
 * in English is on the list or is language-neutral; U4 (no body-fat number), U6 (no medical language), U7 (no blame, no
 * compensation, no streak that resets), the person-name and quota-currency rules, and the share list scan the Turkish text
 * with their own Turkish phrase lists (data/copy/forbidden-phrases.tr.json, share-forbidden.tr.json); each pattern proves
 * itself on its examples first. The word budgets are in copy-budget.test.ts, the dashes in copy-dashes.test.ts.
 */
import * as fs from 'fs';
import * as path from 'path';

import { tp } from '@/copy';
import { DEFAULT_LOCALE, setActiveLocale } from '@/copy/locales';

import en from '../../../../data/copy/en.json';
import forbiddenEn from '../../../../data/copy/forbidden-phrases.json';
import forbidden from '../../../../data/copy/forbidden-phrases.tr.json';
import intentional from '../../../../data/copy/tr-intentionally-english.json';
import shareForbidden from '../../../../data/copy/share-forbidden.tr.json';
import storeEn from '../../../../data/copy/store.en.json';
import store from '../../../../data/copy/store.tr.json';
import tr from '../../../../data/copy/tr.json';
import budgets from '../../../../data/copy/word-budgets.json';

import { localeBudget, wordsOf } from './support/copyBudget';

type Json = { [key: string]: string | Json };
type Rule = { id: string; rule?: string; source: string; pattern: string; examples: string[]; nonExamples: string[] };

const ROOT = path.resolve(__dirname, '../../../..');

function strings(tree: Json, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([k, v]): [string, string][] => (typeof v === 'string' ? [[`${prefix}${k}`, v]] : strings(v, `${prefix}${k}.`)));
}

const english = new Map(strings(en as Json));
const turkish = new Map(strings(tr as Json));
const regex = (rule: { pattern: string }) => new RegExp(rule.pattern, 'iu');
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => setActiveLocale(DEFAULT_LOCALE));

describe('tr.json against en.json', () => {
  test('has every English key and no other', () => {
    expect([...english.keys()].filter((key) => !turkish.has(key))).toEqual([]);
    expect([...turkish.keys()].filter((key) => !english.has(key))).toEqual([]);
  });

  test('every text is written: none empty', () => {
    expect([...turkish].filter(([, text]) => text.trim() === '').map(([key]) => key)).toEqual([]);
  });

  test('every key has the placeholders of its English text, the same ones the same number of times', () => {
    const wrong = [...english].filter(([key, text]) => JSON.stringify(placeholders(text)) !== JSON.stringify(placeholders(turkish.get(key) ?? ''))).map(([key]) => key);
    expect(wrong).toEqual([]);
  });

  test('a text kept in English is on the list, or says nothing in a language (symbols, numbers, units, placeholders)', () => {
    const listed = new Set(intentional.keys);
    const exercise = new RegExp(intentional.exercisePattern);
    const neutral = (text: string) => !/\p{L}{3,}/u.test(text.replace(/\{\w+\}/g, '').replace(/\b(kg|lb|kcal|cm|ft|PR|RIR|RPE|e1RM)\b/g, ''));
    const same = [...english].filter(([key, text]) => text === turkish.get(key) && !neutral(text) && !listed.has(key) && !exercise.test(key));
    expect(same.map(([key]) => key)).toEqual([]);
  });

  test('a minute is "dk" in Turkish: no English "min" outside a placeholder', () => {
    const english = [...turkish].filter(([, text]) => /\bmin\b/.test(text.replace(/\{\w+\}/g, ''))).map(([key]) => key);
    expect(english).toEqual([]);
  });

  test('the list holds only keys that exist and are still English', () => {
    expect(intentional.keys.filter((key) => !english.has(key) || english.get(key) !== turkish.get(key))).toEqual([]);
    expect(new Set(intentional.keys).size).toBe(intentional.keys.length);
  });

  test('plural shape: each counted text has the forms English has, and only zero, one and other, and tp() finds one for any count', () => {
    const bases = [...english.keys()].filter((key) => key.endsWith('.one')).map((key) => key.slice(0, -4));
    expect(bases.length).toBeGreaterThan(20);
    for (const base of bases) {
      const forms = [...turkish.keys()].filter((key) => key.startsWith(`${base}.`) && /^(zero|one|two|few|many|other)$/.test(key.slice(base.length + 1))).map((key) => key.slice(base.length + 1));
      const formsEn = [...english.keys()].filter((key) => key.startsWith(`${base}.`) && /^(zero|one|two|few|many|other)$/.test(key.slice(base.length + 1))).map((key) => key.slice(base.length + 1));
      expect({ base, forms: forms.sort() }).toEqual({ base, forms: formsEn.sort() });
      // Turkish has CLDR's one and other; a zero form is the English file's own (the app asks for it by name), kept as it is.
      expect(forms.every((form) => form === 'zero' || form === 'one' || form === 'other')).toBe(true);
    }
    // A base that English itself cannot answer for every count (today.checkIn has "one" beside other keys) is not a counted text.
    const gaps = (locale: 'en' | 'tr') => {
      setActiveLocale(locale);
      return bases.flatMap((base) => [0, 1, 2, 5, 21].filter((n) => tp(base, n, { count: n }).startsWith('[missing')).map((n) => `${base} ${n}`));
    };
    const englishGaps = new Set(gaps('en'));
    const missing = gaps('tr').filter((gap) => !englishGaps.has(gap));
    expect(missing).toEqual([]);
  });

  test('speaks to one person, "sen": no formal "siz" forms; and no exclamation mark', () => {
    const formal = /(?<!\p{L})(siz|sizi|size|sizin|sizden|sizce|sizinle)(?!\p{L})/iu;
    expect([...turkish].filter(([, text]) => formal.test(text.replace(/\{\w+\}/g, '')) || text.includes('!')).map(([key]) => key)).toEqual([]);
  });

  test('the iOS permission texts hold no quote or line break (the .strings file is written without escaping)', () => {
    const permissions = [...turkish].filter(([key]) => key.startsWith('permissions.'));
    expect(permissions).toHaveLength(4);
    expect(permissions.filter(([, text]) => /["\\\n]/.test(text)).map(([key]) => key)).toEqual([]);
  });

  test('the engine\'s short reasons stay within the English limit x the Turkish factor', () => {
    const limit = localeBudget(budgets.ruleShortMaxWords, budgets.localeBudgetFactor.tr);
    const lines = [...turkish].filter(([key]) => key.startsWith('decision.ruleShort.'));
    expect(lines.length).toBeGreaterThan(40);
    expect(lines.filter(([, text]) => wordsOf(text) > limit).map(([key, text]) => `${key}: ${wordsOf(text)}`)).toEqual([]);
  });
});

describe('Turkish phrase lists (U4, U6, U7)', () => {
  test('the list has rules for U4, U6 and U7', () => {
    expect(new Set((forbidden.rules as Rule[]).map((r) => r.rule))).toEqual(new Set(['U4', 'U6', 'U7']));
  });

  describe.each((forbidden.rules as Rule[]).map((r) => [r.id, r] as const))('rule %s', (_, rule) => {
    test.each(rule.examples)('catches "%s"', (example) => {
      expect(example).toMatch(regex(rule));
    });

    test.each(rule.nonExamples)('lets "%s" through', (text) => {
      expect(text).not.toMatch(regex(rule));
    });

    test('points at its rule in the constitution', () => {
      const [file, anchor] = rule.source.split('#');
      expect(anchor).toBe(rule.rule);
      expect(fs.readFileSync(path.join(ROOT, file), 'utf8')).toContain(`**${anchor} ·`);
    });
  });

  test.each(forbidden.coachingNonExamples)('no rule catches ordinary coaching copy: "%s"', (text) => {
    expect((forbidden.rules as Rule[]).filter((rule) => regex(rule).test(text)).map((rule) => rule.id)).toEqual([]);
  });

  const offenders = (all: Iterable<[string, string]>, rules: Rule[]) =>
    [...all].flatMap(([key, text]) => rules.filter((rule) => regex(rule).test(text)).map((rule) => `${key} (${rule.id}): ${text.match(regex(rule))?.[0]}`));

  test('no string in tr.json contains a forbidden phrase', () => {
    expect(offenders(turkish, forbidden.rules as Rule[])).toEqual([]);
  });

  test('the scan reads every string in tr.json', () => {
    expect([...turkish.keys()]).toContain('decision.hard_stop.low_energy_safety.body');
    expect(turkish.size).toBe(english.size);
  });

  test('no string in tr.json names a person (K-523) or speaks of credits or coins (K-508)', () => {
    const names = forbiddenEn.personNames;
    const named = [...turkish].filter(([, text]) => (text.match(new RegExp(names.pattern, 'g')) ?? []).length > 0).map(([key]) => key);
    const quota = [...turkish].filter(([, text]) => new RegExp(forbiddenEn.quotaWords.pattern, 'gi').test(text)).map(([key]) => key);
    expect([...named, ...quota]).toEqual([]);
  });

  describe('share cards', () => {
    const rules = shareForbidden.rules as Rule[];
    test.each(rules.flatMap((r) => r.examples.map((e) => [r.id, e] as const)))('%s catches "%s"', (_, example) => {
      expect(rules.some((r) => regex(r).test(example))).toBe(true);
    });

    test.each(rules.flatMap((r) => r.nonExamples.map((e) => [r.id, e] as const)))('%s lets "%s" through', (id, text) => {
      expect(rules.filter((r) => regex(r).test(text)).map((r) => r.id)).not.toContain(id);
    });

    test('every share text and every call-sharing text is clean, with the main list too', () => {
      const share = [...turkish].filter(([key]) => key.startsWith('share.'));
      expect(share.length).toBeGreaterThan(30);
      expect(offenders(share, [...rules, ...(forbidden.rules as Rule[])])).toEqual([]);
    });
  });
});

describe('Turkish store listing (K-1212)', () => {
  const sub = (period: 'monthly' | 'yearly') => store.subscriptions[period];
  const texts: (readonly [string, string])[] = [
    ['name', store.name],
    ['subtitle', store.subtitle],
    ['promotionalText', store.promotionalText],
    ['description', store.description],
    ['keywords', store.keywords],
    ['subscriptionGroup.name', store.subscriptionGroup.name],
    ['subscriptions.monthly.name', sub('monthly').name],
    ['subscriptions.monthly.description', sub('monthly').description],
    ['subscriptions.yearly.name', sub('yearly').name],
    ['subscriptions.yearly.description', sub('yearly').description],
  ];
  const chars = (text: string) => [...text].length;

  test.each(texts)('%s is written', (_, text) => {
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test.each(texts)('%s carries no forbidden phrase, no person, no credit or coin word', (_, text) => {
    expect((forbidden.rules as Rule[]).filter((rule) => regex(rule).test(text)).map((rule) => `${rule.id}: ${text.match(regex(rule))?.[0]}`)).toEqual([]);
    expect(text.match(new RegExp(forbiddenEn.personNames.pattern, 'g'))).toBeNull();
    expect(text.match(new RegExp(forbiddenEn.quotaWords.pattern, 'gi'))).toBeNull();
  });

  test("the limits are Apple's, the same as the English listing's", () => {
    expect(store.limits).toEqual(storeEn.limits);
  });

  test("each fits Apple's limit: characters, and bytes for the keywords (a Turkish letter can take two)", () => {
    expect(chars(store.name)).toBeGreaterThanOrEqual(2);
    expect(chars(store.name)).toBeLessThanOrEqual(store.limits.name);
    expect(chars(store.subtitle)).toBeLessThanOrEqual(store.limits.subtitle);
    expect(chars(store.promotionalText)).toBeLessThanOrEqual(store.limits.promotionalText);
    expect(chars(store.description)).toBeLessThanOrEqual(store.limits.description);
    expect(Buffer.byteLength(store.keywords, 'utf8')).toBeLessThanOrEqual(store.limits.keywordsBytes);
    expect(chars(store.subscriptionGroup.name)).toBeLessThanOrEqual(store.limits.subscriptionName);
    for (const period of ['monthly', 'yearly'] as const) {
      expect(chars(sub(period).name)).toBeLessThanOrEqual(store.limits.subscriptionName);
      expect(chars(sub(period).description)).toBeLessThanOrEqual(store.limits.subscriptionDescription);
    }
  });

  test('the same fields as the English listing, and the same settings (addresses, categories, ids, copyright)', () => {
    expect(Object.keys(store).sort()).toEqual(Object.keys(storeEn).sort());
    for (const key of ['supportUrl', 'privacyUrl', 'termsUrl', 'primaryCategory', 'secondaryCategory', 'copyright'] as const) expect(store[key]).toBe(storeEn[key]);
    expect(store.subscriptionGroup.name).toBe('Next Call');
    for (const period of ['monthly', 'yearly'] as const) expect(sub(period).productId).toBe(storeEn.subscriptions[period].productId);
  });

  test('the name is the product name with the words that say what it is', () => {
    expect(store.name.startsWith('Next Call: ')).toBe(true);
  });

  describe('keywords: no space after a comma, no repeats, one word each, none from the name or the subtitle', () => {
    const list = store.keywords.split(',');
    const words = (text: string) => text.toLocaleLowerCase('tr').match(/[a-zçğıöşü0-9]+/g) ?? [];

    test('comma separated, none empty, none shorter than three letters, one word each', () => {
      expect(store.keywords).not.toMatch(/\s/);
      expect(list.filter((word) => [...word].length <= 2 || !/^[a-zçğıöşü0-9]+$/.test(word))).toEqual([]);
    });

    test('none repeats another, or a word of the name or the subtitle', () => {
      expect(new Set(list).size).toBe(list.length);
      const indexed = new Set([...words(store.name), ...words(store.subtitle)]);
      expect(list.filter((word) => indexed.has(word))).toEqual([]);
    });
  });

  describe('the listing says only what is in the launch build (ADR-080 #4: the AI layer is off) and promises nothing', () => {
    const notYet = /(?<!\p{L})(yapay\s+zek[aâ]\p{L}*|sohbet\s+bot\p{L}*|chat\s*bot\p{L}*|gpt|llm|dil\s+model\p{L}*|(öğün|yemek)\s+fotoğraf\p{L}*\s+(oku|tahmin|analiz)\p{L}*|fotoğraftan\s+(oku|tahmin|analiz)\p{L}*)(?!\p{L})/iu;
    const promise = /(?<!\p{L})(garanti\p{L}*|kanıtlanmış|klinik\p{L}*|mucize\p{L}*|zahmetsiz\p{L}*|kolayca\s+kilo|yağ\s+yak\p{L}*|\d+\s*kilo\s+ver\p{L}*|kilo\s+ver\p{L}*\s+garanti)(?!\p{L})/iu;

    test.each(texts)('%s does not advertise what is switched off, and promises nothing', (_, text) => {
      expect(text.match(notYet)).toBeNull();
      expect(text.match(promise)).toBeNull();
    });

    test.each(['Yapay zeka koçu', 'Sohbet botu yanıtları', 'Öğün fotoğrafı okuma', 'dil modeli karar verir'])('catches "%s"', (example) => {
      expect(example).toMatch(notYet);
    });

    test.each(['Aynı şekilde söylenir', 'Neden diye sor', 'Hava, hat ve saat'])('lets "%s" through', (text) => {
      expect(text).not.toMatch(notYet);
    });

    test.each(['Garantili sonuç', '10 kilo ver', 'tedavi eder'])('promise: catches "%s"', (example) => {
      expect(example).toMatch(new RegExp(`${promise.source}|${forbidden.rules.find((r) => r.id === 'treatment-claims')?.pattern}`, 'iu'));
    });
  });

  describe('the subscription terms an auto-renewing subscription must show (App Review 3.1.2), in Turkish', () => {
    const description = store.description;

    test('it renews by itself, unless cancelled 24 hours before the period ends', () => {
      expect(description).toMatch(/otomatik olarak yenilenir/i);
      expect(description).toMatch(/en az 24 saat önce/i);
    });

    test('how it is charged, where to manage or cancel, and that the price is in the app', () => {
      expect(description).toMatch(/Abonelikler/);
      expect(description).toMatch(/Apple Hesabına yansıtılır/i);
      expect(description).toMatch(/uygulamada gösterilir/i);
    });

    test('the free trial is named, as App Store Connect has it (ADR-071: 2 weeks)', () => {
      expect(description).toMatch(/2 haftalık ücretsiz deneme/i);
    });

    test('it links the Terms of Use and the Privacy Policy, the same pages as the English listing', () => {
      expect(description).toContain(store.termsUrl);
      expect(description).toContain(store.privacyUrl);
    });

    test('a plan says what it is, not a price (ADR-012: prices live in App Store Connect, K2)', () => {
      for (const period of ['monthly', 'yearly'] as const) expect(`${sub(period).name} ${sub(period).description}`).not.toMatch(/[$€£₺]|\d/);
    });
  });
});
