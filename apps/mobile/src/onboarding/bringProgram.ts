/**
 * The program the user brings, on the server (K-968, ADR-073 #1-#3). The own moves a confirmed program names are made
 * first; PUT /v1/program then keeps the program as their own (OWN), replacing any before it, and answers with it as kept,
 * its review on it. The review is read on its own when that answer has none; the suggestions the user keeps on are
 * applied by the review they came from. A failure is named, never what was in it (V3): NoConnection (no answer),
 * ReviewStale (409: the program changed since that review, nothing applied), Refused (the server's no),
 * ProgramIncomplete (a move without its id). Nothing is kept on the phone: the same request can go again.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

type Schemas = components['schemas'];
type Answer<T> = { data?: T; response: Response };

const named = (name: 'NoConnection' | 'ReviewStale' | 'Refused' | 'ProgramIncomplete', message: string) =>
  Object.assign(new Error(message), { name });

async function answered<T>(what: string, request: () => Promise<Answer<T>>): Promise<T> {
  let answer;
  try {
    answer = await request();
  } catch {
    throw named('NoConnection', `${what}: no answer`);
  }
  if (answer.data !== undefined) return answer.data;
  const status = answer.response.status;
  throw status === 409 ? named('ReviewStale', `${what}: the program changed`) : named('Refused', `${what} refused: HTTP ${status}`);
}

/**
 * The user's own moves a confirmed program names, made on the server one after another, in order (POST
 * /v1/custom-exercises). Each keeps the clientId it was answered with: sent again after a failure, the server answers
 * with the move it kept the first time (ADR-024).
 */
export async function sendOwnMoves(api: Pick<ApiClient, 'POST'>, moves: Schemas['NewCustomExercise'][]): Promise<Schemas['CustomExercise'][]> {
  const kept: Schemas['CustomExercise'][] = [];
  for (const body of moves) kept.push(await answered('own move', () => api.POST('/v1/custom-exercises', { body })));
  return kept;
}

/**
 * A confirmed program with the user's own moves it names (ADR-073 Ek 2: made only now): the moves first, each kept on the
 * phone after the one before (the phone's copy is read, then written: two at once would lose one), then the program
 * `build` makes from their ids, in the order given.
 */
export async function sendWithOwnMoves(
  api: Pick<ApiClient, 'POST' | 'PUT'>,
  keep: (own: Schemas['CustomExercise']) => Promise<void>,
  own: Schemas['NewCustomExercise'][],
  build: (ids: string[]) => Schemas['OwnProgram'] | null,
): Promise<Schemas['Program']> {
  const kept = await sendOwnMoves(api, own);
  for (const move of kept) await keep(move);
  const body = build(kept.map((move) => move.id));
  if (body === null) throw named('ProgramIncomplete', 'own program: a move without its id');
  return sendOwnProgram(api, body);
}

export function sendOwnProgram(api: Pick<ApiClient, 'PUT'>, body: Schemas['OwnProgram']): Promise<Schemas['Program']> {
  return answered('own program', () => api.PUT('/v1/program', { body }));
}

export function readProgram(api: Pick<ApiClient, 'GET'>): Promise<Schemas['Program']> {
  return answered('program', () => api.GET('/v1/program'));
}

export function readReview(api: Pick<ApiClient, 'GET'>): Promise<Schemas['ProgramReview']> {
  return answered('program review', () => api.GET('/v1/program/review'));
}

export function applyReview(api: Pick<ApiClient, 'POST'>, reviewId: string, suggestionIds: string[]): Promise<Schemas['Program']> {
  return answered('review apply', () => api.POST('/v1/program/review/apply', { body: { reviewId, suggestionIds } }));
}
