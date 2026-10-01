import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppServices } from '@/services/ServicesProvider';

import { type TodayData, loadToday, localDay } from './today';

/**
 * Today's parts, read on arrival and again on demand. `day` is fixed when the read starts, so a read that crosses
 * midnight shows the day it asked for. A slower, older read never overwrites a newer one.
 */
export function useToday(): {
  day: string;
  data: TodayData | null;
  reload: () => void;
} {
  const { api } = useAppServices();
  const [state, setState] = useState<{ day: string; data: TodayData | null }>(() => ({ day: localDay(new Date()), data: null }));
  const generation = useRef(0);

  const reload = useCallback(() => {
    const mine = ++generation.current;
    const day = localDay(new Date());
    void loadToday(api, day).then((data) => {
      if (mine === generation.current) setState({ day, data });
    });
  }, [api]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
