import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { Save } from '@/saved/saved';
import { undoThrough } from '@/saved/undo';
import type { useAppServices } from '@/services/ServicesProvider';

type Services = Pick<ReturnType<typeof useAppServices>, 'api' | 'takeBack' | 'report'>;

/**
 * A new meal kept on the phone, as the app's one banner shows it (K-1044, ADR-070 Ek 2 #6): "Saved · Lunch, 3 items" and
 * Undo. Undo is the meal list's own delete (`DELETE /v1/meals/{id}` through `takeBack`): the meal is deleted on the server by
 * the id it got and forgotten here, and a copy still waiting to be sent is dropped (K-1029).
 */
export function savedMeal(meal: { clientId: string; slot: components['schemas']['MealSlot']; items: number }, services: Services): Save {
  const { api, takeBack, report } = services;
  return {
    detail: t(meal.items === 1 ? 'meal.saved.one' : 'meal.saved.other', { slot: t(`food.slot.${meal.slot}`), count: meal.items }),
    undo: undoThrough(
      () => takeBack(meal.clientId, async (id) => (await api.DELETE('/v1/meals/{id}', { params: { path: { id } } })).response.status),
      report,
      { said: t('meal.quick.undoneSaid'), offline: t('meal.quick.undoOffline'), failed: t('meal.quick.undoFailed') },
    ),
  };
}
