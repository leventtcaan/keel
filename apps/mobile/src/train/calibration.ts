/**
 * First-session calibration (K-960, ADR-075 Ek 1; G6 K-40): on a move with no target, after a set logged with
 * calibration_rir_min reps left or more, the next set is offered one load step heavier. The step is the server's
 * (PlannedExercise.calibrationStepKg, the region's, H3 B4); the phone only rounds it to the gym in use with the shared load
 * steps (`within`, the same cases as the server's LoadSteps.within), never past the step. The screen is K-973.
 */
import type { components } from '@/api/schema';

import { type GymWeights, within } from './loadSteps';
import { workoutParams } from './params';

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

/** What the last set of a move with no target says (ADR-075 #3): its weight is light, a heavier one offered; or the weight is found. */
export type CalibrationRead = { kind: 'light'; nextKg: number } | { kind: 'found'; kg: number };

/**
 * The first sets of a move with no target (no nextLoadKg: a move at its first session, or one swapped in, ADR-075 Ek 7),
 * read from the last set done of it. In the range with calibration_rir_min reps left or more (2+) the weight is light, and
 * the next set is offered one step heavier as the gym makes it (calibrationNext); otherwise the weight is found. A set under
 * the range's bottom says nothing yet, a move with a target is not calibrated, and the body alone has no weight to find (a
 * bodyweight move; an added load of 0 is the body alone too, though a heavier one is still offered).
 * Only a move with no history (`history` false, ADR-075 Ek 8) is calibrated: the server sends the step with every move that
 * has no target, an isolation move at each session, and a move done before has its weight already.
 * Nothing is decided here: the range, the step and the reps left are the server's and the parameters'.
 *
 * Source of "found" (ADR-075 Ek 1, Ek 8; G6 K-40 [tecrübe]): a set in the range with fewer than calibration_rir_min reps left
 * is a working set at that weight (K-40: RIR 1-2 counts, more than 2 left does not). The picker's "2+" cannot tell 2 from 3
 * or more, so it reads as light (the offer above), never as found. It is a reading of one set, not a target: the next
 * session's load stays the server's.
 */
export function calibrationRead(
  planned: components['schemas']['PlannedExercise'],
  move: components['schemas']['Exercise'],
  gym: GymWeights | null,
  set: components['schemas']['NewSet'] | null,
  history: boolean,
): CalibrationRead | null {
  if (history || planned.nextLoadKg !== undefined || move.load === 'BODYWEIGHT' || set === null || set.reps < planned.reps.min) return null;
  if (set.rir !== undefined && set.rir >= workoutParams.calibrationRirMin && planned.calibrationStepKg !== undefined) {
    const nextKg = calibrationNext(set.loadKg, planned.calibrationStepKg, gym, move.equipment, move.id);
    if (nextKg !== null) return { kind: 'light', nextKg };
  }
  return set.loadKg > 0 ? { kind: 'found', kg: set.loadKg } : null;
}

/**
 * "Too heavy?" (G1 decision #61): the server's lighter load (lighterLoadKg, ADR-075 Ek 1), when it is lighter than the one
 * shown; none where the server had none (the bottom of the rack, no load to start from) or the person is under it already.
 */
export function lighterOffer(planned: components['schemas']['PlannedExercise'], shownKg: number | null): number | null {
  const lighter = planned.lighterLoadKg;
  return lighter === undefined || shownKg === null || lighter >= shownKg ? null : lighter;
}
