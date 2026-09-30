/**
 * Type rules from ADR-016, checked in the source:
 * - uppercase only in the screen title and the decision title;
 * - font names, sizes and weights only in the token file (K2) — components read tokens.font / tokens.type.
 */
import { offenders, PATTERNS } from './support/sourceScan';

const UPPERCASE_ALLOWED = ['components/ScreenTitle.tsx', 'components/DecisionBlock.tsx'];

test('uppercase appears only in the screen title and the decision title', () => {
  expect(offenders(PATTERNS.uppercase, UPPERCASE_ALLOWED)).toEqual([]);
});

test('no font name literal outside the token file', () => {
  expect(offenders(PATTERNS.fontName)).toEqual([]);
});

test('no font size or weight literal outside the token file', () => {
  expect(offenders(PATTERNS.fontSizeOrWeight)).toEqual([]);
});
