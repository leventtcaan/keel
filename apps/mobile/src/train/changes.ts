/**
 * Changing today's session ("Short on time", "Move it", "Skip today") and swapping a move, today only or from now on
 * (K-970; the server's K-964 endpoints, ADR-073 #5-#6, Ek 3). The server decides and answers the program as changed; the
 * phone only says why not, by name: CONFLICT (409) is the server's "not now" and nothing changed (a move past Sunday, a
 * workout of that day started today), no answer is no connection, anything else is ours, worth another try.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

type Schemas = components['schemas'];

export type Changed = { kind: 'done'; program: Schemas['Program'] } | { kind: 'conflict' } | { kind: 'offline' } | { kind: 'failed' };

type Answer = { data?: Schemas['Program']; response: Response };

async function sent(request: () => Promise<Answer>): Promise<Changed> {
  let answer: Answer;
  try {
    answer = await request();
  } catch {
    return { kind: 'offline' };
  }
  if (answer.data !== undefined) return { kind: 'done', program: answer.data };
  return answer.response.status === 409 ? { kind: 'conflict' } : { kind: 'failed' };
}

export function changeToday(api: ApiClient, programDayId: string, change: Schemas['TodayChange']['change']): Promise<Changed> {
  return sent(() => api.POST('/v1/program/today', { body: { programDayId, change } }));
}

export function swapMove(api: ApiClient, body: Schemas['MoveSwap']): Promise<Changed> {
  return sent(() => api.POST('/v1/program/swap', { body }));
}
