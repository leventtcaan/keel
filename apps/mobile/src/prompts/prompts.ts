/**
 * The coach's own questions on the phone (K-520, ADR-039): the server asks them from the user's logs, in the app, never
 * pushed (ADR-036); the phone shows one, sends the answer once, and either shows the words it gets back or opens the
 * screen the answer leads to. No answer changes a call (U1, U2).
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

export type Prompt = components['schemas']['Prompt'];

/**
 * Where an answer takes the user, the phone's part of it (ADR-039 #5): life got in the way → saying so (the state screen,
 * K-518); a fixed time → the reminders, in Settings (K-410). Every other answer stays on Today with its reply.
 */
const LEADS_TO: Record<string, Record<string, '/state' | '/settings'>> = {
  steps_dropped: { BUSY: '/state' },
  sessions_missed: { FIXED_TIME: '/settings', LIFE: '/state' },
};

export function leadsTo(prompt: Prompt, choice: string): '/state' | '/settings' | null {
  return LEADS_TO[prompt.rule]?.[choice] ?? null;
}

/** The words for a choice: `prompt.<rule>.choice.<choice>` in en.json. */
export function choiceKey(prompt: Prompt, choice: string): string {
  return `${prompt.copyKey}.choice.${choice.toLowerCase()}`;
}

/** Sends the answer for this occurrence; the reply's copy key, if any. Throws by name (V3: never the message). */
export async function answer(api: ApiClient, prompt: Prompt, choice: string): Promise<string | null> {
  let result;
  try {
    result = await api.POST('/v1/prompts/{rule}/answers', { params: { path: { rule: prompt.rule } }, body: { key: prompt.key, choice } });
  } catch {
    throw Object.assign(new Error('prompt: no answer'), { name: 'NoConnection' });
  }
  if (result.data === undefined) throw Object.assign(new Error(`prompt not answered: HTTP ${result.response.status}`), { name: 'PromptRefused' });
  return result.data.replyCopyKey ?? null;
}
