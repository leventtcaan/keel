/**
 * The app's native configuration: app.json, plus what must come from elsewhere.
 * - K-403: the HealthKit permission texts iOS shows are user-facing, so they come from data/copy/en.json like every text
 *   (K2). Writing has its own text (K-412): it is asked only when the user turns a write switch on in Settings. No
 *   background delivery until the reads need it (K-404).
 * - K-308: the bundle id is configuration — the temporary dev.leventtcaan.keel until the product has its name
 *   (KEEL_IOS_BUNDLE_ID; the server's KEEL_APPLE_CLIENT_ID must be the same, ADR-028). The EAS project id is not a
 *   secret: `eas init` gives it and it goes into app.json › extra.eas (docs/eas-derleme.md). No credential is kept here.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

import en from '../../data/copy/en.json';

const TEMPORARY_BUNDLE_ID = 'dev.leventtcaan.keel';

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    ios: { ...config.ios, bundleIdentifier: process.env.KEEL_IOS_BUNDLE_ID ?? TEMPORARY_BUNDLE_ID },
    plugins: [
      ...(config.plugins ?? []),
      [
        '@kingstinct/react-native-healthkit',
        { NSHealthShareUsageDescription: en.permissions.healthRead, NSHealthUpdateUsageDescription: en.permissions.healthWrite, background: false },
      ],
      // Barcodes only (K-407): no microphone on either platform.
      [
        'expo-camera',
        { cameraPermission: en.permissions.camera, microphonePermission: false, recordAudioAndroid: false, barcodeScannerEnabled: true },
      ],
    ],
  }) as ExpoConfig;
