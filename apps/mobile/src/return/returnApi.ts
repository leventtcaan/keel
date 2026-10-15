/**
 * The return question on the phone (K-981, ADR-077 #5 and Ek 6, Ek 8): what the server says about the gap since the last
 * log (GET /v1/return) and the answer it keeps (POST /v1/return). The server counts the gap, decides whether to ask and
 * which way to suggest first, and names the next call's day; the phone reads and shows, and works out none of it.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { type Loaded, load } from '@/today/today';

type Schemas = components['schemas'];
export type ReturnSummary = Schemas['ReturnSummary'];
export type ReturnChoice = Schemas['ReturnChoice'];

/** The summary, in the states every read has: ready, not there (404), failed by name only (V3). */
export function readReturn(api: ApiClient): Promise<Loaded<ReturnSummary>> {
  return load(() => api.GET('/v1/return'));
}

/** By name, so a screen tells no connection from a server that said no (V3: never the message). */
function named(name: 'NoConnection' | 'ReturnRefused', message: string): Error {
  return Object.assign(new Error(message), { name });
}

/**
 * Answers once for this gap; the summary after the answer. Throws by name when the answer was not kept: `NoConnection`, or
 * `ReturnRefused` (the server answered no: there is no gap to answer any more, no profile).
 */
export async function answerReturn(api: ApiClient, choice: ReturnChoice): Promise<ReturnSummary> {
  let answer;
  try {
    answer = await api.POST('/v1/return', { body: { choice } });
  } catch {
    throw named('NoConnection', 'return: no answer');
  }
  if (answer.data === undefined) throw named('ReturnRefused', `return not answered: HTTP ${answer.response.status}`);
  return answer.data;
}
