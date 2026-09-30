/**
 * Colour values live only in src/theme/tokens.ts (ADR-014, K2).
 * Any hex, rgb()/hsl(), PlatformColor() or named colour elsewhere in src fails this test.
 */
import { offenders, PATTERNS } from './support/sourceScan';

test('no colour literal outside the token file', () => {
  expect(offenders(PATTERNS.colour)).toEqual([]);
});
