import { useEffect, useState } from 'react';

import type { components } from '@/api/schema';
import { useAppServices } from '@/services/ServicesProvider';


/**
 * The foods eaten lately for the slot being logged (K-1025), read again when the slot changes. The list of the slot before stays
 * until the new one is read (the quick adds do not flicker away), and an answer for a slot since changed is dropped. Empty until
 * read, and for good where nothing could be read.
 */
export function useRecentFoods(enabled: boolean, slot: components['schemas']['MealSlot']): components['schemas']['Suggestion'][] {
  const { recentFoods } = useAppServices();
  const [recent, setRecent] = useState<components['schemas']['Suggestion'][]>([]);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void Promise.resolve()
      .then(() => recentFoods(slot))
      .then((read) => live && setRecent(read))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [recentFoods, enabled, slot]);

  return recent;
}
