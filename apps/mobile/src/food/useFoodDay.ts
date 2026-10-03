import { useCallback, useEffect, useRef } from 'react';

import type { components } from '@/api/schema';
import { useAppServices } from '@/services/ServicesProvider';
import { type Loaded, load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';

import { type DayMeal, dayBefore, dayMeals, repeatOffers } from './meals';

type Schemas = components['schemas'];

export type FoodDay = {
  budget: Loaded<Schemas['DayBudget']>;
  targets: Loaded<Schemas['Targets']>;
  /** Today's meals; null behind the health data consent (the server said so). */
  meals: DayMeal[] | null;
  /** Whether the server's list was read: if not, the meals are only the phone's, and "nothing logged" cannot be said. */
  mealsRead: boolean;
  /** "Same as yesterday", for the slots today has nothing in; empty when yesterday's list could not be read. */
  offers: Schemas['Meal'][];
  /** What the day can still hold (K-507): the user's own foods that fit what is likely left; empty when none or unread. */
  suggestions: Schemas['Suggestion'][];
};

/**
 * The Food tab's reads (K-409, K-407), on focus and on coming back to the front. What waits on the phone is sent first,
 * so a meal just saved is in the server's list; offline, the phone's own copies stand in for it.
 */
export function useFoodDay(): { day: string; data: FoodDay | null; reload: () => void } {
  const { api, queue, mealRecords, report } = useAppServices();
  const latest = useRef({ queue, mealRecords, report });
  useEffect(() => {
    latest.current = { queue, mealRecords, report };
  });
  return useReadOnFocus(
    useCallback(
      async (day: string): Promise<FoodDay> => {
        const { queue: waiting, mealRecords: records, report: tell } = latest.current;
        const named = (error: unknown) => tell({ name: error instanceof Error ? error.name : 'Unknown' });
        await waiting.drain().catch(named);
        const [budget, targets, today, yesterday, local, suggested] = await Promise.all([
          load(() => api.GET('/v1/days/{day}/budget', { params: { path: { day } } })),
          load(() => api.GET('/v1/targets')),
          load(() => api.GET('/v1/meals', { params: { query: { day } } })),
          load(() => api.GET('/v1/meals', { params: { query: { day: dayBefore(day) } } })),
          records().catch((error: unknown) => {
            named(error);
            return [];
          }),
          load(() => api.GET('/v1/days/{day}/suggestions', { params: { path: { day } } })),
        ]);
        const suggestions = suggested.state === 'ready' ? suggested.value : [];
        if (today.state === 'consent') return { budget, targets, meals: null, mealsRead: false, offers: [], suggestions: [] };
        const mealsRead = today.state === 'ready';
        const meals = dayMeals(mealsRead ? today.value : null, local, day);
        // Without today's list a slot already logged could be offered again.
        const offers = mealsRead && yesterday.state === 'ready' ? repeatOffers(yesterday.value, meals) : [];
        return { budget, targets, meals, mealsRead, offers, suggestions };
      },
      [api],
    ),
  );
}
