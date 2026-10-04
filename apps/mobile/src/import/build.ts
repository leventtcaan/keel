/**
 * The file's sessions as the server takes them (K-609, contract WorkoutImport, ADR-053 §3-4): only the mapped sets go —
 * the move's id, warm-up or working, the load in kg as the move's load model counts it, the reps; names, notes and the
 * rest of the file stay on the phone. A set that cannot be one is left out and counted, never bent to fit (a load on a
 * bodyweight-only move is not made 0). Sessions go in chunks of import_workouts_per_request, oldest first; each session's
 * id comes from the file alone (sessionIds) — so the same file brought in twice is the same sessions ("already there").
 */
import type { components } from '@/api/schema';
import { workoutParams } from '@/train/params';
import type { Move } from '@/train/trainData';

import type { ExportSource, FileSession } from './formats';
import { importParams } from './params';

type Schemas = components['schemas'];

/** `leftOut`: sets that cannot be one (H13, the server's rules); `skipped`: sets of a name the user chose not to bring. */
export type Built = { chunks: Schemas['WorkoutImport'][]; sessions: number; sets: number; leftOut: number; skipped: number };

export type BuildInput = {
  source: ExportSource;
  sessions: FileSession[];
  /** Each session's id, in the same order (sessionIds): from the file alone, so a choice changes no id. */
  ids: string[];
  /** A file's move name → the move it is, or null: not brought in. A name not here is not brought in either. */
  choices: Map<string, string | null>;
  moves: Map<string, Move>;
  /** The file's weight unit: Hevy's from its header, Strong's asked. */
  unit: 'kg' | 'lb';
  /** How the file counted a dumbbell move's load: one dumbbell (as the app does, ADR-032) or the pair together. */
  dumbbells: 'one' | 'both';
};

/** The pound, by definition (international yard and pound, 1959). */
const KG_PER_LB = 0.45359237;

/**
 * Each session's id, from the file alone: its app, its start, and — for sessions starting in the same minute (Hevy's
 * times have no seconds) — its place among them in the file. Worked out once per file, before any choice: an id that
 * moved with the choices would make a re-import with another move mapped skip one session and store another twice.
 */
export async function sessionIds(source: ExportSource, sessions: FileSession[], digest: (text: string) => Promise<string>): Promise<string[]> {
  const seen = new Map<string, number>();
  const ids: string[] = [];
  for (const session of sessions) {
    const start = session.startedAt.toISOString();
    const ordinal = seen.get(start) ?? 0;
    seen.set(start, ordinal + 1);
    ids.push(uuidFromDigest(await digest(`keel-import|${source}|${start}|${ordinal}`)));
  }
  return ids;
}

/** What goes, from the current choices — at once, so the send button always sends what the screen shows. */
export function buildImport({ source, sessions, ids, choices, moves, unit, dumbbells }: BuildInput): Built {
  const workouts: Schemas['ImportedWorkout'][] = [];
  let leftOut = 0;
  let skipped = 0;
  let sets = 0;
  sessions.forEach((session, index) => {
    const kept: Schemas['ImportedSet'][] = [];
    for (const set of session.sets) {
      const id = choices.get(set.name) ?? null;
      const move = id === null ? undefined : moves.get(id);
      if (move === undefined) {
        skipped++;
        continue;
      }
      const loadKg = kilograms(set.weight, unit, move, dumbbells);
      if (loadKg === null || set.reps > workoutParams.maxReps || kept.length >= importParams.setsPerSessionMax) {
        leftOut++;
        continue;
      }
      kept.push({ exerciseId: move.id, setType: set.warmUp ? 'WARM_UP' : 'WORKING', loadKg, reps: set.reps });
    }
    if (kept.length === 0) return;
    workouts.push({ clientId: ids[index], startedAt: session.startedAt.toISOString(), endedAt: session.endedAt.toISOString(), sets: kept });
    sets += kept.length;
  });
  const chunks: Schemas['WorkoutImport'][] = [];
  for (let i = 0; i < workouts.length; i += importParams.workoutsPerRequest) {
    chunks.push({ source, workouts: workouts.slice(i, i + importParams.workoutsPerRequest) });
  }
  return { chunks, sessions: workouts.length, sets, leftOut, skipped };
}

/**
 * The load the app keeps for this move, in kg to the hundredth; null when the move cannot have it — a load on a
 * bodyweight-only move (only a pull-up kind takes one, added), or over the set limit. A pair of dumbbells counted
 * together is one dumbbell's, except on a one-arm move, which holds one.
 */
function kilograms(weight: number, unit: 'kg' | 'lb', move: Move, dumbbells: 'one' | 'both'): number | null {
  let kg = unit === 'lb' ? weight * KG_PER_LB : weight;
  if (move.equipment === 'DUMBBELL' && !move.unilateral && dumbbells === 'both') kg /= 2;
  const rounded = Math.round(kg * 100) / 100;
  if (move.load === 'BODYWEIGHT' && rounded !== 0) return null;
  return rounded > workoutParams.maxLoadKg ? null : rounded;
}

/** A version-8 UUID (RFC 9562: custom) from a digest's first 128 bits — the same text, the same id. */
export function uuidFromDigest(hex: string): string {
  const h = hex.toLowerCase();
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
