/**
 * No user-facing text breaks U4 (no body-fat number) or U6 (no medical language). The phrase list is data
 * (data/copy/forbidden-phrases.json, K2); every pattern proves itself against its examples before it is trusted.
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '../../../../data/copy/en.json';
import forbidden from '../../../../data/copy/forbidden-phrases.json';

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
