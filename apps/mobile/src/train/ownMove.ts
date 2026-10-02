/**
 * The user's own move (K-416, ADR-035): the questions the engine needs answered of a move the catalog does not have —
 * compound or isolation, what is lifted, one side at a time — asked, never assumed (U1). Bodyweight equipment goes with
 * a bodyweight load and only with one (the server's rule): the load model is not asked, only whether weight is added.
 */
import type { components } from '@/api/schema';

import { workoutParams } from './params';

type Schemas = components['schemas'];

export type OwnAnswers = {
  name: string;
  kind: Schemas['NewCustomExercise']['kind'] | null;
  equipment: Schemas['Equipment'] | null;
  /** Asked when the body is the equipment: a plate or a dumbbell added. */
  added: boolean | null;
  unilateral: boolean | null;
};

/** The body to send, or null while a question is unanswered or the name is not one the server takes. */
export function ownMoveBody(answers: OwnAnswers, clientId: string): Schemas['NewCustomExercise'] | null {
  const name = answers.name.trim();
  const length = [...name].length; // code points, as the server counts them
  const { kind, equipment, added, unilateral } = answers;
  if (length < 1 || length > workoutParams.ownMoveNameMaxChars || kind === null || equipment === null || unilateral === null) return null;
  if (equipment === 'BODYWEIGHT' && added === null) return null;
  const load = equipment !== 'BODYWEIGHT' ? 'EXTERNAL' : added === true ? 'BODYWEIGHT_PLUS_EXTERNAL' : 'BODYWEIGHT';
  return { clientId, name, kind, load, equipment, unilateral };
}
