/**
 * Sending the program the user confirmed (K-968, ADR-073 #1): PUT /v1/program keeps it as their own (OWN), replacing any
 * before it, and answers with the program as kept, its review on it. A failure is named, never what was in it (V3):
 * NoConnection (no answer), ProgramRefused (the server's no). Nothing is kept on the phone: the same program can go again.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

type Schemas = components['schemas'];

const named = (name: 'NoConnection' | 'ProgramRefused', message: string) => Object.assign(new Error(message), { name });

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
