/**
 * Type rules from ADR-016, checked in the source:
 * - uppercase only in the screen title and the decision title;
 * - font names and sizes only in the token file (K2) — components read tokens.font / tokens.type.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const TOKENS = path.join(SRC, 'theme', 'tokens.ts');
const UPPERCASE_ALLOWED = ['components/ScreenTitle.tsx', 'components/DecisionBlock.tsx'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'api' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function offenders(pattern: RegExp, allowed: string[] = []): string[] {
  return sourceFiles(SRC)
    .filter((file) => file !== TOKENS)
    .map((file) => path.relative(SRC, file))
    .filter((rel) => !allowed.includes(rel))
    .filter((rel) => pattern.test(fs.readFileSync(path.join(SRC, rel), 'utf8')));
}

test('uppercase appears only in the screen title and the decision title', () => {
  expect(offenders(/uppercase/, UPPERCASE_ALLOWED)).toEqual([]);
});

test('no font name literal outside the token file', () => {
  expect(offenders(/fontFamily:\s*['"`]/)).toEqual([]);
});

test('no font size or weight literal outside the token file', () => {
  expect(offenders(/font(Size|Weight):\s*['"`]?\d/)).toEqual([]);
});

test('the scanner itself sees the components folder', () => {
  const files = sourceFiles(SRC).map((file) => path.relative(SRC, file));
  expect(files).toEqual(expect.arrayContaining(UPPERCASE_ALLOWED));
});
