/**
 * Sending the program the user confirmed (K-968, ADR-073 #1): PUT /v1/program keeps it as their own (OWN), replacing any
 * before it, and answers with the program as kept, its review on it. A failure is named, never what was in it (V3):
 * NoConnection (no answer), ProgramRefused (the server's no). Nothing is kept on the phone: the same program can go again.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

type Schemas = components['schemas'];

const named = (name: 'NoConnection' | 'ProgramRefused' | 'ProgramIncomplete', message: string) => Object.assign(new Error(message), { name });

/**
 * The user's own moves a confirmed program names, made on the server one after another, in order (POST
 * /v1/custom-exercises). Each keeps the clientId it was answered with: sent again after a failure, the server answers
 * with the move it kept the first time (ADR-024).
 */
export async function sendOwnMoves(
  api: Pick<ApiClient, 'POST'>,
  moves: Schemas['NewCustomExercise'][],
): Promise<Schemas['CustomExercise'][]> {
  const kept: Schemas['CustomExercise'][] = [];
  for (const body of moves) {
    let answer;
    try {
      answer = await api.POST('/v1/custom-exercises', { body });
    } catch {
      throw named('NoConnection', 'own move: no answer');
    }
    if (answer.data === undefined) throw named('ProgramRefused', `own move refused: HTTP ${answer.response.status}`);
    kept.push(answer.data);
  }
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

export async function sendOwnProgram(api: Pick<ApiClient, 'PUT'>, body: Schemas['OwnProgram']): Promise<Schemas['Program']> {
  let answer;
  try {
    answer = await api.PUT('/v1/program', { body });
  } catch {
    throw named('NoConnection', 'own program: no answer');
  }
  if (answer.data === undefined) throw named('ProgramRefused', `own program refused: HTTP ${answer.response.status}`);
  return answer.data;
}
