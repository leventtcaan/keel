/**
 * The Monday check-in (K-501, U9): what the server asks this week and the answers to send. Pure, except the two calls.
 * Nothing here keeps an answer anywhere: they live on the screen until they are sent, and CYCLE_STOPPED's is health data
 * that is not kept at all (V4, ADR-020 L-1) — no queue, no store, no log.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { type Loaded, load } from '@/today/today';
import { parseWaistCm, type UnitSystem } from '@/units/units';

type Schemas = components['schemas'];
export type CheckIn = Schemas['CheckIn'];
export type Question = Schemas['Question'];
export type QuestionKind = Schemas['QuestionKind'];
export type Answer = Schemas['Answer'];

/** What the user picked or typed so far, by question: a choice, a step of the scale, or the typed length. */
export type Picks = Partial<Record<QuestionKind, string>>;

export const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** The words of a choice: checkIn.choice.<kind>.<choice>, both lowercased (the contract's rule). */
export function choiceKey(kind: QuestionKind, choice: string): string {
  return `checkIn.choice.${kind.toLowerCase()}.${choice.toLowerCase()}`;
}

/** The answer a pick makes, or null when it is not one the question takes. */
export function answerOf(question: Question, pick: string | undefined, units: UnitSystem): Answer | null {
  if (pick === undefined) return null;
  switch (question.format) {
    case 'CHOICE':
      return question.choices?.includes(pick) ? { kind: question.kind, choice: pick } : null;
    case 'SCALE_1_10': {
      const scale = Number(pick);
      return (SCALE as readonly number[]).includes(scale) ? { kind: question.kind, scale } : null;
    }
    case 'CENTIMETRES': {
      const cm = parseWaistCm(pick, units);
      return cm === null || cm <= 0 ? null : { kind: question.kind, cm };
    }
  }
}

/** Every question's answer, in the order asked — or null while one is missing (the call waits for all). */
export function answersOf(checkIn: CheckIn, picks: Picks, units: UnitSystem): Answer[] | null {
  const answers = checkIn.questions.map((question) => answerOf(question, picks[question.kind], units));
  return answers.every((answer): answer is Answer => answer !== null) ? answers : null;
}

export function loadCheckIn(api: ApiClient): Promise<Loaded<CheckIn>> {
  return load(() => api.GET('/v1/check-ins/current'));
}

/** Why a send did not give a call, by name only (V3, V4: never what was answered). */
export type SendProblem = 'NoConnection' | 'Moved' | 'Consent' | 'ServerError';

/** Sends the answers; the week's call, or why not. A 409 is the week having moved, or its call already made. */
export async function sendAnswers(api: ApiClient, body: Schemas['CheckInAnswers']): Promise<{ call: Schemas['Decision'] } | { problem: SendProblem }> {
  let answer;
  try {
    answer = await api.POST('/v1/check-ins/current/answers', { body });
  } catch {
    return { problem: 'NoConnection' };
  }
  if (answer.data !== undefined) return { call: answer.data };
  if (answer.response.status === 409) return { problem: 'Moved' };
  // The consent withdrawn on another device since the questions were read.
  return { problem: answer.response.status === 403 && answer.error?.code === 'CONSENT_REQUIRED' ? 'Consent' : 'ServerError' };
}
