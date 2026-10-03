/**
 * The warm-up calculator (K-417). How many: coaching experience (G1 K-17) — at least one before each move, 3–4 before the day's first;
 * warm-ups never come near failure. How heavy and how many reps: no source gives a ramp (L3 §1.1 #3: a presentation
 * rule, a parameter with its note), so it is the app's, in data/parameters/workout.json, until a product decision confirms it.
 * Each load is one the gym in use makes (ADR-032, the same rounding as the server's); without a gym on the phone, the
 * parameter's step in the user's unit. Lighter than the work load, no two the same; with the gym known, never below its
 * bar (without one the bar is unknown). A work load with nothing lighter in the gym has no warm-up (soru 43).
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
  const ramp = first ? workoutParams.warmup.first : workoutParams.warmup.other;
  // A bodyweight move warms up with the body alone: one easy set, nothing added (no lighter load to climb from), whether
  // or not its added load is known yet.
  if (move.load !== 'EXTERNAL') return [{ loadKg: 0, reps: ramp.reps[0] }];
  if (workKg === null) return [];
  const found: Warmup[] = [];
  ramp.fractions.forEach((fraction, i) => {
    const loadKg = nearest(workKg * fraction, move, gym, units);
    // Lighter than the work and climbing: a load that rounds onto the one before, or onto the work load, is dropped.
    if (loadKg > 0 && loadKg < workKg && !found.some((w) => w.loadKg === loadKg)) found.push({ loadKg, reps: ramp.reps[i] });
  });
  return found;
}

type NewSet = Schemas['NewSet'];

const SIDES: Schemas['Side'][] = ['LEFT', 'RIGHT'];

const warmupsOf = (sets: NewSet[], move: Schemas['Exercise']) => sets.filter((s) => s.exerciseId === move.id && s.setType === 'WARM_UP');
const ofSide = (sets: NewSet[], side: Schemas['Side']) => sets.filter((s) => s.side === side).length;

/** How many of the move's warm-ups are logged; a one-sided move's counts when both its sides are. */
export function warmupsDone(sets: NewSet[], move: Schemas['Exercise']): number {
  const mine = warmupsOf(sets, move);
  return move.unilateral ? Math.min(...SIDES.map((side) => ofSide(mine, side))) : mine.length;
}

/**
 * The sets one tap logs for the next warm-up (no RIR, no id yet). A one-sided move's warm-up is each side (the server
 * takes one side a set): a side already logged for it — the other failed to save — is not logged twice.
 */
export function warmupSets(warmup: Warmup, move: Schemas['Exercise'], sets: NewSet[]): Omit<NewSet, 'clientId'>[] {
  const set = { exerciseId: move.id, setType: 'WARM_UP' as const, loadKg: warmup.loadKg, reps: warmup.reps };
  if (!move.unilateral) return [set];
  const mine = warmupsOf(sets, move);
  const done = warmupsDone(sets, move);
  return SIDES.filter((side) => ofSide(mine, side) <= done).map((side) => ({ ...set, side }));
}
