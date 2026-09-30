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

test('every tab placeholder has a title and a note', () => {
  for (const screen of ['today', 'train', 'food', 'progress']) {
    expect(known.has(`screens.${screen}.title`)).toBe(true);
    expect(known.has(`screens.${screen}.note`)).toBe(true);
  }
});

test('the keys the settings screen builds from a consent kind exist (K-309)', () => {
  for (const kind of ['HEALTH_DATA', 'APPLE_HEALTH']) {
    for (const key of [`settings.consents.${kind}`, `settings.withdrawConfirm.${kind}.title`, `settings.withdrawConfirm.${kind}.body`]) {
      expect(t(key)).not.toMatch(/^\[missing/);
    }
  }
});
