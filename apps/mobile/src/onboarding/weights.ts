/**
 * The starting weights (ADR-072 #5, K-967): the load an experienced user lifts about `starting_weight_reps` times, for each
 * of three moves, each one skippable. Kept in kg as the server keeps it (ADR-029), picked in the user's unit (a wheel, K-1058). None is
 * derived from another: a move left unset finds its load in the first session.
 */
import type { components } from '@/api/schema';
import { type UnitSystem, loadValue, parseLoadKg } from '@/units/units';

import { onboardingParams as P } from './params';

type Program = components['schemas']['Program'];

/** The weights set so far, in kg, by move; a move not here is unset. */
export type StartingWeights = Record<string, number>;

/**
 * One step of a move's stepper, in the user's unit: unset, up is an empty bar and down nothing; set, a pair of the
 * smallest plates either way, and down from the bar unset again (skipped) — never a load under the bar.
 */
export function stepWeight(kg: number | undefined, direction: 1 | -1, units: UnitSystem): number | undefined {
  const metric = units === 'METRIC';
  const step = metric ? P.startingWeightStepper.step_kg : P.startingWeightStepper.step_lb;
  const bar = metric ? P.startingWeightStepper.start_kg : P.startingWeightStepper.start_lb;
  if (kg === undefined) return direction < 0 ? undefined : toKg(bar, units);
  const next = loadValue(kg, units) + direction * step;
  return next < bar ? undefined : toKg(next, units);
}

/**
 * The rows of a lift's wheel (K-1058), in the user's unit: from the empty bar, a pair of the smallest plates apart, to the
 * top row (onboarding.json › starting_weight_stepper). Flicking to a number replaces tapping up from the bar one step at a time.
 */
export function loadValues(units: UnitSystem): number[] {
  const metric = units === 'METRIC';
  const { step_kg, start_kg, max_kg, step_lb, start_lb, max_lb } = P.startingWeightStepper;
  const [step, from, to] = metric ? [step_kg, start_kg, max_kg] : [step_lb, start_lb, max_lb];
  return Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
}

/**
 * The row the wheel stands on: the load's own, or the nearest when the unit changed since it was set; the empty bar while
 * the lift is unset — a place to start from, never a suggested load (ADR-072: none is derived).
 */
export function loadOnWheel(kg: number | undefined, units: UnitSystem): number {
  const rows = loadValues(units);
  if (kg === undefined) return rows[0];
  const value = loadValue(kg, units);
  return rows.reduce((best, row) => (Math.abs(row - value) < Math.abs(best - value) ? row : best));
}

/** A row the wheel came to rest on, kept in kg as the server keeps it (the stepper's own conversion). */
export function kgFromWheel(value: number, units: UnitSystem): number {
  return toKg(value, units);
}

/** The weights the built program can take: each move set and planned in it. The server refuses a list naming any other. */
export function weightsToSend(weights: StartingWeights, program: Program): { exerciseId: string; kg: number }[] {
  const planned = new Set(program.days.flatMap((day) => day.exercises.map((move) => move.exerciseId)));
  return Object.entries(weights)
    .filter(([exerciseId]) => planned.has(exerciseId))
    .map(([exerciseId, kg]) => ({ exerciseId, kg }));
}

const toKg = (value: number, units: UnitSystem): number => parseLoadKg(String(value), units) ?? value;
