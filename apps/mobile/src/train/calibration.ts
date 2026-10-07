/**
 * First-session calibration (K-960, ADR-075 Ek 1; G6 K-40): on a move with no target, after a set logged with
 * calibration_rir_min reps left or more, the next set is offered one load step heavier. The step is the server's
 * (PlannedExercise.calibrationStepKg, the region's, H3 B4); the phone only rounds it to the gym in use with the shared load
 * steps (`within`, the same cases as the server's LoadSteps.within), never past the step. The screen is K-973.
 */
import type { components } from '@/api/schema';

import { type GymWeights, within } from './loadSteps';

type Equipment = components['schemas']['Equipment'];

/**
 * The heaviest load the gym makes over the load just logged and at most a step over it; the step itself where the gym
 * says nothing of this equipment; null when it makes nothing inside the step (a sparse rack, 16 then 20 on a 2.5 step:
 * no suggestion rather than a jump).
 */
export function calibrationNext(loggedKg: number, stepKg: number, gym: GymWeights | null, equipment: Equipment, exerciseId: string): number | null {
  const target = Math.round((loggedKg + stepKg) * 100) / 100;
  if (gym === null) return target;
  const found = within(equipment, exerciseId, gym, loggedKg, target);
  switch (found.kind) {
    case 'to':
      return found.kg;
    case 'unknown':
      return target;
    case 'none':
      return null;
  }
}
