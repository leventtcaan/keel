/**
 * Whether a paid part is open to this account (K-1251, ADR-096 #2): the server's word on the subscription (GET /v1/subscription ›
 * active). A subscription that cannot be read is said apart ('unread'), never a lock: one who pays must not be told a part comes with a
 * subscription because the phone is offline.
 */
import type { ApiClient } from '@/api/client';
import { load } from '@/today/today';

export type PaidAccess = 'checking' | 'open' | 'locked' | 'unread';

export async function readPaidAccess(api: ApiClient): Promise<Exclude<PaidAccess, 'checking'>> {
  const read = await load(() => api.GET('/v1/subscription'));
  if (read.state !== 'ready') return 'unread';
  return read.value.active ? 'open' : 'locked';
}
