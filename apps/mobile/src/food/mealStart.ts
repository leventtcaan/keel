/**
 * What the meal screen can log in a tap (K-980, ADR-018 Ek 1 and 3, prototype `#meal`): yesterday's meals for the slots today
 * has nothing in (`repeatOffers` over yesterday's and today's meals, the phone's waiting ones included), and the foods eaten
 * lately (`GET /v1/foods/recent`, K-1025), which follow the slot being logged and are read apart. A read that fails is
 * nothing offered, never an error: the form below does the logging.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { type Loaded, load } from '@/today/today';

import { dayBefore, dayMeals, repeatOffers } from './meals';

type Schemas = components['schemas'];

export type MealStart = { offers: Schemas['Meal'][] };

/** A read that never throws: whatever goes wrong is "could not be read". */
function read<T>(request: Parameters<typeof load<T>>[0]): Promise<Loaded<T>> {
  return load(request).catch((): Loaded<T> => ({ state: 'failed', problem: 'ServerError' }));
}

/** `day` is today on the phone's calendar (YYYY-MM-DD). */
export async function readMealStart({ api, mealRecords }: { api: ApiClient; mealRecords: () => Promise<LocalRecord[]> }, day: string): Promise<MealStart> {
  const [today, yesterday, local] = await Promise.all([
    read(() => api.GET('/v1/meals', { params: { query: { day } } })),
    read(() => api.GET('/v1/meals', { params: { query: { day: dayBefore(day) } } })),
    mealRecords().catch((): LocalRecord[] => []),
  ]);
  // Without today's list a slot already logged could be offered again.
  const offers = today.state === 'ready' && yesterday.state === 'ready' ? repeatOffers(yesterday.value, dayMeals(today.value, local, day)) : [];
  return { offers };
}

/**
 * The foods eaten lately, the slot's own first (the server orders them, K-1025): each in the amount of its last time, with its
 * range (U5). Nothing read is none, never an error.
 */
export async function readRecentFoods({ api }: { api: ApiClient }, slot: Schemas['MealSlot']): Promise<Schemas['Suggestion'][]> {
  const recent = await read(() => api.GET('/v1/foods/recent', { params: { query: { slot } } }));
  return recent.state === 'ready' ? recent.value : [];
}
