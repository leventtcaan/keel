/**
 * Whether the walk map is open to this account (K-1251, ADR-094 Ek 6, option 1: the map is the paid part): the server's
 * word on the subscription (GET /v1/subscription › active). A subscription that cannot be read is said apart ('unread'), never a lock:
 * one who pays must not be told the map comes with a subscription because the phone is offline.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { ApiClient } from '@/api/client';
import { load } from '@/today/today';

export type MapAccess = 'checking' | 'open' | 'locked' | 'unread';

export async function readMapAccess(api: ApiClient): Promise<Exclude<MapAccess, 'checking'>> {
  const read = await load(() => api.GET('/v1/subscription'));
  if (read.state !== 'ready') return 'unread';
  return read.value.active ? 'open' : 'locked';
}

/** Read whenever the screen comes into view: back from the paywall with a subscription, the map is there (K-1251 review). */
export function useMapAccess(api: ApiClient): MapAccess {
  const [access, setAccess] = useState<MapAccess>('checking');
  useFocusEffect(
    useCallback(() => {
      let current = true;
      void readMapAccess(api).then((next) => current && setAccess(next));
      return () => {
        current = false;
      };
    }, [api]),
  );
  return access;
}
