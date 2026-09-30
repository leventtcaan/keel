/**
 * The app's native configuration: app.json, plus what must come from elsewhere (K-403). The HealthKit permission text
 * iOS shows is user-facing, so it comes from data/copy/en.json like every text (K2). Read only: no write permission
 * until the separate "add workouts" toggle (K-412), and no background delivery until the reads need it (K-404).
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

import en from '../../data/copy/en.json';

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        '@kingstinct/react-native-healthkit',
        { NSHealthShareUsageDescription: en.permissions.healthRead, NSHealthUpdateUsageDescription: false, background: false },
      ],
    ],
  }) as ExpoConfig;
