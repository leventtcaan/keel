/**
 * The days the app was opened, kept on the phone only (K-521, ADR-041 #66: never sent): the last one, and the one before
 * today — the week-5 risk's "the app not opened" (I1 F2) reads it.
 */
import type { KeyValue } from '@/units/preference';

const KEY = 'keel.opens';

type Kept = { last: string; before: string | null };

export function createOpens({ kv, today }: { kv: KeyValue; today: () => string }) {
  return {
    /** Today's open counted; the day the app was opened before today, none the first time. */
    previous: async (): Promise<string | null> => {
      const day = today();
      const raw = await kv.getItemAsync(KEY);
      const kept = raw === null ? null : (JSON.parse(raw) as Kept);
      if (kept !== null && kept.last === day) return kept.before;
      await kv.setItemAsync(KEY, JSON.stringify({ last: day, before: kept?.last ?? null } satisfies Kept));
      return kept?.last ?? null;
    },
    /** A signed-out phone keeps no open days of the account that left. */
    forget: async (): Promise<void> => {
      await kv.removeItemAsync(KEY);
    },
  };
}

export type Opens = ReturnType<typeof createOpens>;
