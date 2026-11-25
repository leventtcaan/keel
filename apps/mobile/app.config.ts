/**
 * The app's native configuration: app.json, plus what must come from elsewhere.
 * - K-403: the HealthKit permission texts iOS shows are user-facing, so they come from data/copy/en.json like every text
 *   (K2). Writing has its own text (K-412): it is asked only when the user turns a write switch on in Settings. No
 *   background delivery until the reads need it (K-404).
 * - K-408: the photo picker's permission texts, the same way (one camera text for barcodes, meal and progress photos).
 * - K-976: the one URL scheme the app may ask about (Instagram Stories); the Facebook App ID those Stories need is not here
 *   but EXPO_PUBLIC_FACEBOOK_APP_ID, read in the app (src/share/storyConfig.ts).
 * - K-1212: the permission prompts follow the phone's language, not the in-app choice (iOS reads the prompt text from the app
 *   bundle before the app runs): the Turkish texts go into tr.lproj/InfoPlist.strings by Expo's own `locales` field, no
 *   dependency. English stays the base text above.
 * - K-601: no motion permission — the accelerometer needs none.
 * - K-1215: the rest as a Live Activity (`expo-widgets`): a widget extension target `<bundle id>.ExpoWidgetsTarget` and the App Group
 *   `group.<bundle id>`, both named from the bundle id so they follow it (ADR-094). No widgets of its own, no push (local start, update, end).
 * - K-308: the bundle id is configuration — the temporary dev.leventtcaan.keel until the product has its name
 *   (KEEL_IOS_BUNDLE_ID; the server's KEEL_APPLE_CLIENT_ID must be the same, ADR-028). The EAS project id is not a
 *   secret: `eas init` gives it and it goes into app.json › extra.eas (docs/eas-derleme.md). No credential is kept here.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

import en from '../../data/copy/en.json';
import tr from '../../data/copy/tr.json';

const TEMPORARY_BUNDLE_ID = 'dev.leventtcaan.keel';

export default ({ config }: ConfigContext): ExpoConfig => {
  const bundleIdentifier = process.env.KEEL_IOS_BUNDLE_ID ?? TEMPORARY_BUNDLE_ID;
  return {
    ...config,
    // ADR-080 Ek 2: the name under the icon is the product name, from the copy file (K2). The slug (keel) and the bundle id
    // stay: they are identifiers, and the App Store listing name is set in App Store Connect, not here.
    name: en.app.name,
    ios: {
      ...config.ios,
      bundleIdentifier,
      // K-976: Instagram Stories. The app may ask whether Instagram is there (canOpenURL) by this one scheme and no other.
      // react-native-share's own plugin would write the same list but needs expo-build-properties, which the app does not use.
      infoPlist: { ...config.ios?.infoPlist, CFBundleAllowMixedLocalizations: true, LSApplicationQueriesSchemes: [...(config.ios?.infoPlist?.LSApplicationQueriesSchemes ?? []), 'instagram-stories'] },
    },
    locales: {
      ...config.locales,
      tr: {
        NSCameraUsageDescription: tr.permissions.camera,
        NSPhotoLibraryUsageDescription: tr.permissions.photos,
        NSHealthShareUsageDescription: tr.permissions.healthRead,
        NSHealthUpdateUsageDescription: tr.permissions.healthWrite,
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      [
        '@kingstinct/react-native-healthkit',
        { NSHealthShareUsageDescription: en.permissions.healthRead, NSHealthUpdateUsageDescription: en.permissions.healthWrite, background: false },
      ],
      // Barcodes (K-407) and meal photos (K-408): one camera text, no microphone on either platform.
      [
        'expo-camera',
        { cameraPermission: en.permissions.camera, microphonePermission: false, recordAudioAndroid: false, barcodeScannerEnabled: true },
      ],
      // A meal photo (K-408): the system's camera and photo picker. Here, not in app.json: a plugin there would run after
      // these and put its own text on the camera.
      ['expo-image-picker', { photosPermission: en.permissions.photos, cameraPermission: en.permissions.camera, microphonePermission: false }],
      // The capture screen's level (K-601) reads the accelerometer, which asks no permission. Without this the plugin, applied
      // anyway, writes its own motion permission text (not the copy file's) and builds the permission code in.
      ['expo-sensors', { motionPermission: false }],
      // The rest on the lock screen and the Dynamic Island (K-1215): the extension target and the App Group, no home screen widget, no push.
      ['expo-widgets', { bundleIdentifier: `${bundleIdentifier}.ExpoWidgetsTarget`, groupIdentifier: `group.${bundleIdentifier}`, widgets: [] }],
    ],
  } as ExpoConfig;
};
