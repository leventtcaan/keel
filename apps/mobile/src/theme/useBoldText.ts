/**
 * The phone's Bold Text setting (iOS), followed live (K-910). On Android, and where the answer cannot be read, it is off:
 * nothing is laid out differently there. The first answer is a promise, so a phone with Bold Text on lays out once as if it
 * were off, then again with the answer.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useBoldText(): boolean {
  const [bold, setBold] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isBoldTextEnabled()
      .then((on) => {
        if (live) setBold(on);
      })
      .catch(() => undefined); // not readable: as without the setting (above)
    const change = AccessibilityInfo.addEventListener('boldTextChanged', setBold);
    return () => {
      live = false;
      change.remove();
    };
  }, []);
  return bold;
}
