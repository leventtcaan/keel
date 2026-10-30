import { useCallback, useEffect, useMemo, useState } from 'react';

import type { components } from '@/api/schema';
import { useAppServices } from '@/services/ServicesProvider';
import { load } from '@/today/today';

import { addDays } from './dayLabel';
import { foodParams } from './params';

type Schemas = components['schemas'];

export type FoodExtras = {
  /** The starred foods, newest star first, each with its portions. */
  favorites: Schemas['Food'][];
  /** Who is starred right now: a heart just tapped counts at once (the server confirms behind it). */
  favoriteIds: ReadonlySet<string>;
  /** The user's meals of the last two weeks, freshest first: what the slot pattern, the past meals to log again and the used slots rest on. */
  history: Schemas['Meal'][];
  /** Stars or unstars a food; false when the server could not be reached (the heart goes back). */
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
 * What the meal screen offers beyond the search (K-1063), read once when it opens for a new meal (`enabled`): the starred foods and the
 * meals of the last two weeks (the slot pattern, the past meals to log again). A read that fails is nothing offered, never an error: the
 * search below does the logging. A heart is optimistic: it shows the new state at once and goes back if the server did not take it.
 */
export function useFoodExtras(enabled: boolean, today: string): FoodExtras {
  const { api } = useAppServices();
  const [favorites, setFavorites] = useState<Schemas['Food'][]>([]);
  const [history, setHistory] = useState<Schemas['Meal'][]>([]);
  // Hearts tapped and not yet confirmed by a read of the list: true is starred, false is not.
  const [pending, setPending] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  const readFavorites = useCallback(async () => {
    const answer = await load(() => api.GET('/v1/foods/favorites')).catch(() => null);
    if (answer !== null && answer.state === 'ready') setFavorites(answer.value);
  }, [api]);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const days = Math.max(foodParams.logAgainDays, foodParams.slotsUsedWindowDays);
    void (async () => {
      const past = await load(() => api.GET('/v1/meals', { params: { query: { from: addDays(today, -(days - 1)), to: today } } })).catch(() => null);
      if (!live) return;
      if (past !== null && past.state === 'ready') setHistory([...past.value].sort((a, b) => Date.parse(b.eatenAt) - Date.parse(a.eatenAt)));
      await readFavorites();
    })();
    return () => {
      live = false;
    };
  }, [api, enabled, today, readFavorites]);

  const setFavorite = useCallback(
    async (foodId: string, on: boolean): Promise<boolean> => {
      setPending((before) => new Map(before).set(foodId, on));
      const settle = () =>
        setPending((before) => {
          const next = new Map(before);
          next.delete(foodId);
          return next;
        });
      try {
        const id = foodId; // the client encodes a path value itself
        const { response } = on
          ? await api.PUT('/v1/foods/{id}/favorite', { params: { path: { id } } })
          : await api.DELETE('/v1/foods/{id}/favorite', { params: { path: { id } } });
        if (!response.ok) {
          settle();
          return false;
        }
        await readFavorites();
        settle();
        return true;
      } catch {
        settle();
        return false;
      }
    },
    [api, readFavorites],
  );

  const favoriteIds = useMemo(() => {
    const ids = new Set(favorites.map((food) => food.id));
    for (const [id, on] of pending) {
      if (on) ids.add(id);
      else ids.delete(id);
    }
    return ids;
  }, [favorites, pending]);
  const shownFavorites = useMemo(() => favorites.filter((food) => favoriteIds.has(food.id)), [favorites, favoriteIds]);
  return { favorites: shownFavorites, favoriteIds, history, setFavorite };
}

/**
 * The foods usually had at the meal being logged (Evre 7 A, `GET /v1/foods/frequent?slot=`), read again when the meal changes. An answer
 * for a meal since changed is dropped, and the list of the meal before is not shown under the new meal's name while the new one is read.
 * Empty until read, and for good where nothing could be read or nothing was ever had at that meal.
 */
export function useUsualFoods(enabled: boolean, slot: Schemas['MealSlot']): Schemas['Suggestion'][] {
  const { api } = useAppServices();
  const [usual, setUsual] = useState<{ slot: Schemas['MealSlot']; foods: Schemas['Suggestion'][] } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void load(() => api.GET('/v1/foods/frequent', { params: { query: { slot } } }))
      .then((answer) => {
        if (live) setUsual({ slot, foods: answer.state === 'ready' ? answer.value : [] });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [api, enabled, slot]);

  // The meal's own list only: another meal's foods under this meal's name would be a wrong answer, a moment of none is not.
  return usual !== null && usual.slot === slot ? usual.foods : [];
}
