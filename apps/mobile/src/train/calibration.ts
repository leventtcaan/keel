/**
 * First-session calibration (K-960, ADR-075 Ek 1; G6 K-40): on a move with no target, after a set logged with
 * calibration_rir_min reps left or more, the next set is offered one load step heavier. The step is the server's
 * (PlannedExercise.calibrationStepKg, the region's, H3 B4); the phone only rounds it to the gym in use with the shared load
 * steps, the path warm-ups take (K-417). The screen that offers it is K-973.
 */
import type { components } from '@/api/schema';

import { type GymWeights, round } from './loadSteps';

type Equipment = components['schemas']['Equipment'];

/** The load just logged plus the step, as the gym makes it; null when the gym makes nothing heavier. */
export function calibrationNext(loggedKg: number, stepKg: number, gym: GymWeights | null, equipment: Equipment, exerciseId: string): number | null {
  const target = Math.round((loggedKg + stepKg) * 100) / 100;
  if (gym === null) return target;
  const rounding = round(equipment, exerciseId, gym, loggedKg, target);
  switch (rounding.kind) {
    case 'to':
      return rounding.kg;
    case 'unknown':
      return target;
    case 'noHeavier':
    case 'tooFar':
      return null;
  }
}
