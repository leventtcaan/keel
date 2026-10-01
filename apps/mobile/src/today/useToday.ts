import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAppServices } from '@/services/ServicesProvider';

import { type TodayData, loadToday, localDay } from './today';

/**
 * Today's parts, read whenever the screen comes into view and whenever the app comes back to the front — the tabs stay
 * mounted, so a read on mount alone would keep yesterday's list, or a consent just given in Settings, out of sight (K-401
 * review). `day` is fixed when a read starts, so a read that crosses midnight shows the day it asked for; the next
 * focus asks for the new one. A slower, older read never overwrites a newer one.
 */
export function useToday(): { day: string; data: TodayData | null; reload: () => void } {
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

  useFocusEffect(reload);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') reload();
    });
    return () => subscription.remove();
  }, [reload]);

  return { ...state, reload };
}
