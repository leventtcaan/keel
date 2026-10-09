/**
 * A review suggestion in words (ADR-073 #2, Ek 1): the app's copy (`copyKey`, title and body) with the server's numbers
 * and the muscle's or the move's name. Shared by onboarding's review and the Edit page (K-968, K-970).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

import { exerciseName } from './program';

type Suggestion = components['schemas']['ReviewSuggestion'];

export function suggestionWords(suggestion: Suggestion, part: 'title' | 'body'): string {
  const { copyKey, numbers, muscle, exerciseId } = suggestion;
  return t(`${copyKey}.${part}`, {
    ...numbers,
    ...(muscle === undefined ? {} : { muscle: t(`demo.muscle.${muscle}`) }),
    ...(exerciseId === undefined ? {} : { exercise: exerciseName(exerciseId) }),
  });
}
