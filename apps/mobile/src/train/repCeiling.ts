/**
 * The rep ceiling on a sparse rack (K-534, ADR-045 #73): the server stops a target at the range's top +
 * rep_ceiling_above_range when the gym has no next load to reach. The same cases as the backend
 * (contracts/fixtures/rep-ceiling.json).
 */
export function atCeiling(range: { min: number; max: number }, reps: number, ceilingAbove: number): boolean {
  return reps >= range.max + ceilingAbove;
}
