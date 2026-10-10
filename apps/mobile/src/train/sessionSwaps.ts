/**
 * A move swapped inside the open session (K-972, ADR-073 #6, ADR-075 #5): for this workout only. Never sent: the server
 * refuses a swap for today once the day's workout has started (CONFLICT, ADR-073 Ek 3: "swaps in the session itself"), and
 * the sets done are what it learns from, each under the move it was done on. Kept on the phone with the workout it belongs
 * to, so a session opened again shows them; gone at the finish and at sign-out. The new move takes the planned
 * move's sets, range and aim and starts with no target and no weight of its own (ADR-075 Ek 7: the server's per-option
 * table is K-1011's).
 */
import type { components } from '@/api/schema';
import type { KeyValue } from '@/units/preference';

type Planned = components['schemas']['PlannedExercise'];

/** The move the session started with, by id → the move done in its place. */
export type Swaps = Record<string, string>;

const KEY = 'train.swaps';

export type SessionSwaps = ReturnType<typeof createSessionSwaps>;

export function createSessionSwaps(kv: KeyValue) {
  return {
    /** The workout's swaps as kept; none for another workout, nothing kept, or what cannot be read. */
    async read(workout: string): Promise<Swaps> {
      try {
        const kept = JSON.parse((await kv.getItemAsync(KEY)) ?? 'null') as { workout?: unknown; swaps?: unknown } | null;
        if (kept === null || kept.workout !== workout || typeof kept.swaps !== 'object' || kept.swaps === null) return {};
        return Object.fromEntries(Object.entries(kept.swaps).filter(([, to]) => typeof to === 'string' && to !== ''));
      } catch {
        return {};
      }
    },
    async keep(workout: string, swaps: Swaps): Promise<void> {
      await kv.setItemAsync(KEY, JSON.stringify({ workout, swaps }));
    },
    async forget(): Promise<void> {
      await kv.removeItemAsync(KEY);
    },
  };
}

/**
 * The swaps that still hold against the plan: what is kept on the phone is read back as the user left it, and the plan can
 * have changed since (a week read again, a move out of the catalog). A swap holds when its planned move is in the session's
 * moves, the new move is one the server offered for it (`swapOptions`) and the phone has in its catalog (a set of any other
 * would be refused), and it is not another of the day's planned moves (it would be there twice). The rest are left out, not
 * repaired: the planned move stands.
 */
export function validSwaps(today: Planned[], swaps: Swaps, known: (id: string) => boolean): Swaps {
  const planned = new Set(today.map((p) => p.exerciseId));
  return Object.fromEntries(
    Object.entries(swaps).filter(([from, to]) => {
      const options = today.find((p) => p.exerciseId === from)?.swapOptions ?? [];
      return to !== from && options.includes(to) && known(to) && !planned.has(to);
    }),
  );
}

/** The session's moves with its swaps in place: a swapped move is the new one on the planned one's sets, range and aim. */
export function applySwaps(today: Planned[], swaps: Swaps, known: (id: string) => boolean): Planned[] {
  const held = validSwaps(today, swaps, known);
  return today.map((planned) => {
    const to = held[planned.exerciseId];
    return to === undefined ? planned : { exerciseId: to, baseSets: planned.baseSets, sets: planned.sets, reps: planned.reps, targetRir: planned.targetRir };
  });
}

/**
 * What a move can be swapped for: the server's `swapOptions` of the move the session started with (its gym's equipment
 * and muscles already counted), the move now in its place left out and the ones the session already has; with a swap in
 * force, the planned move comes first ("Back to the planned move"). The ones the phone has no catalog entry for are left
 * out: a set of one would be refused. Nothing is chosen here.
 */
export function swapChoices(base: Planned, current: string, inSession: ReadonlySet<string>, known: (id: string) => boolean): string[] {
  const back = current === base.exerciseId ? [] : [base.exerciseId];
  const others = (base.swapOptions ?? []).filter((id) => id !== current && !inSession.has(id));
  return [...new Set([...back, ...others])].filter(known);
}
