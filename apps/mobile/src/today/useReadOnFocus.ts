import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { localDay } from './today';

/**
 * A screen's reads for today, done whenever the screen comes into view and whenever the app comes back to the front:
 * the tabs stay mounted, so a read on mount alone would keep yesterday's day, or a consent just given in Settings, out
 * of sight (K-401 review). `day` is fixed when a read starts, so a read that crosses midnight shows the day it asked
 * for; the next one asks for the new day. A slower, older read never overwrites a newer one. `read` must be stable.
 */
export function useReadOnFocus<T>(read: (day: string) => Promise<T>): { day: string; data: T | null; reload: () => void } {
  const [state, setState] = useState<{ day: string; data: T | null }>(() => ({ day: localDay(new Date()), data: null }));
  const generation = useRef(0);

  const reload = useCallback(() => {
    const mine = ++generation.current;
    const day = localDay(new Date());
    void read(day).then((data) => {
      if (mine === generation.current) setState({ day, data });
    });
  }, [read]);

  useFocusEffect(reload);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') reload();
    });
    return () => subscription.remove();
  }, [reload]);

  return { ...state, reload };
}
