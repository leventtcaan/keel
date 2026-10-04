/**
 * The phone's Reduce Motion setting, followed live (K-807; Apple: Reduced Motion). The app's own movements — a scroll
 * to the newest message, a sheet sliding up — happen at once when it is on. Not known yet (the first answer is a
 * promise), or not readable: the movement stays, as it would on a phone without the setting.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduce(on);
      })
      .catch(() => undefined); // not readable: as without the setting (above)
    const change = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      change.remove();
    };
  }, []);
  return reduce;
}
