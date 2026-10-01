import { useCallback } from 'react';

import { useAppServices } from '@/services/ServicesProvider';

import { type TodayData, loadToday } from './today';
import { useReadOnFocus } from './useReadOnFocus';

/** Today's parts (K-401), read on focus and when the app comes back to the front. */
export function useToday(): { day: string; data: TodayData | null; reload: () => void } {
  const { api } = useAppServices();
  return useReadOnFocus(useCallback((day: string) => loadToday(api, day), [api]));
}
