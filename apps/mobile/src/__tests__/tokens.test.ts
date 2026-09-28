/**
 * Colour values live only in src/theme/tokens.ts (ADR-014, K2).
 * Any hex or rgb()/hsl() colour elsewhere in src fails this test.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const TOKENS = path.join(SRC, 'theme', 'tokens.ts');
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

test('no colour literal outside the token file', () => {
  const offenders = sourceFiles(SRC)
    .filter((file) => file !== TOKENS)
    .filter((file) => COLOUR.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(SRC, file));
  expect(offenders).toEqual([]);
});
