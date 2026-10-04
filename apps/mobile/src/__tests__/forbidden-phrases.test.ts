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

describe('store texts (K-804, ADR-061)', () => {
  // The App Store listing is product text too: the same rules as en.json, no exception for negations (a listing has no
  // reason to name what the app is not), no person, and Apple's lengths.
  const fields = ['subtitle', 'promotionalText', 'description', 'keywords'] as const;
  const texts = fields.map((field) => [field, store[field]] as const);

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
    expect(store.limits).toEqual({ _source: store.limits._source, subtitle: 30, promotionalText: 170, description: 4000, keywordsBytes: 100 });
  });

  test.each(texts)('%s puts no currency on the daily limit (ADR-012)', (_, text) => {
    expect(text.match(new RegExp(forbidden.quotaWords.pattern, 'gi'))).toBeNull();
  });

  test("each fits Apple's limit: characters, and bytes for the keywords", () => {
    expect([...store.subtitle].length).toBeLessThanOrEqual(store.limits.subtitle);
    expect([...store.promotionalText].length).toBeLessThanOrEqual(store.limits.promotionalText);
    expect([...store.description].length).toBeLessThanOrEqual(store.limits.description);
    expect(Buffer.byteLength(store.keywords, 'utf8')).toBeLessThanOrEqual(store.limits.keywordsBytes);
  });

  test('every field of the file is scanned', () => {
    // A field added to the listing (whatsNew, a name) is scanned too, or this fails.
    expect(Object.keys(store).filter((key) => !key.startsWith('_') && key !== 'limits').sort()).toEqual([...fields].sort());
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
