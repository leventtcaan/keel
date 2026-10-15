/**
 * What the Progress tab reads (K-979, ADR-078): each part from its own endpoint with its own state, so a part that is
 * not there yet, or behind the health data consent, never blanks the others (the Today screen's way, K-401). Nothing here
 * counts or decides: the server's facts are kept as sent.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { type Loaded, load, localDay } from '@/today/today';
import type { Move } from '@/train/trainData';

import { progressParams } from './params';

const DAY_MS = 24 * 60 * 60 * 1000;

type Schemas = components['schemas'];

export type ProgressRead = {
  training: Loaded<Schemas['TrainingProgress']>;
  consistency: Loaded<Schemas['Consistency']>;
  summary: Loaded<Schemas['WeighInSummary']>;
  budget: Loaded<Schemas['DayBudget']>;
  program: Loaded<Schemas['Program']>;
  /** Asked only while there is no first call: after it the plan's own targets are the day's, not the starting ones. */
  starting: Loaded<Schemas['StartingTarget']> | null;
  /** The latest calls (the Calls card): the first page of the ledger, as many as progress.json shows. */
  calls: Loaded<Schemas['DecisionPage']>;
  /** The 7-day average of the chart's window; asked only once the trend is ready (`trendReady`), null before. */
  trend: Loaded<Schemas['TrendPoint'][]> | null;
  /** Today's steps as Apple Health counts them (Today's read); null when Health was not read. */
  stepsToday: number | null;
  /** The catalog's moves and the user's own, for the names of the lifts. */
  moves: ReadonlyMap<string, Move>;
};

/** The server's parts at once; `day` is today on the phone's calendar. */
export async function loadProgress(api: ApiClient, day: string): Promise<Omit<ProgressRead, 'stepsToday' | 'moves'>> {
  const [training, consistency, summary, budget, program, calls] = await Promise.all([
    load(() => api.GET('/v1/training-progress')),
    load(() => api.GET('/v1/consistency')),
    load(() => api.GET('/v1/weigh-ins/summary')),
    load(() => api.GET('/v1/days/{day}/budget', { params: { path: { day } } })),
    load(() => api.GET('/v1/program')),
    load(() => api.GET('/v1/decisions', { params: { query: { limit: progressParams.callsShown } } })),
  ]);
  // The starting numbers are the first days' only: once a first call exists the server refuses them (CONFLICT).
  const asksStarting = consistency.state !== 'ready';
  // The weight chart is drawn from the server's points in its window, and only when the server says the trend is ready.
  const from = localDay(new Date(Date.parse(`${day}T12:00:00`) - (progressParams.weightChartDays - 1) * DAY_MS));
  const asksTrend = summary.state === 'ready' && summary.value.trendReady;
  const [starting, trend] = await Promise.all([
    asksStarting ? load(() => api.GET('/v1/targets/starting')) : null,
    asksTrend ? load(() => api.GET('/v1/weight-trend', { params: { query: { from, to: day } } })) : null,
  ]);
  return { training, consistency, summary, budget, program, starting, calls, trend };
}
