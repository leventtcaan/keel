// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * No user-facing text breaks U4 (no body-fat number) or U6 (no medical language). The phrase list is data
 * (data/copy/forbidden-phrases.json, K2); every pattern proves itself against its examples before it is trusted.
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '../../../../data/copy/en.json';
import forbidden from '../../../../data/copy/forbidden-phrases.json';
import store from '../../../../data/copy/store.en.json';

type Json = { [key: string]: string | Json };
type Rule = (typeof forbidden.rules)[number];

const ROOT = path.resolve(__dirname, '../../../..');

function strings(tree: Json, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([k, v]): [string, string][] =>
    typeof v === 'string' ? [[`${prefix}${k}`, v]] : strings(v, `${prefix}${k}.`),
  );
}

const regex = (rule: Rule) => new RegExp(rule.pattern, 'i');

test('the list has rules for both U4 and U6', () => {
  expect(new Set(forbidden.rules.map((r) => r.rule))).toEqual(new Set(['U4', 'U6']));
});

describe.each(forbidden.rules.map((r) => [r.id, r] as const))('rule %s', (_, rule) => {
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
  expect(forbidden.rules.filter((rule) => regex(rule).test(text)).map((rule) => rule.id)).toEqual([]);
});

test('no string in en.json contains a forbidden phrase', () => {
  const offenders = strings(en as Json).flatMap(([key, text]) =>
    forbidden.rules
      .filter((rule) => regex(rule).test(text))
      .map((rule) => `${key} (${rule.rule} ${rule.id}): ${text.match(regex(rule))?.[0]}`),
  );
  expect(offenders).toEqual([]);
});

test('the scan reads every string in en.json', () => {
  // Guards the walker: if it stopped descending into nested keys, the scan above would pass on nothing.
  const keys = strings(en as Json).map(([key]) => key);
  expect(keys).toContain('tabs.today');
  expect(keys).toContain('decision.hard_stop.low_energy_safety.body');
});

describe('legal texts (K-801, ADR-060)', () => {
  // The published site (docs/yasal/site): every page and the config whose values the pages show. A health notice must say
  // what the app does not do, so only the sentences in legalNegations — each a negation of the very phrase a rule catches,
  // each standing in a page — are taken out before the same rules run. Emphasis and tags are dropped first, so markup
  // can't split a word the rules would catch.
  const dir = path.join(ROOT, 'docs/yasal/site');
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) return walk(full);
      return /\.(md|html|ya?ml)$/.test(entry.name) ? [full] : [];
    });
  const plain = (text: string) =>
    text
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z]+;|&#\d+;/g, '')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ');
  // The controller's name, the law asks for, stands only in _config.yml's controller_name (ADR-060 #6, ADR-059 Ek 1): that one
  // line is taken out before anything is read, while its underscores are still there to find it.
  const withoutController = (text: string) => text.replace(/^controller_name:.*$/m, '');
  const pages = walk(dir).map((file) => [path.relative(dir, file), plain(withoutController(fs.readFileSync(file, 'utf8')))] as const);
  const negations = (forbidden as { legalNegations?: string[] }).legalNegations ?? [];

  test('reads every page and the config', () => {
    expect(pages.map(([name]) => name).sort()).toEqual(['_config.yml', 'health.md', 'index.md', 'privacy.md', 'terms.md']);
  });

  test.each(negations)('"%s" negates what the rules catch, and stands in a page', (sentence) => {
    const hits = forbidden.rules.flatMap((rule) => [...sentence.matchAll(new RegExp(rule.pattern, 'gi'))]);
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      // The negation governs the hit: it stands before it in the same clause.
      const clause = sentence.slice(0, hit.index).split(/[.;:!?]/).pop() ?? '';
      expect(clause).toMatch(/\b(not|never|no)\b(?!\s+only)/i);
    }
    expect(pages.some(([, text]) => text.includes(sentence))).toBe(true);
  });

  test('the negations are listed once each', () => {
    expect(new Set(negations).size).toBe(negations.length);
  });

  test('no page contains a forbidden phrase outside those sentences', () => {
    const offenders = pages.flatMap(([name, text]) => {
      const rest = negations.reduce((t, sentence) => t.split(sentence).join(' '), text);
      return forbidden.rules
        .filter((rule) => regex(rule).test(rest))
        .map((rule) => `${name} (${rule.rule} ${rule.id}): ${rest.match(regex(rule))?.[0]}`);
    });
    expect(offenders).toEqual([]);
  });

  test('no page names a person (K-523)', () => {
    const names = forbidden.personNames;
    const offenders = pages.flatMap(([name, text]) => (text.match(new RegExp(names.pattern, 'g')) ?? []).map((m) => `${name}: ${m}`));
    expect(offenders).toEqual([]);
  });

  test('only the controller_name line is taken out', () => {
    const config = 'title: Legal\ncontroller_name: "Levent X"\nnote: Levent\n';
    expect(withoutController(config)).not.toContain('Levent X');
    expect(plain(withoutController(config))).toMatch(new RegExp(forbidden.personNames.pattern));
  });
});

describe('store texts (K-804, K-1002, K-1003, ADR-061, ADR-080)', () => {
  // The App Store listing is product text too: the same rules as en.json, no exception for negations (a listing has no
  // reason to name what the app is not), no person, and Apple's lengths. Its settings (addresses, categories, product ids)
  // are checked for what they must equal, not scanned as words.
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
  const settings = ['supportUrl', 'privacyUrl', 'termsUrl', 'primaryCategory', 'secondaryCategory', 'copyright'];
  const chars = (text: string) => [...text].length;
  const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  test.each(texts)('%s is written', (_, text) => {
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test.each(texts)('%s carries no forbidden phrase', (_, text) => {
    expect(forbidden.rules.filter((rule) => regex(rule).test(text)).map((rule) => `${rule.id}: ${text.match(regex(rule))?.[0]}`)).toEqual(
      [],
    );
  });

  test.each(texts)('%s names no person', (_, text) => {
    expect(text.match(new RegExp(forbidden.personNames.pattern, 'g'))).toBeNull();
  });

  test("the limits are Apple's, not numbers to tune", () => {
    // External facts (limits._source); a limit raised in the file would let any text through.
    expect(store.limits).toEqual({
      _source: store.limits._source,
      name: 30,
      subtitle: 30,
      promotionalText: 170,
      description: 4000,
      keywordsBytes: 100,
      subscriptionName: 30,
      subscriptionDescription: 45,
    });
  });

  test.each(texts)('%s puts no currency on the daily limit (ADR-012)', (_, text) => {
    expect(text.match(new RegExp(forbidden.quotaWords.pattern, 'gi'))).toBeNull();
  });

  test("each fits Apple's limit: characters, and bytes for the keywords", () => {
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

  test('every field of the file is scanned or checked', () => {
    // A field added to the listing (whatsNew, a keyword list) is scanned too, or this fails.
    const scanned = ['name', 'subtitle', 'promotionalText', 'description', 'keywords', 'subscriptionGroup', 'subscriptions'];
    expect(Object.keys(store).filter((key) => !key.startsWith('_') && key !== 'limits').sort()).toEqual([...scanned, ...settings].sort());
    expect(Object.keys(store.subscriptions).sort()).toEqual(['monthly', 'yearly']);
  });

  test('the name is the product name with the two words that say what it is (ADR-080 Ek 2, 05 §6.6)', () => {
    expect(store.name).toBe('Next Call: Lift & Diet Coach');
  });

  describe('keywords (05 §3.2: no space after a comma, no repeats, one word each)', () => {
    const list = store.keywords.split(',');

    test('comma separated, no space around a comma, none empty', () => {
      expect(store.keywords).not.toMatch(/\s/);
      expect(list.every((word) => word.length > 0)).toBe(true);
    });

    test("each is longer than two characters (Apple's rule) and is a single word", () => {
      expect(list.filter((word) => word.length <= 2 || !/^[a-z0-9]+$/.test(word))).toEqual([]);
    });

    test('none repeats another, or a word of the name or the subtitle', () => {
      expect(new Set(list).size).toBe(list.length);
      const indexed = new Set([...words(store.name), ...words(store.subtitle)]);
      expect(list.filter((word) => indexed.has(word))).toEqual([]);
    });
  });

  describe('the listing says only what is in the launch build (ADR-080 #4: the AI layer is off)', () => {
    // The coach explains from the rules and the meal photo read is not offered at launch: neither is advertised until
    // the build has it (App Review 2.3.1, no hidden or dormant features; accurate metadata). Edited with the ADR that turns AI on.
    const notYet = /\b(ai|a\.i\.|artificial intelligence|chat ?bots?|gpt|llm|language model)\b|photo (estimate|analysis|scan)|meal photos?|snap a (meal|photo)/i;

    test.each(texts)('%s does not advertise what is switched off', (_, text) => {
      expect(text.match(notYet)).toBeNull();
    });

    test.each(['AI coach', 'Chatbot answers', 'Photo estimates of a meal', 'a language model decides'])('catches "%s"', (example) => {
      expect(example).toMatch(notYet);
    });

    test.each(['Said the same way', 'Ask why', 'Hair, air and a chair'])('lets "%s" through', (text) => {
      expect(text).not.toMatch(notYet);
    });
  });

  describe('no promise about results or about health (05 §6.7, U6)', () => {
    const promise = /\b(guarantee\w*|proven|clinically|cures?|cured|treat(s|ment)?|diagnos\w*|prevent\w*|miracle|effortless|lose \d+|burn fat)\b/i;

    test.each(texts)('%s promises nothing', (_, text) => {
      expect(text.match(promise)).toBeNull();
    });

    test.each(['Guaranteed results', 'Lose 10 pounds', 'it can cure', 'burn fat fast'])('catches "%s"', (example) => {
      expect(example).toMatch(promise);
    });
  });

  describe('the subscription terms an auto-renewing subscription must show (App Review 3.1.2)', () => {
    const description = store.description;

    test('it renews by itself, unless cancelled 24 hours before the period ends', () => {
      expect(description).toMatch(/renews automatically/i);
      expect(description).toMatch(/at least 24 hours before/i);
    });

    test('how it is charged, where to manage or cancel, and that the price is in the app', () => {
      expect(description).toMatch(/Subscriptions/);
      expect(description).toMatch(/charged to your Apple Account/i);
      expect(description).toMatch(/shown in the app before you subscribe/i);
    });

    test('the free trial is named, as App Store Connect has it (ADR-071: 2 weeks)', () => {
      expect(description).toMatch(/2-week free trial/i);
    });

    test('it links the Terms of Use and the Privacy Policy, the same pages the paywall opens', () => {
      const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/mobile/eas.json'), 'utf8')).build.production.env;
      expect(store.termsUrl).toBe(eas.EXPO_PUBLIC_TERMS_URL);
      expect(store.privacyUrl).toBe(eas.EXPO_PUBLIC_PRIVACY_URL);
      expect(description).toContain(store.termsUrl);
      expect(description).toContain(store.privacyUrl);
    });

    test('the plans have the names and ids of ADR-080 Ek 2', () => {
      expect(store.subscriptionGroup.name).toBe('Next Call');
      expect(sub('monthly').productId).toBe('nextcall.premium.monthly');
      expect(sub('yearly').productId).toBe('nextcall.premium.yearly');
    });

    test('a plan says what it is, not a price (ADR-012: prices live in App Store Connect, K2)', () => {
      for (const period of ['monthly', 'yearly'] as const) {
        expect(`${sub(period).name} ${sub(period).description}`).not.toMatch(/[$€£]|\d/);
      }
    });
  });

  describe('settings', () => {
    test('the addresses are the published legal site', () => {
      for (const url of [store.supportUrl, store.privacyUrl, store.termsUrl]) expect(url).toMatch(/^https:\/\/leventtcaan\.github\.io\/keel\//);
    });

    test("the categories are Apple's", () => {
      expect(store.primaryCategory).toBe('Health & Fitness');
      expect(['Food & Drink', 'Sports', 'Lifestyle']).toContain(store.secondaryCategory);
    });

    test('the copyright holder is the controller of the legal config, not a name typed here (ADR-059 Ek 1)', () => {
      expect(store.copyright).toBe('2026 {controller_name}');
      const config = fs.readFileSync(path.join(ROOT, 'docs/yasal/site/_config.yml'), 'utf8');
      expect(config).toMatch(/^controller_name: ".+"$/m);
    });
  });
});

describe('person names (K-523, ADR-041 #72)', () => {
  const names = forbidden.personNames;
  // Case is in the pattern itself (no 'i'), as the backend reads it too.
  const found = (text: string) => text.replace(new RegExp(names.researchPath, 'g'), '').match(new RegExp(names.pattern, 'g')) ?? [];
  const sources = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });

  test.each(names.examples)('catches "%s"', (example) => {
    expect(found(example)).not.toEqual([]);
  });

  test.each(names.nonExamples)('lets "%s" through', (text) => {
    expect(found(text)).toEqual([]);
  });

  test('no string in en.json names a person', () => {
    const offenders = strings(en as Json).filter(([, text]) => found(text).length > 0).map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  test('the contract names no person and no research path', () => {
    const contract = fs.readFileSync(path.join(ROOT, 'contracts/openapi.yaml'), 'utf8');
    expect(found(contract)).toEqual([]);
    expect(contract).not.toContain('arastirma/');
  });

  test('every data file the app bundles names no person', () => {
    // Bundled whole into the app (import … from data/…json): its notes ship with it, shown or not.
    const bundled = [
      ...new Set(
        sources(path.join(ROOT, 'apps/mobile/src')).flatMap((file) =>
          [...fs.readFileSync(file, 'utf8').matchAll(/from '((?:\.\.\/)+data\/[^']+\.json)'/g)].map((m) =>
            path.resolve(path.dirname(file), m[1]),
          ),
        ),
      ),
    ];
    expect(bundled.length).toBeGreaterThan(3);
    const offenders = bundled.flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, i) => (found(line).length > 0 ? [`${path.relative(ROOT, file)}:${i + 1}`] : [])),
    );
    expect(offenders).toEqual([]);
  });

  test("no file of the app's code names a person", () => {
    const files = sources(path.join(ROOT, 'apps/mobile/src'));
    expect(files.length).toBeGreaterThan(50);
    const offenders = files.flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, i) => (found(line).length > 0 ? [`${path.relative(ROOT, file)}:${i + 1}`] : [])),
    );
    expect(offenders).toEqual([]);
  });
});

describe('no currency for the daily limit (K-508, ADR-012)', () => {
  const words = forbidden.quotaWords;
  const re = () => new RegExp(words.pattern, 'gi');

  test.each(words.examples)('catches "%s"', (example) => {
    expect(example.match(re())).not.toBeNull();
  });

  test.each(words.nonExamples)('lets "%s" through', (text) => {
    expect(text.match(re())).toBeNull();
  });

  test('no string in en.json speaks of credits or coins', () => {
    expect(strings(en as Json).filter(([, text]) => re().test(text)).map(([key]) => key)).toEqual([]);
  });
});
