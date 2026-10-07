/**
 * The appearance choice (ADR-070 #3): Light, Dark or System, Light until the person picks. A phone setting, so it lives
 * on the phone only; it goes at sign-out like every other setting kept for the account (the next person starts on Light).
 */
import type { KeyValue } from '@/units/preference';

export type Appearance = 'light' | 'dark' | 'system';

const KEY = 'appearance';
const DEFAULT: Appearance = 'light';
const isAppearance = (value: string | null): value is Appearance => value === 'light' || value === 'dark' || value === 'system';

export type AppearancePreference = Awaited<ReturnType<typeof createAppearance>>;

export async function createAppearance({ kv }: { kv: KeyValue }) {
  const kept = await kv.getItemAsync(KEY);
  let current: Appearance = isAppearance(kept) ? kept : DEFAULT;
  const listeners = new Set<() => void>();

  const change = (next: Appearance) => {
    if (next === current) return;
    current = next;
    listeners.forEach((listener) => listener());
  };

  return {
    /** Synchronous, for rendering (useSyncExternalStore). */
    current: (): Appearance => current,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    set: async (next: Appearance): Promise<void> => {
      await kv.setItemAsync(KEY, next);
      change(next);
    },

    forget: async (): Promise<void> => {
      await kv.removeItemAsync(KEY);
      change(DEFAULT);
    },
  };
}
