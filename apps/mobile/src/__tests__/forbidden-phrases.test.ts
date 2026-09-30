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
