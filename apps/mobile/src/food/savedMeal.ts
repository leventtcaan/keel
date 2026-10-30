import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { Save } from '@/saved/saved';
import { undoThrough } from '@/saved/undo';
import type { useAppServices } from '@/services/ServicesProvider';

type Services = Pick<ReturnType<typeof useAppServices>, 'api' | 'takeBack' | 'report'>;

const words = () => ({ said: t('meal.quick.undoneSaid'), offline: t('meal.quick.undoOffline'), failed: t('meal.quick.undoFailed') });

/** `DELETE /v1/meals/{id}` through `takeBack`: the meal is deleted on the server by the id it got and forgotten here, a copy still waiting to be sent is dropped (K-1029). */
const takeBackMeal = ({ api, takeBack }: Pick<Services, 'api' | 'takeBack'>, clientId: string) =>
  takeBack(clientId, async (id) => (await api.DELETE('/v1/meals/{id}', { params: { path: { id } } })).response.status);

/**
 * A new meal kept on the phone, as the app's one banner shows it (K-1044, ADR-070 Ek 2 #6): "Saved · Lunch, 3 items" and
 * Undo. Undo is the meal list's own delete.
 */
export function savedMeal(meal: { clientId: string; slot: components['schemas']['MealSlot']; items: number }, services: Services): Save {
  return {
    detail: t(meal.items === 1 ? 'meal.saved.one' : 'meal.saved.other', { slot: t(`food.slot.${meal.slot}`), count: meal.items }),
    undo: undoThrough(() => takeBackMeal(services, meal.clientId), services.report, words()),
  };
}

/**
 * Food added to a meal that stays open (Evre 7 A): the light confirmation under the list, "Added · Oats" and Undo. One tap can be several
 * records (a whole past meal logged again is one per log of it), and one Undo takes them all back; it stops at the first it could not.
 */
export function addedFood(added: { clientIds: string[]; detail: string }, services: Services): Save {
  return {
    lead: t('meal.toast.added'),
    detail: added.detail,
    undo: undoThrough(
      async () => {
        for (const clientId of added.clientIds) {
          const result = await takeBackMeal(services, clientId);
          if (result !== 'taken') return result;
        }
        return 'taken';
      },
      services.report,
      words(),
    ),
  };
}
