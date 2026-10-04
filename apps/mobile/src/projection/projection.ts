/**
 * The shape projection on the phone (K-606, U12, ADR-052). The numbers are the server's (GET /v1/projection, the engine's
 * energy balance model); the phone only draws them, and only toward the goal (H2 §4.5): a losing projection is never drawn
 * wider than today, a gaining one never narrower.
 *
 * The switch is off unless the person turns it on, and turning it on needs the SCOFF gate's "clear" (ADR-050). What was shown
 * last stays on the phone only to say an update ("78–84 → 79–85 kg") — the model speaking, never "you missed" (H2 §4.5).
 * Turning it off, or signing out, forgets it.
 */
import type { KeyValue } from '@/units/preference';

import type { ProjectionAccess } from './scoff';

export type Direction = 'LOSS' | 'GAIN';
/** A scenario's range as last shown, in kg. */
export type Seen = { low: number; high: number };

const ON = 'projection.on';
const LAST = 'projection.last';

/**
 * How much wider or narrower the figure is drawn: at the same height, mass goes with the area of a cross-section, so width
 * goes with its square root. Clamped to today's width on the side away from the goal.
 */
export function widthFactor(todayKg: number, kg: number, direction: Direction): number {
  const factor = Math.sqrt(kg / todayKg);
  return direction === 'LOSS' ? Math.min(1, factor) : Math.max(1, factor);
}

/** What changed since it was last shown, or nothing; "away" when the range moved away from the goal. */
export function updateNote(last: Seen | null, now: Seen, direction: Direction): { from: Seen; to: Seen; away: boolean } | null {
  if (last === null || (last.low === now.low && last.high === now.high)) return null;
  const away = direction === 'LOSS' ? now.high > last.high : now.low < last.low;
  return { from: last, to: now, away };
}

const isSeen = (value: unknown): value is Seen =>
  typeof value === 'object' && value !== null && Number.isFinite((value as Seen).low) && Number.isFinite((value as Seen).high);

function read(text: string | null): Seen | null {
  if (text === null) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return isSeen(parsed) ? { low: parsed.low, high: parsed.high } : null;
  } catch {
    return null;
  }
}

export type ProjectionSwitch = Awaited<ReturnType<typeof createProjectionSwitch>>;

export async function createProjectionSwitch({ kv }: { kv: KeyValue }) {
  let on = (await kv.getItemAsync(ON)) === 'true';
  let last = read(await kv.getItemAsync(LAST));

  const forget = async (): Promise<void> => {
    await kv.removeItemAsync(ON);
    await kv.removeItemAsync(LAST);
    on = false;
    last = null;
  };

  return {
    /** Synchronous, for rendering. */
    on: (): boolean => on,
    lastSeen: (): Seen | null => last,

    /** On only after the SCOFF gate said "clear" on this phone (ADR-050); false otherwise, and nothing changes. */
    turnOn: async (access: ProjectionAccess): Promise<boolean> => {
      if (access.current() !== 'clear') return false;
      await kv.setItemAsync(ON, 'true');
      on = true;
      return true;
    },

    /** Off, and what was shown is forgotten (H2 §4.3: turned off, nothing it made stays). */
    turnOff: forget,

    remember: async (seen: Seen): Promise<void> => {
      await kv.setItemAsync(LAST, JSON.stringify(seen));
      last = seen;
    },

    /** Sign-out: the switch and what was shown belong to the account. */
    forget,
  };
}
