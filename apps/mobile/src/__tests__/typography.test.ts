// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * Type rules, checked in the source:
 * - no capitals anywhere, headings included (ADR-094 §2: sentence case; long Turkish words choke in capitals);
 * - font names, sizes and weights only in the token file (K2) — components read tokens.font / tokens.type.
 */
import { offenders, PATTERNS } from './support/sourceScan';

test('no uppercase transform anywhere (ADR-094 §2)', () => {
  expect(offenders(PATTERNS.uppercase)).toEqual([]);
});

test('no font name literal outside the token file', () => {
  expect(offenders(PATTERNS.fontName)).toEqual([]);
});

test('no font size or weight literal outside the token file', () => {
  expect(offenders(PATTERNS.fontSizeOrWeight)).toEqual([]);
});
