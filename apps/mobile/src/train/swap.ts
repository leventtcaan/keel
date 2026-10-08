/**
 * What a swap offers (K-970, ADR-073 #6, Ek 3): the planned move's `swapOptions` as the server worked them out (its
 * alternatives, then the same muscle and kind; the gym's missing equipment and the day's moves left out), never the move
 * as it is now. For today only, not a move the session already has (an earlier swap for today put it there: the server
 * would refuse it); from now on the program's day is what counts, and the server's list is it. A move swapped for today
 * offers the planned move back first ("Back to the planned move": the server undoes the swap). Nothing is chosen here:
 * the server's list, filtered by what the session shows.
 */
import type { components } from '@/api/schema';

import type { Found } from './week';

type Schemas = components['schemas'];

/**
 * `planned`: the program's move (what the swap names); `current`: the move in its place today, or the planned one.
 * `options`: what can take its place from now on (with the planned move first when swapped for today); `todayOptions`:
 * those that can for today.
 */
export type SwapChoice = {
  planned: Schemas['PlannedExercise'];
  current: Schemas['PlannedExercise'];
  swapped: boolean;
  options: string[];
  todayOptions: string[];
};

export function swapChoice(today: Found, plannedId: string): SwapChoice | null {
  const planned = today.day.exercises.find((e) => e.exerciseId === plannedId);
  if (planned === undefined) return null;
  const swap = today.session.swaps?.find((s) => s.insteadOf === plannedId);
  const current = swap?.exercise ?? planned;
  const back = swap === undefined ? [] : [planned.exerciseId];
  const options = [...new Set([...back, ...(planned.swapOptions ?? []).filter((id) => id !== current.exerciseId)])];
  const inSession = new Set(today.session.exerciseIds);
  return { planned, current, swapped: swap !== undefined, options, todayOptions: options.filter((id) => id === planned.exerciseId || !inSession.has(id)) };
}
