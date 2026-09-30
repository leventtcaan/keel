/**
 * The native configuration (K-403, ADR-031): the HealthKit permission text iOS shows comes from data/copy/en.json like
 * every other text (K2), the app asks to read only (no write permission until K-412), and no background delivery yet.
 */
import appConfig from '../../app.config';
import base from '../../app.json';
import { t } from '@/copy';

type Plugin = string | [string, Record<string, unknown>];
const config = appConfig({ config: base.expo } as never);
const healthKit = (config.plugins as Plugin[]).filter((p) => (Array.isArray(p) ? p[0] : p) === '@kingstinct/react-native-healthkit');

test('the HealthKit plugin is there once, with its options', () => {
  expect(healthKit).toHaveLength(1);
  expect(Array.isArray(healthKit[0])).toBe(true);
});

test("iOS's permission text is the copy file's; reading only, no background delivery", () => {
  const options = (healthKit[0] as [string, Record<string, unknown>])[1];
  expect(options).toEqual({
    NSHealthShareUsageDescription: t('permissions.healthRead'),
    NSHealthUpdateUsageDescription: false,
    background: false,
  });
});

test('everything else in app.json is kept', () => {
  expect(config.name).toBe(base.expo.name);
  expect(config.ios?.usesAppleSignIn).toBe(true);
});
