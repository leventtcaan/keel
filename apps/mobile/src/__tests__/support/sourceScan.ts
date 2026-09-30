/**
 * Shared source scanner for the rule tests (K2, ADR-016). Rules about where colours, fonts and uppercase may live are
 * checked by reading the source; the patterns are kept here once and proven against samples in scanners.test.ts.
 */
import * as fs from 'fs';
import * as path from 'path';

export const SRC = path.resolve(__dirname, '../..');
export const TOKENS = path.join(SRC, 'theme', 'tokens.ts');

export const PATTERNS = {
  /** Hex, rgb()/hsl(), PlatformColor(), or a named colour given to a colour prop. */
  colour:
    /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(|\bPlatformColor\(|[cC]olor\s*[:=]\s*\{?\s*['"][a-zA-Z]+['"]/,
  uppercase: /uppercase|toUpperCase\(/,
  fontName: /fontFamily\s*[:=]\s*\{?\s*['"`]/,
  fontSizeOrWeight: /font(?:Size|Weight)\s*[:=]\s*\{?\s*(?:['"`]?\d|['"`](?:bold|normal|light|medium|heavy|black|semibold|thin|ultralight)['"`])/,
} as const;

/** Every .ts/.tsx under src, except tests and the generated API types. */
export function sourceFiles(dir: string = SRC): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'api' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

/** Files (relative to src) outside the token file whose text matches the pattern. */
export function offenders(pattern: RegExp, allowed: string[] = []): string[] {
  return sourceFiles()
    .filter((file) => file !== TOKENS)
    .map((file) => path.relative(SRC, file))
    .filter((rel) => !allowed.includes(rel))
    .filter((rel) => pattern.test(fs.readFileSync(path.join(SRC, rel), 'utf8')));
}
