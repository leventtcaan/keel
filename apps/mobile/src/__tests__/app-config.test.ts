/**
 * The native configuration (K-403, ADR-031): the HealthKit permission text iOS shows comes from data/copy/en.json like
 * every other text (K2) — reading and, since K-412, writing (asked only from Settings' switches) — and no background delivery yet.
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

test("iOS's permission texts are the copy file's, for reading and for writing (K-412); no background delivery", () => {
  const options = (healthKit[0] as [string, Record<string, unknown>])[1];
  expect(options).toEqual({
    NSHealthShareUsageDescription: t('permissions.healthRead'),
    NSHealthUpdateUsageDescription: t('permissions.healthWrite'),
    background: false,
  });
});

test('the camera is for barcodes only (K-407): its permission text from the copy file, no microphone on either platform', () => {
  const camera = (config.plugins as Plugin[]).filter((p) => (Array.isArray(p) ? p[0] : p) === 'expo-camera');
  expect(camera).toEqual([
    [
      'expo-camera',
      { cameraPermission: t('permissions.camera'), microphonePermission: false, recordAudioAndroid: false, barcodeScannerEnabled: true },
    ],
  ]);
});

test('a meal photo (K-408): the picker’s permission texts are the copy file’s — one camera text, the barcode’s and the photo’s — no microphone', () => {
  const picker = (config.plugins as Plugin[]).filter((p) => (Array.isArray(p) ? p[0] : p) === 'expo-image-picker');
  expect(picker).toEqual([
    ['expo-image-picker', { photosPermission: t('permissions.photos'), cameraPermission: t('permissions.camera'), microphonePermission: false }],
  ]);
  // Not in app.json: a plugin there runs after these and would put its own text on the camera.
  expect((base.expo.plugins as Plugin[]).some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-image-picker')).toBe(false);
});

test('everything else in app.json is kept', () => {
  expect(config.name).toBe(base.expo.name);
  expect(config.ios?.usesAppleSignIn).toBe(true);
});

describe('builds (K-308)', () => {
  const withEnv = (env: Record<string, string | undefined>) => {
    const saved = { ...process.env };
    // process.env turns an assigned undefined into the text "undefined": unset keys are deleted instead.
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    try {
      return appConfig({ config: base.expo } as never);
    } finally {
      process.env = saved;
    }
  };

  test("the bundle id is configuration, not code: the temporary one by default, the environment's when set", () => {
    expect(withEnv({ KEEL_IOS_BUNDLE_ID: undefined }).ios?.bundleIdentifier).toBe('dev.leventtcaan.keel');
    expect(withEnv({ KEEL_IOS_BUNDLE_ID: 'com.example.keel' }).ios?.bundleIdentifier).toBe('com.example.keel');
  });

  test('the EAS project id, once given by eas init, is kept from app.json', () => {
    const linked = appConfig({ config: { ...base.expo, extra: { eas: { projectId: 'abc' } } } } as never);
    expect(linked.extra?.eas).toEqual({ projectId: 'abc' });
  });

  test('HealthKit is declared for the build: the entitlement comes from the plugin, the capability from Apple', () => {
    // The plugin adds com.apple.developer.healthkit; EAS syncs the capability to the App ID (docs/eas-derleme.md).
    expect(healthKit).toHaveLength(1);
  });
});

describe('eas.json (K-308)', () => {
  const eas = require('../../eas.json') as {
    cli: { version: string; appVersionSource: string };
    build: Record<
      string,
      { developmentClient?: boolean; distribution?: string; ios?: { simulator?: boolean }; extends?: string; autoIncrement?: boolean }
    >;
    submit: Record<string, unknown>;
  };

  test('a development build for the phone, one for the simulator, and a store build for TestFlight', () => {
    expect(eas.build.development).toMatchObject({ developmentClient: true, distribution: 'internal' });
    expect(eas.build['development-simulator']).toMatchObject({ extends: 'development', ios: { simulator: true } });
    expect(eas.build.production).toMatchObject({ distribution: 'store', autoIncrement: true });
    expect(eas.cli.appVersionSource).toBe('remote');
  });

  test('no secret and no account detail in the file (V5): EAS asks for them, or they live in EAS', () => {
    const text = JSON.stringify(eas);
    expect(text).not.toMatch(/p8|password|apiKey|ascApiKey|appleId|@/i);
  });
});
