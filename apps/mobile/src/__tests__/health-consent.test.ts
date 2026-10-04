/**
 * Apple Health is read only with both consents (K-402, K-404, K-616, ADR-030 #25): the regular read and the import ask
 * the same question, in one place.
 */
import { bothHealthConsents } from '@/health/consent';

const consents = (given: string[]) => ({ granted: jest.fn(async (kind: string) => given.includes(kind)) });

test.each([
  [['HEALTH_DATA', 'APPLE_HEALTH'], true],
  [['HEALTH_DATA'], false],
  [['APPLE_HEALTH'], false],
  [[], false],
])('given %j: %s', async (given, both) => {
  expect(await bothHealthConsents(consents(given))).toBe(both);
});
