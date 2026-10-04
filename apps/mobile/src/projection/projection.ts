/**
 * The shape projection on the phone (K-606, U12, ADR-052). The numbers are the server's (GET /v1/projection, the engine's
 * energy balance model); the phone only draws them, and only toward the goal (H2 §4.5): a losing projection is never drawn
 * wider than today, a gaining one never narrower.
 *
 * The switch is off unless the person turns it on, and turning it on needs the SCOFF gate's "clear" (ADR-050). What was shown
 * last stays on the phone only to say an update ("78–84 → 79–85 kg") — the model speaking, never "you missed" (H2 §4.5).
 * Turning it off, or signing out, forgets it.
 */
import params from '../../../../data/parameters/projection.json';
import type { KeyValue } from '@/units/preference';

import type { ProjectionAccess } from './scoff';

export type Direction = 'LOSS' | 'GAIN';
/** The scenario the figure follows, as last shown: its share of planned days, its middle number and its range, in kg. */
export type Seen = { adherence: number; kg: number; low: number; high: number };

type Parameter = { key: string; value: unknown };
const UPDATE_MIN_KG = (params.parameters as Parameter[]).find((p) => p.key === 'projection_update_min_kg')?.value as number;

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

/**
 * What changed since it was last shown, or nothing. Only the same scenario is compared, and only a move of the middle number
 * of at least projection_update_min_kg counts (the scale's noise is not news). "Away" reads the middle number too: the end of
 * the range that would pass today's weight is clamped there by the server (ADR-052 §5) and would hide a move.
 */
export function updateNote(last: Seen | null, now: Seen, direction: Direction): { from: Seen; to: Seen; away: boolean } | null {
  if (last === null || last.adherence !== now.adherence || Math.abs(now.kg - last.kg) < UPDATE_MIN_KG) return null;
  const away = direction === 'LOSS' ? now.kg > last.kg : now.kg < last.kg;
  return { from: last, to: now, away };
}

const isSeen = (value: unknown): value is Seen =>
  typeof value === 'object' &&
  value !== null &&
  (['adherence', 'kg', 'low', 'high'] as const).every((key) => Number.isFinite((value as Seen)[key]));

function read(text: string | null): Seen | null {
  if (text === null) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return isSeen(parsed) ? { adherence: parsed.adherence, kg: parsed.kg, low: parsed.low, high: parsed.high } : null;
  } catch {
    return null;
  }
}

export type ProjectionSwitch = Awaited<ReturnType<typeof createProjectionSwitch>>;

export async function createProjectionSwitch({ kv, access }: { kv: KeyValue; access: ProjectionAccess }) {
  let on = (await kv.getItemAsync(ON)) === 'true';
  let last = read(await kv.getItemAsync(LAST));

  const forget = async (): Promise<void> => {
    await kv.removeItemAsync(ON);
    await kv.removeItemAsync(LAST);
    on = false;
    last = null;
  };

  return {
    /**
     * Synchronous, for rendering. On only while the gate says "clear" too: a kept "on" whose gate went (a sign-out cut short,
     * another person, ADR-050) reads as off — the gate is checked where the switch is read, not only where it is set.
     */
    on: (): boolean => on && access.current() === 'clear',
    lastSeen: (): Seen | null => last,

    /** On only after the SCOFF gate said "clear" on this phone (ADR-050); false otherwise, and nothing changes. */
    turnOn: async (): Promise<boolean> => {
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
