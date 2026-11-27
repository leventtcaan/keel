/**
 * Today's steps for the walk pages (K-1251, K-1252): Apple Health's count against the engine's target (U1), and the steps in a km from
 * the profile's height (K-1216). Today's walk and the walk map read the same, so the map can say what a walk does for today.
 */
import type { ApiClient } from '@/api/client';
import { loadStarting, stepsNumber } from '@/today/numbers';
import { load } from '@/today/today';

import { stepsPerKm } from './suggest';

type Services = {
  api: ApiClient;
  syncHealth: () => Promise<{ stepsToday?: number | null } | null>;
  report: (event: { name: string }) => void;
};

export type TodaySteps = { steps: { steps: number | null; target: number } | null; perKm: number };

export async function readTodaySteps({ api, syncHealth, report }: Services): Promise<TodaySteps> {
  const named = (error: unknown) => (report({ name: error instanceof Error ? error.name : 'Unknown' }), null);
  // Apple Health asked inside the promise: a phone without it (or a screen given none) still reads the target and the height.
  const health = Promise.resolve().then(syncHealth).catch(named);
  const [count, targets, profile] = await Promise.all([health, load(() => api.GET('/v1/targets')), load(() => api.GET('/v1/profile'))]);
  const starting = await loadStarting(api, targets);
  return { steps: stepsNumber(targets, starting, count?.stepsToday), perKm: stepsPerKm(profile.state === 'ready' ? profile.value.heightCm : null) };
}

/** The steps left today; not a number when the target or the count is not known. */
export const stepsLeft = (steps: TodaySteps['steps']): number => (steps === null || steps.steps === null ? Number.NaN : steps.target - steps.steps);
