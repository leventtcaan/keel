/**
 * A move's screen (K-418, ADR-017): Güray's tips, chosen by the move. Full range of motion everywhere (G1 K-50) but on the
 * back, where the reps go on past the slowdown as partials to end the set (K-56, K-57; the back muscles: back_muscles). Controlled lowering, a
 * lift with intent, no tempo in seconds (K-45). The last rep slowing down on its own ends the set (K-8) — on an isolation
 * move that signal does not come, so it is not said.
 */
import type { components } from '@/api/schema';

import { workoutParams } from './params';

type Schemas = components['schemas'];

/** The copy keys of the move's tips, in the order they are shown. */
export function tipsFor(move: Schemas['Exercise']): string[] {
  const back = move.muscles.some((muscle) => workoutParams.backMuscles.includes(muscle));
  // On the back the set goes on past the slowdown with partial reps (K-56, K-57): no "that's where the set ends" there.
  const lastRep = move.kind !== 'ISOLATION' && !back;
  return [back ? 'demo.tip.backRange' : 'demo.tip.fullRange', 'demo.tip.tempo', ...(lastRep ? ['demo.tip.lastRep'] : [])];
}

/** The muscle map's areas of a move (the drawing's names, muscle_map_areas), each once, in the move's order. */
export function mapAreas(move: Schemas['Exercise']): string[] {
  return [...new Set(move.muscles.flatMap((muscle) => workoutParams.muscleMapAreas[muscle] ?? []))];
}
