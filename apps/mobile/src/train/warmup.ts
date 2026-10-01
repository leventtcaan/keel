/**
 * The warm-up calculator (K-417). How many: Güray G1 K-17 — at least one before each move, 3–4 before the day's first;
 * warm-ups never come near failure. How heavy and how many reps: no source gives a ramp (L3 §1.1 #3: a presentation
 * rule, a parameter with its note), so it is the app's, in data/parameters/workout.json, until Levent confirms it.
 * Each load is one the gym in use makes (ADR-032, the same rounding as the server's); without a gym on the phone, the
 * parameter's step in the user's unit. Lighter than the work load, never below the bar, no two the same.
 */
import type { components } from '@/api/schema';
import type { UnitSystem } from '@/units/units';

import { type GymWeights, round } from './loadSteps';
import { workoutParams } from './params';

type Schemas = components['schemas'];
export type Warmup = { loadKg: number; reps: number };

const KG_PER_LB = 0.45359237;

/** The nearest load the gym makes; without a gym, the nearest step of the user's unit (stored as the app stores a typed load). */
function nearest(targetKg: number, move: Schemas['Exercise'], gym: GymWeights | null, units: UnitSystem): number {
  if (gym !== null) {
    const rounded = round(move.equipment, move.id, gym, 0, targetKg);
    if (rounded.kind === 'to') return rounded.kg;
  }
  const { roundKg, roundLb } = workoutParams.warmup;
  if (units === 'METRIC') return Math.round(targetKg / roundKg) * roundKg;
  const lb = Math.round(targetKg / KG_PER_LB / roundLb) * roundLb;
  return Math.round(lb * KG_PER_LB * 100) / 100;
}

export function warmups(workKg: number | null, move: Schemas['Exercise'], first: boolean, gym: GymWeights | null, units: UnitSystem): Warmup[] {
  if (workKg === null) return [];
  const ramp = first ? workoutParams.warmup.first : workoutParams.warmup.other;
  // A bodyweight move warms up with the body alone: one easy set, nothing added (no lighter load to climb from).
  if (move.load !== 'EXTERNAL') return [{ loadKg: 0, reps: ramp.reps[0] }];
  const found: Warmup[] = [];
  ramp.fractions.forEach((fraction, i) => {
    const loadKg = nearest(workKg * fraction, move, gym, units);
    // Lighter than the work and climbing: a load that rounds onto the one before, or onto the work load, is dropped.
    if (loadKg > 0 && loadKg < workKg && !found.some((w) => w.loadKg === loadKg)) found.push({ loadKg, reps: ramp.reps[i] });
  });
  return found;
}
