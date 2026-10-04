/**
 * Every copy key used in the app exists in data/copy/en.json (K2, ADR-010).
 * Catches t('literal.key') and template keys built from a known prefix, e.g. t(`screens.${screen}.title`)
 * used by Placeholder for each tab.
 */
import * as fs from 'fs';
import * as path from 'path';

import { t } from '@/copy';

import en from '../../../../data/copy/en.json';

const SRC = path.resolve(__dirname, '..');

type Json = { [key: string]: string | Json };

function flatten(tree: Json, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : flatten(v, `${prefix}${k}.`),
  );
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const known = new Set(flatten(en as Json));

test('every literal copy key used in src exists in en.json', () => {
  const missing: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) {
      if (!known.has(match[1])) missing.push(`${path.relative(SRC, file)}: ${match[1]}`);
    }
  }
  expect(missing).toEqual([]);
});

test('the keys the settings screen builds from a consent kind exist (K-309)', () => {
  for (const kind of ['HEALTH_DATA', 'APPLE_HEALTH']) {
    for (const key of [`settings.consents.${kind}`, `settings.withdrawConfirm.${kind}.title`, `settings.withdrawConfirm.${kind}.body`]) {
      expect(t(key)).not.toMatch(/^\[missing/);
    }
  }
});

test("a rule's sentence is not a call's title: the leading rule says something the title doesn't (K-522)", () => {
  const decision = (en as unknown as { decision: Record<string, Record<string, unknown>> }).decision;
  const rules = decision.rule as Record<string, string>;
  const same: string[] = [];
  for (const [action, byRule] of Object.entries(decision)) {
    if (action === 'rule') continue;
    for (const [rule, words] of Object.entries(byRule)) {
      const title = (words as { title?: unknown }).title;
      if (typeof title === 'string' && rules[rule] === title) same.push(`${action}.${rule}`);
    }
  }
  expect(Object.keys(rules).length).toBeGreaterThan(50);
  expect(same).toEqual([]);
});
