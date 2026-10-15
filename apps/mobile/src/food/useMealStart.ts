import { useEffect, useState } from 'react';

import { useAppServices } from '@/services/ServicesProvider';
import { localDay } from '@/today/today';

import type { MealStart } from './mealStart';

/**
 * The meal screen's one-tap offers (K-980), read once when the screen opens for a new meal (`enabled`). Null until read, and
 * null for good where nothing could be read: the form does not wait for it.
 */
export function useMealStart(enabled: boolean): MealStart | null {
  const { mealStart } = useAppServices();
  const [start, setStart] = useState<MealStart | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void Promise.resolve()
      .then(() => mealStart(localDay(new Date())))
      .then((read) => live && setStart(read))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [mealStart, enabled]);

  return start;
}
