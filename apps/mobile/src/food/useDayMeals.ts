import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppServices } from '@/services/ServicesProvider';
import { load } from '@/today/today';

import { type DayMeal, dayMeals } from './meals';

/**
 * The meals of one day as the meal screen shows them (Evre 7 A): the server's list with what the phone has kept and not sent joined to
 * it (`dayMeals`), so a food just logged is in the tray at once, offline too. `reload` reads again — first as things stand, then after
 * what waits has been sent — and a slower, older read never overwrites a newer one. Null until the first read.
 */
export function useDayMeals(day: string, enabled: boolean): { rows: DayMeal[] | null; reload: () => Promise<void> } {
  const { api, queue, mealRecords, report } = useAppServices();
  const [rows, setRows] = useState<DayMeal[] | null>(null);
  const generation = useRef(0);

  const read = useCallback(async (mine: number) => {
    const [shown, local] = await Promise.all([
      load(() => api.GET('/v1/meals', { params: { query: { day } } })).catch(() => null),
      mealRecords().catch(() => []),
    ]);
    if (mine !== generation.current) return;
    setRows(dayMeals(shown !== null && shown.state === 'ready' ? shown.value : null, local, day));
  }, [api, mealRecords, day]);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    await read(mine);
    await queue.drain().catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
    await read(mine);
  }, [read, queue, report]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { rows, reload };
}
