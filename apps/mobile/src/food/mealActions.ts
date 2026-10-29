/**
 * Changing what was logged, in place (K-1063, ADR-090 Ek 3): an item's amount or portion, an item or a whole meal taken out — each
 * with the way back, so the app's one banner can say Undo. The contract's `PATCH /v1/meals/{id}` changes a meal where it stands (it
 * keeps its id and clientId); nothing is deleted and logged again to correct it. Changing needs the server (its estimate is the
 * truth, U1): offline, it says so and changes nothing.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { Save } from '@/saved/saved';
import type { SyncProblem } from '@/sync/queue';
import { newClientId } from '@/sync/send';

import { requestOfItem } from './draft';
import { sameTimeOn } from './dayLabel';

type Schemas = components['schemas'];
type Meal = Schemas['Meal'];

type Services = {
  api: ApiClient;
  forgetRecord: (clientId: string) => Promise<void>;
  report: (problem: SyncProblem) => void;
  queue: { record: (record: { kind: 'meal'; body: Schemas['NewMeal'] }) => Promise<boolean> };
};

/** What a try at changing came to: done, the server not reached, or refused/unknown. */
export type Change = { state: 'done'; meal: Meal } | { state: 'offline' } | { state: 'failed' } | { state: 'gone' };

/** The items of a logged meal as the requests that log them. */
export const requestsOfMeal = (meal: Meal): Schemas['ItemRequest'][] => meal.items.map(requestOfItem);

/** `PATCH /v1/meals/{id}`: the server estimates the new items and answers the meal as it is now. */
export async function changeMeal(api: ApiClient, id: string, change: Schemas['MealChange']): Promise<Change> {
  try {
    const { data, response } = await api.PATCH('/v1/meals/{id}', { params: { path: { id } }, body: change });
    if (data !== undefined) return { state: 'done', meal: data };
    return { state: response.status === 404 ? 'gone' : 'failed' };
  } catch {
    return { state: 'offline' };
  }
}

/**
 * A meal deleted on the server and the phone's copy forgotten (else it would come back offline). Already gone counts as deleted. A
 * delete with no answer may have been done (the answer lost): false then, and the next read shows the truth.
 */
export async function deleteMeal({ api, forgetRecord, report }: Services, meal: Meal): Promise<'done' | 'offline' | 'failed'> {
  let state: 'done' | 'offline' | 'failed';
  try {
    const { response } = await api.DELETE('/v1/meals/{id}', { params: { path: { id: meal.id } } });
    state = response.ok || response.status === 404 ? 'done' : 'failed';
  } catch {
    return 'offline';
  }
  if (state === 'done') await forgetRecord(meal.clientId).catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
  return state;
}

/** A meal logged once more as it was (an undo of a delete, "log again"): a new record on the phone, sent when it can be. */
export async function logMealAgain({ queue }: Pick<Services, 'queue'>, meal: Meal, eatenAt: string, slot: Meal['slot'] = meal.slot): Promise<string> {
  const clientId = newClientId();
  await queue.record({ kind: 'meal', body: { clientId, eatenAt, slot, repeatOf: meal.id } });
  return clientId;
}

/** A deleted meal's banner: "Deleted · Lunch", Undo logs it again at its own time (a copy of its items, since the original is gone). */
export function deletedMeal(services: Services, meal: Meal, after: () => void): Save {
  return {
    detail: t('food.deleted.detail', { slot: t(`food.slot.${meal.slot}`) }),
    undo: async () => {
      try {
        await services.queue.record({ kind: 'meal', body: { clientId: newClientId(), eatenAt: meal.eatenAt, slot: meal.slot, items: requestsOfMeal(meal) } });
        after();
        return { done: true, said: t('food.deleted.said') };
      } catch (error) {
        services.report({ name: error instanceof Error ? error.name : 'Unknown' });
        return { done: false, message: t('food.deleted.undoFailed'), again: true };
      }
    },
  };
}

/** An item taken out of a meal: Undo puts the meal's items back as they were (one change in place again). */
export function removedItem(services: Pick<Services, 'api' | 'report'>, before: Meal, name: string, after: () => void): Save {
  return {
    detail: t('food.deleted.itemDetail', { name }),
    undo: async () => {
      const back = await changeMeal(services.api, before.id, { items: requestsOfMeal(before) });
      if (back.state === 'done') {
        after();
        return { done: true, said: t('food.deleted.said') };
      }
      return { done: false, message: t(back.state === 'offline' ? 'meal.quick.undoOffline' : 'food.deleted.undoFailed'), again: back.state !== 'gone' };
    },
  };
}

/** Where a meal's day is on the phone's calendar for a copy: the time of day it had, on the day it is copied to. */
export const copiedAt = (meal: Meal, into: string, today: string, now: Date): string => sameTimeOn(meal.eatenAt, into, today, now);
