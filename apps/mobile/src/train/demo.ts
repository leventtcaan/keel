/**
 * A move's screen (K-418, ADR-017): Güray's tips, chosen by the move. Full range of motion everywhere (G1 K-50) but on the
 * back, where partial reps at the end of a set are fine (K-56; the back muscles: back_muscles). Controlled lowering, a
 * lift with intent, no tempo in seconds (K-45). The last rep slowing down on its own ends the set (K-8) — on an isolation
 * move that signal does not come, so it is not said.
 */
import type { components } from '@/api/schema';

import { workoutParams } from './params';

type Schemas = components['schemas'];

/** The copy keys of the move's tips, in the order they are shown. */
export function tipsFor(move: Schemas['Exercise']): string[] {
  const back = move.muscles.some((muscle) => workoutParams.backMuscles.includes(muscle));
  return [back ? 'demo.tip.backRange' : 'demo.tip.fullRange', 'demo.tip.tempo', ...(move.kind === 'ISOLATION' ? [] : ['demo.tip.lastRep'])];
}
