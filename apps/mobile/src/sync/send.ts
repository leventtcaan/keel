/**
 * Each queued record to its contract endpoint (K-304). The typed client checks path and body against the contract;
 * the answer is reduced to what the queue decides on: the status, the stored record, or the error code.
 */
import type { ApiClient } from '@/api/client';

import type { Outbound, Send, SendResult } from './queue';

type Answer = { data?: { id: string }; error?: { code: string }; response: Response };

function reduce({ data, error, response }: Answer): SendResult {
  if (data !== undefined) return { status: response.status, id: data.id, body: data };
  return { status: response.status, errorCode: error?.code };
}

function post(api: ApiClient, record: Outbound, parentServerId: string | null): Promise<Answer> {
  switch (record.kind) {
    case 'weighIn':
      return api.POST('/v1/weigh-ins', { body: record.body });
    case 'waist':
      return api.POST('/v1/waist-measurements', { body: record.body });
    case 'bodyLook':
      return api.POST('/v1/body-looks', { body: record.body });
    case 'photoCheck':
      return api.POST('/v1/photo-checks', { body: record.body });
    case 'meal':
      return api.POST('/v1/meals', { body: record.body });
    case 'workout':
      return api.POST('/v1/workouts', { body: record.body });
    case 'set':
      if (parentServerId === null) throw new Error('a set is sent under its workout');
      return api.POST('/v1/workouts/{id}/sets', { params: { path: { id: parentServerId } }, body: record.body });
  }
}

export function sendWithApi(api: ApiClient): Send {
  return async (record, parentServerId) => reduce(await post(api, record, parentServerId));
}
