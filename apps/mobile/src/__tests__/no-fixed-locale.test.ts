// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * No source file fixes a formatting language (K-1211, ADR-091): numbers and dates go through copy/format.ts, which follows
 * the language the person chose. The one place a locale tag may be written is the registry (copy/locales.ts).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const codeLines = (file: string) =>
  fs.readFileSync(file, 'utf8').split('\n').filter((line) => !/^\s*(\/\/|\/?\*)/.test(line)).join('\n');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

test("no non-test source writes 'en-US' (or another fixed locale) for Intl formatting", () => {
  const offenders = sourceFiles(SRC).filter((file) => /['"`]en-US['"`]/.test(codeLines(file)));
  expect(offenders.map((file) => path.relative(SRC, file))).toEqual([]);
});

test('no source calls toLocaleString / toLocaleDateString / toLocaleTimeString with a literal locale', () => {
  const offenders = sourceFiles(SRC).filter((file) => /\.toLocale(Date|Time)?String\(\s*['"`]/.test(codeLines(file)));
  expect(offenders.map((file) => path.relative(SRC, file))).toEqual([]);
});
