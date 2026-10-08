/**
 * Another app's export, read on the phone (K-609, ADR-053 §4). Neither Strong nor Hevy publishes its columns; the forms
 * here are the ones seen in real exports (arastirma/ham/H13 B2, B3) and nothing else is read — a header not among them is
 * "unknown", never guessed at. Only what a set needs is kept: the move's name as the file has it, warm-up or not, the
 * weight in the file's unit, the reps. Notes, RPE, distance and time stay in the file; the session's name too, unless the
 * program draft asks for it (K-957, ADR-073 Ek 2): then each session carries it as `routine`, for the draft on this phone only.
 */
import { parseCsv } from './csv';

export type FileSet = { name: string; warmUp: boolean; weight: number; reps: number };
/** `routine`: the session's name in the file (its routine; '' when it has none), only when asked for. */
export type FileSession = { startedAt: Date; endedAt: Date; sets: FileSet[]; routine?: string };
export type ExportSource = 'STRONG' | 'HEVY';
/** The weight unit the file is in; null when the file does not say (Strong) and the user is asked. */
export type FileUnit = 'kg' | 'lb' | null;

export type ExportRead =
  /** `leftOut`: rows that are not a set to bring in — no reps (a timed hold, a distance), or a date not in the verified form. */
  | { kind: 'read'; source: ExportSource; unit: FileUnit; sessions: FileSession[]; leftOut: number }
  /** A header we know, and not one set in it. */
  | { kind: 'empty' }
  | { kind: 'unknown' };

const STRONG = ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'Distance', 'Seconds', 'Notes', 'Workout Notes', 'RPE'];
const HEVY_KG = ['title', 'start_time', 'end_time', 'description', 'exercise_title', 'superset_id', 'exercise_notes', 'set_index', 'set_type', 'weight_kg', 'reps', 'distance_km', 'duration_seconds', 'rpe'];
const HEVY_LB = HEVY_KG.map((column) => (column === 'weight_kg' ? 'weight_lbs' : column === 'distance_km' ? 'distance_miles' : column));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Row = Record<string, string>;
type Form = { source: ExportSource; unit: FileUnit; session: (row: Row) => { key: string; startedAt: Date; endedAt: Date; routine: string } | null; set: (row: Row) => Omit<FileSet, 'reps'> & { reps: string } };

const strong: Form = {
  source: 'STRONG',
  unit: null,
  session: (row) => {
    const startedAt = strongDate(row['Date']);
    if (startedAt === null) return null;
    const seconds = duration(row['Duration']);
    return { key: row['Date'], startedAt, endedAt: new Date(startedAt.getTime() + (seconds ?? 0) * 1000), routine: row['Workout Name'].trim() };
  },
  set: (row) => ({ name: row['Exercise Name'].trim(), warmUp: false, weight: weight(row['Weight']), reps: row['Reps'] }),
};

function hevy(unit: 'kg' | 'lb'): Form {
  return {
    source: 'HEVY',
    unit,
    session: (row) => {
      const startedAt = hevyDate(row['start_time']);
      if (startedAt === null) return null;
      const end = hevyDate(row['end_time']);
      return {
        key: `${row['title']}\u0000${row['start_time']}`,
        startedAt,
        endedAt: end !== null && end >= startedAt ? end : startedAt,
        routine: row['title'].trim(),
      };
    },
    set: (row) => ({
      name: row['exercise_title'].trim(),
      warmUp: row['set_type'] === 'warmup',
      weight: weight(row[unit === 'kg' ? 'weight_kg' : 'weight_lbs']),
      reps: row['reps'],
    }),
  };
}

export function readExport(text: string, keep: { routines?: boolean } = {}): ExportRead {
  let rows: string[][];
  try {
    rows = parseCsv(text);
  } catch {
    return { kind: 'unknown' };
  }
  if (rows.length === 0) return { kind: 'unknown' };
  const header = rows[0].map((column) => column.trim());
  const form = same(header, STRONG) ? strong : same(header, HEVY_KG) ? hevy('kg') : same(header, HEVY_LB) ? hevy('lb') : null;
  if (form === null) return { kind: 'unknown' };

  const sessions = new Map<string, FileSession>();
  let leftOut = 0;
  for (const cells of rows.slice(1)) {
    const row: Row = Object.fromEntries(header.map((column, i) => [column, cells[i] ?? '']));
    const session = form.session(row);
    const { reps: repsText, ...set } = form.set(row);
    const reps = Number(repsText);
    if (session === null || set.name === '' || !Number.isInteger(reps) || reps < 1 || !(set.weight >= 0)) {
      leftOut++;
      continue;
    }
    const kept = sessions.get(session.key) ?? {
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      sets: [],
      ...(keep.routines === true ? { routine: session.routine } : {}),
    };
    kept.sets.push({ ...set, reps });
    sessions.set(session.key, kept);
  }
  if (sessions.size === 0) return { kind: 'empty' };
  const ordered = [...sessions.values()].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { kind: 'read', source: form.source, unit: form.unit, sessions: ordered, leftOut };
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((column, i) => column === b[i]);

/** An empty weight is a set with none (a bodyweight move); anything else must be a number. */
function weight(text: string | undefined): number {
  const trimmed = (text ?? '').trim();
  return trimmed === '' ? 0 : Number(trimmed);
}

/** "2025-01-18 18:05:28", the phone's local time (H13 B2); a date that is not on the calendar is not one. */
function strongDate(text: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec((text ?? '').trim());
  if (m === null) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  return calendar(y, mo - 1, d, h, mi, s);
}

/** "30 Jun 2025, 19:56", the phone's local time (H13 B3). */
function hevyDate(text: string | undefined): Date | null {
  const m = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4}), (\d{1,2}):(\d{2})$/.exec((text ?? '').trim());
  if (m === null) return null;
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return null;
  return calendar(Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5]), 0);
}

function calendar(y: number, month: number, d: number, h: number, mi: number, s: number): Date | null {
  const date = new Date(y, month, d, h, mi, s);
  const real = date.getFullYear() === y && date.getMonth() === month && date.getDate() === d && h < 24 && mi < 60 && s < 60;
  return real ? date : null;
}

/** Strong's "200s", "45m", "1h 15m" (H13 B2), in seconds; null for anything else. */
function duration(text: string | undefined): number | null {
  const m = /^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/.exec((text ?? '').trim());
  if (m === null || (m[1] ?? m[2] ?? m[3]) === undefined) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}
