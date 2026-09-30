/**
 * Each queued record to its contract endpoint (K-304). The typed client checks path and body against the contract;
 * the answer is reduced to what the queue decides on: the status, the stored record, or the error code.
 */
import { randomUUID } from 'expo-crypto';

import type { ApiClient } from '@/api/client';

import { NoAnswer, type Outbound, type Send, type SendResult } from './queue';

/** The id a record carries from the phone to the server (ADR-024): a version 4 UUID, made before anything is sent. */
export function newClientId(): string {
  return randomUUID();
}

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
    default: {
      const unknown: never = record; // a kind stored by another app version
      throw new Error(`unknown record kind ${(unknown as { kind: string }).kind}`);
    }
  }
}

export function sendWithApi(api: ApiClient): Send {
  return async (record, parentServerId) => {
    // Built outside the try: a record or parent that cannot be sent is a bug, not the network.
    const request = post(api, record, parentServerId);
    let answer: Answer;
    try {
      answer = await request;
    } catch {
      // fetch failed, or the body was not JSON (a Wi-Fi sign-in page answering for the server).
      throw new NoAnswer();
    }
    return reduce(answer);
  };
}
