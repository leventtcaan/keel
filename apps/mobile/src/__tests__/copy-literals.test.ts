/**
 * User-facing text reaches components only through t() (K2, ADR-010). Two holes the key check cannot see:
 * - raw text written straight into JSX (<Text>Hello</Text>) or into a text prop (label="Apply");
 * - a template placeholder the caller never fills, which would show the user a literal "{name}".
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '../../../../data/copy/en.json';

type Json = { [key: string]: string | Json };

const SRC = path.resolve(__dirname, '..');
const TEXT_PROPS = ['label', 'title', 'eyebrow', 'placeholder', 'accessibilityLabel', 'accessibilityHint'];

function sourceFiles(dir: string, ext: RegExp): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full, ext);
    return ext.test(entry.name) ? [full] : [];
  });
}

function lookup(key: string): string | undefined {
  const node = key.split('.').reduce<string | Json | undefined>(
    (tree, part) => (tree !== undefined && typeof tree !== 'string' ? tree[part] : undefined),
    en as Json,
  );
  return typeof node === 'string' ? node : undefined;
}

const placeholders = (template: string) => new Set([...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

export function rawJsxText(source: string): string[] {
  const between = [...source.matchAll(/>\s*([A-Za-z][^<>{}]*?)\s*<\//g)].map((m) => m[1]);
  const props = [...source.matchAll(new RegExp(`\\b(?:${TEXT_PROPS.join('|')})=["']([^"']+)["']`, 'g'))].map(
    (m) => m[1],
  );
  return [...between, ...props];
}

export function unfilledPlaceholders(source: string): string[] {
  const problems: string[] = [];
  // t('key') and t('key', { a, b: 1 }) with an inline object; a call that passes a variable cannot be read here.
  for (const m of source.matchAll(/\bt\(\s*['"]([\w.]+)['"]\s*(?:,\s*\{([^}]*)\})?\s*(,|\))/g)) {
    const template = lookup(m[1]);
    if (template === undefined) continue; // copy-keys.test.ts reports missing keys
    if (m[2] === undefined && m[3] === ',') continue; // vars passed as a variable
    const given = new Set((m[2] ?? '').split(',').map((part) => part.split(':')[0].trim()).filter(Boolean));
    for (const name of placeholders(template)) if (!given.has(name)) problems.push(`${m[1]} needs {${name}}`);
  }
  return problems;
}

test('no raw user-facing text in components or screens', () => {
  const offenders = sourceFiles(SRC, /\.tsx$/).flatMap((file) =>
    rawJsxText(fs.readFileSync(file, 'utf8')).map((text) => `${path.relative(SRC, file)}: "${text}"`),
  );
  expect(offenders).toEqual([]);
});

test('every literal t() call fills every placeholder of its template', () => {
  const offenders = sourceFiles(SRC, /\.(ts|tsx)$/).flatMap((file) =>
    unfilledPlaceholders(fs.readFileSync(file, 'utf8')).map((p) => `${path.relative(SRC, file)}: ${p}`),
  );
  expect(offenders).toEqual([]);
});

describe('the detectors themselves', () => {
  test('find text between tags and in text props', () => {
    expect(rawJsxText('<Text>Eat a little more</Text>')).toEqual(['Eat a little more']);
    expect(rawJsxText('<Button label="Apply" onPress={go} />')).toEqual(['Apply']);
    expect(rawJsxText('<Text accessibilityLabel=\'Week\'>{t("a.b")}</Text>')).toEqual(['Week']);
  });

  test('let translated text and non-text props through', () => {
    expect(rawJsxText("<Text>{t('tabs.today')}</Text>")).toEqual([]);
    expect(rawJsxText('<View testID="card" edges={["top"]} />')).toEqual([]);
  });

  test('find a placeholder the call leaves empty', () => {
    expect(unfilledPlaceholders("t('format.range')")).toEqual(['format.range needs {low}', 'format.range needs {high}']);
    expect(unfilledPlaceholders("t('format.range', { low })")).toEqual(['format.range needs {high}']);
  });

  test('accept a call that fills every placeholder or passes a variable', () => {
    expect(unfilledPlaceholders("t('format.range', { low, high: 3 })")).toEqual([]);
    expect(unfilledPlaceholders("t('format.range', vars)")).toEqual([]);
    expect(unfilledPlaceholders("t('tabs.today')")).toEqual([]);
  });
});
