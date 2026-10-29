/**
 * Whether the first-use guide was shown on this phone (K-1065): one mark in the small settings store, `guide.seen`, so the guide
 * comes once, right after the plan, and again only when the user asks for it in Settings. It belongs to the account (a sign-out
 * forgets it, as the next person to sign in on this phone has not seen it). Nothing is sent anywhere.
 */
import type { KeyValue } from '@/units/preference';

const SEEN = 'guide.seen';

export type GuideMark = ReturnType<typeof createGuideMark>;

export function createGuideMark({ kv }: { kv: KeyValue }) {
  return {
    /** Whether it was shown already; a mark that cannot be read counts as shown, so a broken store never makes it come back. */
    seen: async (): Promise<boolean> => {
      try {
        return (await kv.getItemAsync(SEEN)) !== null;
      } catch {
        return true;
      }
    },
    /** Kept as it opens, not as it ends: a guide cut short by closing the app is not shown again. */
    markSeen: (): Promise<void> => kv.setItemAsync(SEEN, 'yes'),
    forget: (): Promise<unknown> => kv.removeItemAsync(SEEN),
  };
}
