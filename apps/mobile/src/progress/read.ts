/**
 * What the Progress tab reads (K-979, ADR-078): each part from its own endpoint with its own state, so a part that is
 * not there yet, or behind the health data consent, never blanks the others (the Today screen's way, K-401). Nothing here
 * counts or decides: the server's facts are kept as sent.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { type Loaded, load } from '@/today/today';
import type { Move } from '@/train/trainData';

type Schemas = components['schemas'];

export type ProgressRead = {
  training: Loaded<Schemas['TrainingProgress']>;
  consistency: Loaded<Schemas['Consistency']>;
  summary: Loaded<Schemas['WeighInSummary']>;
  budget: Loaded<Schemas['DayBudget']>;
  program: Loaded<Schemas['Program']>;
  /** Asked only while there is no first call: after it the plan's own targets are the day's, not the starting ones. */
  starting: Loaded<Schemas['StartingTarget']> | null;
  /** Today's steps as Apple Health counts them (Today's read); null when Health was not read. */
  stepsToday: number | null;
  /** The catalog's moves and the user's own, for the names of the lifts. */
  moves: ReadonlyMap<string, Move>;
};

/** The server's parts at once; `day` is today on the phone's calendar. */
export async function loadProgress(api: ApiClient, day: string): Promise<Pick<ProgressRead, 'training' | 'consistency' | 'summary' | 'budget' | 'program' | 'starting'>> {
  const [training, consistency, summary, budget, program] = await Promise.all([
    load(() => api.GET('/v1/training-progress')),
    load(() => api.GET('/v1/consistency')),
    load(() => api.GET('/v1/weigh-ins/summary')),
    load(() => api.GET('/v1/days/{day}/budget', { params: { path: { day } } })),
    load(() => api.GET('/v1/program')),
  ]);
  // The starting numbers are the first days' only: once a first call exists the server refuses them (CONFLICT).
  const starting = consistency.state === 'ready' ? null : await load(() => api.GET('/v1/targets/starting'));
  return { training, consistency, summary, budget, program, starting };
}
