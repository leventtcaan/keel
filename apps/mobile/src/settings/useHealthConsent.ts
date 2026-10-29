import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAppServices } from '@/services/ServicesProvider';

/**
 * Whether the health data consent is given, as the phone knows it (ADR-030 #25): null until read. Unknown reads as not given.
 * Read again whenever the screen comes into view, so a consent changed on a page opened from it (Settings › Health data
 * consent) shows on the way back, and Food and the history import follow it at once. A page that gives the consent itself
 * (Foods you avoid, the import) passes a number it counts up when it did, and the answer is read again then.
 */
export function useHealthConsent(again = 0): boolean | null {
  const { consents } = useAppServices();
  const [granted, setGranted] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      void again; // a new count is only a reason to read once more
      let live = true; // an answer after the screen went out of view changes nothing
      void consents.granted('HEALTH_DATA').then(
        (answer) => live && setGranted(answer),
        () => live && setGranted(false),
      );
      return () => {
        live = false;
      };
    }, [consents, again]),
  );
  return granted;
}
