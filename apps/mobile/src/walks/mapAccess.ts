/**
 * Whether the walk map is open to this account (K-1251, ADR-094 Ek 6, option 1: the map is the paid part): the server's
 * word on the subscription (GET /v1/subscription › active). A subscription that cannot be read is said apart ('unread'), never a lock:
 * one who pays must not be told the map comes with a subscription because the phone is offline.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { ApiClient } from '@/api/client';
import { type PaidAccess, readPaidAccess } from '@/subscription/access';

export type MapAccess = PaidAccess;

/** The map's access is the subscription's (src/subscription/access.ts, shared with the other paid parts, ADR-096 #2). */
export const readMapAccess = readPaidAccess;

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
