/**
 * The walk for the steps left today (K-1216), read with Today: the engine's step target less Apple Health's count (U1, both from
 * `stepsNumber`), the user's routes, and the stride from the profile's height. Nothing is read from where the phone is, and the
 * height is only asked for when there is a route to measure with a stride.
 */
import type { ApiClient } from '@/api/client';
import { load } from '@/today/today';

import { type Suggestion, stepsPerKm, suggestWalk } from './suggest';
import type { Walks } from './store';

export type WalkRead = { remaining: number; suggestion: Suggestion };

type Steps = { steps: number | null; target: number } | null;

export async function readWalk({ api, walks, steps }: { api: ApiClient; walks: Pick<Walks, 'current'>; steps: Steps }): Promise<WalkRead | null> {
  // No count from Apple Health: nothing is known to be left (never a whole target said as left).
  if (steps === null || steps.steps === null) return null;
  const remaining = steps.target - steps.steps;
  const routes = walks.current();
  // The height only matters to a route's steps; minutes need none, so an empty list asks nothing.
  let height: number | null = null;
  if (routes.length > 0) {
    const profile = await load(() => api.GET('/v1/profile'));
    height = profile.state === 'ready' ? profile.value.heightCm : null;
  }
  const suggestion = suggestWalk({ remaining, routes, stepsPerKm: stepsPerKm(height) });
  return suggestion === null ? null : { remaining, suggestion };
}
