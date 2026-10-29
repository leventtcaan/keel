import { useCallback, useEffect, useMemo, useState } from 'react';

import type { components } from '@/api/schema';
import { useAppServices } from '@/services/ServicesProvider';
import { load } from '@/today/today';

import { addDays } from './dayLabel';
import { foodParams } from './params';

type Schemas = components['schemas'];

export type FoodExtras = {
  /** The foods eaten most, in their usual amount. */
  frequent: Schemas['Suggestion'][];
  /** The starred foods, newest star first, each with its portions. */
  favorites: Schemas['Food'][];
  favoriteIds: ReadonlySet<string>;
  /** Past meals to log again, the freshest first, one of each kind of meal. */
  again: Schemas['Meal'][];
  /** The slots the user logged into lately: the ones their day is made of. */
  usedSlots: ReadonlySet<Schemas['MealSlot']>;
  /** Stars or unstars a food; false when the server could not be reached (the star is not shown as changed). */
  setFavorite: (foodId: string, on: boolean) => Promise<boolean>;
};

/** A meal's items by food and amount: two meals with the same signature are one kind of meal. */
const signature = (meal: Schemas['Meal']) => meal.items.map((item) => `${item.foodId}:${item.amount.quantity}${item.amount.unit}`).join('|');

/** The kinds of meal in a list read, the freshest of each first, at most `log_again_max`. */
export function kindsOfMeal(meals: Schemas['Meal'][]): Schemas['Meal'][] {
  const seen = new Set<string>();
  const kinds: Schemas['Meal'][] = [];
  for (const meal of [...meals].sort((a, b) => Date.parse(b.eatenAt) - Date.parse(a.eatenAt))) {
    const key = `${meal.slot}|${signature(meal)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kinds.push(meal);
    if (kinds.length === foodParams.logAgainMax) break;
  }
  return kinds;
}

/**
 * What the meal screen offers beyond the search (K-1063), read once when it opens for a new meal (`enabled`): the foods eaten most,
 * the starred ones, the past meals of the last two weeks, and from those the slots the user's day is made of. A read that fails is
 * nothing offered, never an error: the search below does the logging.
 */
export function useFoodExtras(enabled: boolean, today: string): FoodExtras {
  const { api } = useAppServices();
  const [frequent, setFrequent] = useState<Schemas['Suggestion'][]>([]);
  const [favorites, setFavorites] = useState<Schemas['Food'][]>([]);
  const [history, setHistory] = useState<Schemas['Meal'][]>([]);

  const readFavorites = useCallback(async () => {
    const answer = await load(() => api.GET('/v1/foods/favorites')).catch(() => null);
    if (answer !== null && answer.state === 'ready') setFavorites(answer.value);
  }, [api]);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const days = Math.max(foodParams.logAgainDays, foodParams.slotsUsedWindowDays);
    void (async () => {
      const [freq, past] = await Promise.all([
        load(() => api.GET('/v1/foods/frequent')).catch(() => null),
        load(() => api.GET('/v1/meals', { params: { query: { from: addDays(today, -(days - 1)), to: today } } })).catch(() => null),
      ]);
      if (!live) return;
      if (freq !== null && freq.state === 'ready') setFrequent(freq.value);
      if (past !== null && past.state === 'ready') setHistory(past.value);
      await readFavorites();
    })();
    return () => {
      live = false;
    };
  }, [api, enabled, today, readFavorites]);

  const setFavorite = useCallback(
    async (foodId: string, on: boolean): Promise<boolean> => {
      try {
        const id = foodId; // the client encodes a path value itself
        const { response } = on
          ? await api.PUT('/v1/foods/{id}/favorite', { params: { path: { id } } })
          : await api.DELETE('/v1/foods/{id}/favorite', { params: { path: { id } } });
        if (!response.ok) return false;
        await readFavorites();
        return true;
      } catch {
        return false;
      }
    },
    [api, readFavorites],
  );

  const favoriteIds = useMemo(() => new Set(favorites.map((food) => food.id)), [favorites]);
  const again = useMemo(() => kindsOfMeal(history), [history]);
  const usedSlots = useMemo(() => new Set(history.map((meal) => meal.slot)), [history]);
  return { frequent, favorites, favoriteIds, again, usedSlots, setFavorite };
}
