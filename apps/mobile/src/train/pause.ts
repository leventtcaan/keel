/**
 * Pause and Resume (K-972, ADR-075 #5): the session's time stops while paused and goes on from where it stopped. Kept on
 * the phone with the workout it belongs to (one open at a time), so a session closed while paused opens paused. At the
 * finish the time paused goes with it (WorkoutFinish.pausedSeconds, K-998): the summary's minutes are the active time.
 */
import type { KeyValue } from '@/units/preference';

/** `pausedAt`: when the pause under way began (ms), null while running; `pausedMs`: the pauses before it, added up. */
export type Pause = { pausedAt: number | null; pausedMs: number };

export const NOT_PAUSED: Pause = { pausedAt: null, pausedMs: 0 };

const KEY = 'train.pause';

/** The time paused by `now`: the pauses before, and the one under way. */
export function pausedFor(pause: Pause, now: number): number {
  return pause.pausedMs + (pause.pausedAt === null ? 0 : Math.max(0, now - pause.pausedAt));
}

/** Pause now, or resume: the pause under way is added to the ones before. */
export function toggle(pause: Pause, now: number): Pause {
  return pause.pausedAt === null ? { pausedAt: now, pausedMs: pause.pausedMs } : { pausedAt: null, pausedMs: pausedFor(pause, now) };
}

const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export type SessionPause = ReturnType<typeof createSessionPause>;

export function createSessionPause(kv: KeyValue) {
  return {
    /** The workout's pause as kept; none for another workout, nothing kept, or what cannot be read. */
    async read(workout: string): Promise<Pause> {
      try {
        const kept = JSON.parse((await kv.getItemAsync(KEY)) ?? 'null') as { workout?: unknown; pausedAt?: unknown; pausedMs?: unknown } | null;
        if (kept === null || kept.workout !== workout || !isTime(kept.pausedMs) || !(kept.pausedAt === null || isTime(kept.pausedAt))) return NOT_PAUSED;
        return { pausedAt: kept.pausedAt, pausedMs: kept.pausedMs };
      } catch {
        return NOT_PAUSED;
      }
    },
    async keep(workout: string, pause: Pause): Promise<void> {
      await kv.setItemAsync(KEY, JSON.stringify({ workout, ...pause }));
    },
    /** At sign-out, and once its workout is finished or left. */
    async forget(): Promise<void> {
      await kv.removeItemAsync(KEY);
    },
  };
}
