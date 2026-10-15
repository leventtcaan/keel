/**
 * What the meal screen can log in a tap (K-980, ADR-018 Ek 1, prototype `#meal`): yesterday's meals for the slots today has
 * nothing in, and the user's usual foods. The same pieces the Food tab uses — `repeatOffers` over yesterday's and today's
 * meals (the phone's waiting ones included) and `GET /v1/days/{day}/suggestions` — read together. A read that fails is
 * nothing offered, never an error: the form below does the logging.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { type Loaded, load } from '@/today/today';

import { dayBefore, dayMeals, repeatOffers } from './meals';

type Schemas = components['schemas'];

export type MealStart = { offers: Schemas['Meal'][]; usual: Schemas['Suggestion'][] };

/** A read that never throws: whatever goes wrong is "could not be read". */
function read<T>(request: Parameters<typeof load<T>>[0]): Promise<Loaded<T>> {
  return load(request).catch((): Loaded<T> => ({ state: 'failed', problem: 'ServerError' }));
}

/** `day` is today on the phone's calendar (YYYY-MM-DD). */
export async function readMealStart({ api, mealRecords }: { api: ApiClient; mealRecords: () => Promise<LocalRecord[]> }, day: string): Promise<MealStart> {
  const [today, yesterday, suggested, local] = await Promise.all([
    read(() => api.GET('/v1/meals', { params: { query: { day } } })),
    read(() => api.GET('/v1/meals', { params: { query: { day: dayBefore(day) } } })),
    read(() => api.GET('/v1/days/{day}/suggestions', { params: { path: { day } } })),
    mealRecords().catch((): LocalRecord[] => []),
  ]);
  // Without today's list a slot already logged could be offered again.
  const offers = today.state === 'ready' && yesterday.state === 'ready' ? repeatOffers(yesterday.value, dayMeals(today.value, local, day)) : [];
  return { offers, usual: suggested.state === 'ready' ? suggested.value : [] };
}
