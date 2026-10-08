/**
 * Sending the program the user confirmed (K-968, ADR-073 #1): PUT /v1/program keeps it as their own (OWN), replacing any
 * before it, and answers with the program as kept, its review on it. A failure is named, never what was in it (V3):
 * NoConnection (no answer), ProgramRefused (the server's no). Nothing is kept on the phone: the same program can go again.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

type Schemas = components['schemas'];

const named = (name: 'NoConnection' | 'ProgramRefused', message: string) => Object.assign(new Error(message), { name });

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
