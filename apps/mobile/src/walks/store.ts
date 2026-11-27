/**
 * "My walks" (K-1216): up to three named routes, each a one-way distance the user typed. Personal, so kept on the phone only
 * (the small settings store) and never sent anywhere; it belongs to the account and goes with a sign-out. No place, no coordinates:
 * a name and a number (a walk kept from the map adds its two places' ids, K-1251; the places themselves stay in "My places").
 */
import type { KeyValue } from '@/units/preference';

import { walkParams as W } from './params';
import type { WalkRoute } from './suggest';

const KEY = 'walks.routes';

export type Walks = Awaited<ReturnType<typeof createWalks>>;

const failure = (name: 'WalkLimit' | 'WalkInvalid') => Object.assign(new Error(name), { name });

function routesOf(kept: string | null): WalkRoute[] {
  if (kept === null) return [];
  try {
    const value = JSON.parse(kept) as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter((r): r is WalkRoute => r !== null && typeof r === 'object' && typeof r.id === 'string' && typeof r.name === 'string' && typeof r.km === 'number' && r.km > 0)
      .map(({ id, name, km, from, to }) => ({ id, name, km, ...(typeof from === 'string' && typeof to === 'string' ? { from, to } : {}) }))
      .slice(0, W.routesMax);
  } catch {
    return [];
  }
}

export async function createWalks({ kv }: { kv: KeyValue }) {
  let routes = routesOf(await kv.getItemAsync(KEY));
  const listeners = new Set<() => void>();
  const keep = async (next: WalkRoute[]) => {
    await kv.setItemAsync(KEY, JSON.stringify(next));
    routes = next;
    listeners.forEach((listener) => listener());
  };

  return {
    /** Synchronous, for rendering (useSyncExternalStore): the same array until a change. */
    current: (): WalkRoute[] => routes,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** `from` and `to`: the two places' ids, for a walk kept from the map (K-1251); both or neither. */
    add: async ({ name, km, from, to }: { name: string; km: number; from?: string; to?: string }): Promise<void> => {
      const trimmed = name.trim();
      if (trimmed === '' || Array.from(trimmed).length > W.nameMaxChars || !Number.isFinite(km) || km <= 0 || km > W.routeMaxKm) throw failure('WalkInvalid');
      if (routes.length >= W.routesMax) throw failure('WalkLimit');
      const id = String(routes.reduce((top, r) => Math.max(top, Number(r.id) || 0), 0) + 1);
      await keep([...routes, { id, name: trimmed, km, ...(from !== undefined && to !== undefined ? { from, to } : {}) }]);
    },
    remove: (id: string): Promise<void> => keep(routes.filter((r) => r.id !== id)),
    /** Sign-out: nothing stays for the next account. */
    forget: async (): Promise<void> => {
      routes = [];
      await kv.removeItemAsync(KEY);
      listeners.forEach((listener) => listener());
    },
  };
}
