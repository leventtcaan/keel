/**
 * What was skipped in the open session (K-972, ADR-075 #5): sets and moves, by move. Never sent: a skipped set is no set,
 * a skipped move has none (the engine reads what is not there, ADR-075 #5 "Hold"). Kept on the phone with the workout it
 * belongs to, so a session opened again shows them; gone at the finish and at sign-out.
 */
import type { KeyValue } from '@/units/preference';

import type { Skipped } from './workout';

export type Skips = Record<string, Skipped>;

const KEY = 'train.skips';

const isSkipped = (value: unknown): value is Skipped => {
  const v = value as Skipped | null;
  return (
    v !== null &&
    typeof v === 'object' &&
    typeof v.move === 'boolean' &&
    Array.isArray(v.sets) &&
    v.sets.every((s) => (s.side === 'BOTH' || s.side === 'LEFT' || s.side === 'RIGHT') && Number.isInteger(s.set) && s.set >= 0)
  );
};

export type SessionSkips = ReturnType<typeof createSessionSkips>;

export function createSessionSkips(kv: KeyValue) {
  return {
    /** The workout's skips as kept; none for another workout, nothing kept, or what cannot be read. */
    async read(workout: string): Promise<Skips> {
      try {
        const kept = JSON.parse((await kv.getItemAsync(KEY)) ?? 'null') as { workout?: unknown; skips?: unknown } | null;
        if (kept === null || kept.workout !== workout || typeof kept.skips !== 'object' || kept.skips === null) return {};
        return Object.fromEntries(Object.entries(kept.skips).filter(([, skipped]) => isSkipped(skipped))) as Skips;
      } catch {
        return {};
      }
    },
    async keep(workout: string, skips: Skips): Promise<void> {
      await kv.setItemAsync(KEY, JSON.stringify({ workout, skips }));
    },
    async forget(): Promise<void> {
      await kv.removeItemAsync(KEY);
    },
  };
}
