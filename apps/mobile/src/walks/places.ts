/**
 * "My places" (K-1227, ADR-093): the spots the user names (home, the gym, a few more) so a walk between two of them can be drawn
 * and measured. Personal, so kept on the phone only (the small settings store) and never sent anywhere; it belongs to the account
 * and goes with a sign-out. Nothing here reads where the phone is: a place is a name and a point the user picked.
 */
import type { KeyValue } from '@/units/preference';

import { walkParams as W } from './params';

const KEY = 'places.items';

export type Place = { id: string; name: string; lat: number; lng: number };
export type Places = Awaited<ReturnType<typeof createPlaces>>;

const failure = (name: 'PlaceLimit' | 'PlaceInvalid') => Object.assign(new Error(name), { name });

const validPoint = (lat: unknown, lng: unknown) =>
  typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

function placesOf(kept: string | null): Place[] {
  if (kept === null) return [];
  try {
    const value = JSON.parse(kept) as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter((p): p is Place => p !== null && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string' && validPoint(p.lat, p.lng))
      .slice(0, W.placesMax);
  } catch {
    return [];
  }
}

export async function createPlaces({ kv }: { kv: KeyValue }) {
  let places = placesOf(await kv.getItemAsync(KEY));
  const listeners = new Set<() => void>();
  const keep = async (next: Place[]) => {
    await kv.setItemAsync(KEY, JSON.stringify(next));
    places = next;
    listeners.forEach((listener) => listener());
  };

  return {
    /** Synchronous, for rendering (useSyncExternalStore): the same array until a change. */
    current: (): Place[] => places,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add: async ({ name, lat, lng }: { name: string; lat: number; lng: number }): Promise<Place> => {
      const trimmed = name.trim();
      if (trimmed === '' || Array.from(trimmed).length > W.nameMaxChars || !validPoint(lat, lng)) throw failure('PlaceInvalid');
      if (places.length >= W.placesMax) throw failure('PlaceLimit');
      const id = String(places.reduce((top, p) => Math.max(top, Number(p.id) || 0), 0) + 1);
      const place = { id, name: trimmed, lat, lng };
      await keep([...places, place]);
      return place;
    },
    remove: (id: string): Promise<void> => keep(places.filter((p) => p.id !== id)),
    /** Sign-out: nothing stays for the next account. */
    forget: async (): Promise<void> => {
      places = [];
      await kv.removeItemAsync(KEY);
      listeners.forEach((listener) => listener());
    },
  };
}
