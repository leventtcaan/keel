/**
 * The rest the timer aims for (K-1214): the recommended band, or the user's own fixed value per kind of move. Recommended is one
 * band for every move, 2-3 minutes (G1 K-49, work sets of low volume and high intensity): there is no source in arastirma/ for a
 * shorter range for isolation moves, so none is invented ([kaynak yok], workout.json › rest_seconds_min). Custom is a phone
 * setting like the appearance: it lives on the phone only, goes at sign-out, and nothing about it reaches the server.
 */
import type { components } from '@/api/schema';
import type { KeyValue } from '@/units/preference';

import { workoutParams } from './params';

export type RestKind = components['schemas']['Exercise']['kind'];
export type RestChoice = { mode: 'RECOMMENDED' | 'CUSTOM'; custom: Record<RestKind, number> };
/** `low`: where the countdown ends; `high`: the band's upper end, null for a fixed value (there is no band to be past). */
export type RestBand = { low: number; high: number | null };

const KEY = 'train.rest';

export const recommendedBand = (): RestBand => ({ low: workoutParams.restSecondsMin, high: workoutParams.restSecondsMax });

/** A custom value starts from the recommended low end until the user moves it. */
export const defaultChoice = (): RestChoice => ({
  mode: 'RECOMMENDED',
  custom: { COMPOUND: workoutParams.restSecondsMin, ISOLATION: workoutParams.restSecondsMin },
});

export const clampCustom = (seconds: number): number =>
  Math.min(workoutParams.restCustomMaxSeconds, Math.max(workoutParams.restCustomMinSeconds, seconds));

/** The band the timer of a move's rest uses; a move of no known kind gets the recommended band. */
export function bandFor(kind: RestKind | undefined, choice: RestChoice): RestBand {
  if (choice.mode === 'RECOMMENDED' || kind === undefined) return recommendedBand();
  return { low: clampCustom(choice.custom[kind]), high: null };
}

const isSeconds = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function parse(kept: string | null): RestChoice {
  try {
    const found = JSON.parse(kept ?? 'null') as { mode?: unknown; custom?: { COMPOUND?: unknown; ISOLATION?: unknown } } | null;
    if (found === null || (found.mode !== 'RECOMMENDED' && found.mode !== 'CUSTOM')) return defaultChoice();
    const { COMPOUND, ISOLATION } = found.custom ?? {};
    if (!isSeconds(COMPOUND) || !isSeconds(ISOLATION)) return defaultChoice();
    return { mode: found.mode, custom: { COMPOUND: clampCustom(COMPOUND), ISOLATION: clampCustom(ISOLATION) } };
  } catch {
    return defaultChoice();
  }
}

export type RestPreference = Awaited<ReturnType<typeof createRestPreference>>;

export async function createRestPreference({ kv }: { kv: KeyValue }) {
  let current = parse(await kv.getItemAsync(KEY));
  const listeners = new Set<() => void>();
  const change = (next: RestChoice) => {
    current = next;
    listeners.forEach((listener) => listener());
  };
  return {
    /** Synchronous, for rendering (useSyncExternalStore): the same object until a choice changes it. */
    current: (): RestChoice => current,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: async (next: RestChoice): Promise<void> => {
      const kept: RestChoice = { mode: next.mode, custom: { COMPOUND: clampCustom(next.custom.COMPOUND), ISOLATION: clampCustom(next.custom.ISOLATION) } };
      await kv.setItemAsync(KEY, JSON.stringify(kept));
      change(kept);
    },
    forget: async (): Promise<void> => {
      await kv.removeItemAsync(KEY);
      change(defaultChoice());
    },
  };
}
