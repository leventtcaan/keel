/**
 * A move's screen (K-418, ADR-017): the coaching tips, chosen by the move. Full range of motion everywhere (G1 K-50) but on the
 * back, where the reps go on past the slowdown as partials to end the set (K-56, K-57; the back muscles: back_muscles). Controlled lowering, a
 * lift with intent, no tempo in seconds (K-45). The last rep slowing down on its own ends the set (K-8) — on an isolation
 * move that signal does not come, so it is not said.
 */
import { bodyBack } from 'react-native-body-highlighter/dist/assets/bodyBack';
import { bodyFemaleBack } from 'react-native-body-highlighter/dist/assets/bodyFemaleBack';
import { bodyFemaleFront } from 'react-native-body-highlighter/dist/assets/bodyFemaleFront';
import { bodyFront } from 'react-native-body-highlighter/dist/assets/bodyFront';

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

/** The muscle map's figure: the profile's sex (ADR-037 › 49); the library draws both. */
export type Figure = 'male' | 'female';

/**
 * Every area of the muscle map's drawing (front and back, head and hands too), from the library's own drawing of the
 * figure: each is given a colour from the theme, as one left out keeps the drawing's built-in grey (dark on dark).
 */
export function drawingAreas(figure: Figure = 'male'): string[] {
  const parts = figure === 'female' ? [...bodyFemaleFront, ...bodyFemaleBack] : [...bodyFront, ...bodyBack];
  return [...new Set(parts.flatMap((part) => (part.slug === undefined ? [] : [part.slug])))];
}
