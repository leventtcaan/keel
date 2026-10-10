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

/** A review suggestion the user takes (ADR-073 #3, Ek 1): named with the review it came from; CONFLICT if that review is stale. */
export function applySuggestion(api: ApiClient, reviewId: string, suggestionId: string): Promise<Changed> {
  return sent(() => api.POST('/v1/program/review/apply', { body: { reviewId, suggestionIds: [suggestionId] } }));
}

export type Undone = { kind: 'done'; program: Schemas['Program']; alsoUndone: string[] } | Exclude<Changed, { kind: 'done' }>;

/**
 * An applied change undone ("N changes applied · Undo", ADR-073 Ek 1): the program before it, the later changes applied
 * again; those that no longer apply go with it, named in `alsoUndone` so the page can say how many went.
 */
export async function undoChange(api: ApiClient, changeId: string): Promise<Undone> {
  let answer: { data?: Schemas['ReviewUndone']; response: Response };
  try {
    answer = await api.POST('/v1/program/review/undo', { body: { changeId } });
  } catch {
    return { kind: 'offline' };
  }
  if (answer.data !== undefined) return { kind: 'done', program: answer.data.program, alsoUndone: answer.data.alsoUndone };
  return answer.response.status === 409 ? { kind: 'conflict' } : { kind: 'failed' };
}

/** The user's own cardio (ADR-074 #4): the engine never overwrites it; no session turns cardio off. */
export function putCardio(api: ApiClient, plan: Schemas['CardioPlan']): Promise<Changed> {
  return sent(() => api.PUT('/v1/program/cardio', { body: plan }));
}

/** Back to the coach's default (ADR-074 Ek 1): the user's own cardio is removed, the phase's default follows. */
export function coachCardio(api: ApiClient): Promise<Changed> {
  return sent(() => api.DELETE('/v1/program/cardio'));
}

/**
 * "Rebuild for me": a new program from the user's training days, replacing this one (the server's generator).
 * `refused`: the server has no program for those days (VALIDATION_FAILED, 400); which days it builds for is its rule.
 */
export async function rebuild(api: ApiClient, trainingDays: Schemas['Weekday'][]): Promise<Changed | { kind: 'refused' }> {
  let status = 0;
  const answer = await sent(async () => {
    const result = await api.POST('/v1/program/generate', { body: { trainingDays } });
    status = result.response.status;
    return result;
  });
  return answer.kind === 'failed' && status === 400 ? { kind: 'refused' } : answer;
}

/**
 * The program edited in place by its day and move ids (ADR-073 #4, Ek 7; PATCH /v1/program): the days and moves as the
 * user left them. `conflict` (409): a day or move the program no longer has, or a workout started today on a day the edit
 * moves; nothing changed. `refused` (400): the edit is outside what a program is (VALIDATION_FAILED); trying it again
 * sends the same.
 */
export async function editProgram(api: ApiClient, edit: Schemas['ProgramEdit']): Promise<Changed | { kind: 'refused' }> {
  let status = 0;
  const answer = await sent(async () => {
    const result = await api.PATCH('/v1/program', { body: edit });
    status = result.response.status;
    return result;
  });
  return answer.kind === 'failed' && status === 400 ? { kind: 'refused' } : answer;
}
