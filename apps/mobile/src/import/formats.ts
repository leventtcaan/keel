/**
 * Another app's export, read on the phone (K-609, ADR-053 §4; tolerant headers, K-1062). Neither Strong nor Hevy publishes its
 * columns. The forms seen in real exports are in arastirma/ham/H13 B2 and B3 (Strong's comma file, Hevy's kg file); the semicolon
 * Strong file with the unit in the weight header ("Workout #;Date;…;Duration (sec);…;Weight (kg);…") and Hevy's weight_lbs file
 * are known only from parsers and a sample in a converter's repository, not from a file we saw [doğrulanmadı]. So a file is
 * read by the NAMES of its columns, not their order or their count: case, spacing, underscores, a byte-order mark, and a comma,
 * semicolon or tab between fields do not matter, and a column we do not read may be there or not. What must be there is what a
 * set needs: the move's name, the reps, the weight (with its unit when the header says it) and the session's start. Anything
 * else is "unknown", never
 * guessed at. Only what a set needs is kept: the move's name as the file has it, warm-up or not, the weight in the file's
 * unit, the reps. Notes, RPE, distance and time stay in the file; the session's name too, unless the program draft asks
 * for it (K-957, ADR-073 Ek 2): then each session carries it as `routine`, for the draft on this phone only.
 */
import { parseCsv } from './csv';

export type FileSet = { name: string; warmUp: boolean; weight: number; reps: number };
/** `routine`: the session's name in the file (its routine; '' when it has none), only when asked for. */
export type FileSession = { startedAt: Date; endedAt: Date; sets: FileSet[]; routine?: string };
export type ExportSource = 'STRONG' | 'HEVY';
/** The weight unit the file is in; null when the file does not say (Strong's comma file) and the user is asked. */
export type FileUnit = 'kg' | 'lb' | null;

export type ExportRead =
  /** `leftOut`: rows that are not a set to bring in — no reps (a timed hold, a distance), or a date not in a verified form. */
  | { kind: 'read'; source: ExportSource; unit: FileUnit; sessions: FileSession[]; leftOut: number }
  /** A header we know, and not one set in it. */
  | { kind: 'empty' }
  | { kind: 'unknown' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Cells = string[];
type Parsed = { session: { key: string; startedAt: Date; endedAt: Date; routine: string } | null; name: string; warmUp: boolean; weight: number; reps: string };
type Form = { source: ExportSource; unit: FileUnit; row: (cells: Cells) => Parsed };

/** A column's name as compared: no byte-order mark, lower case, runs of spaces and underscores as one space. */
const normal = (column: string) => column.replace(/^﻿/, '').trim().toLowerCase().replace(/[\s_]+/g, ' ');

/** The fields are split by whichever of comma, semicolon or tab the header line has most of (Strong's newer file is semicolon). */
function delimiterOf(text: string): string {
  const first = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0];
  const counts = [',', ';', '\t'].map((d) => [d, first.split(d).length - 1] as const);
  return counts.reduce((best, now) => (now[1] > best[1] ? now : best))[0];
}

/** The index of the first column with one of these names; -1 when none. */
const at = (header: string[], ...names: string[]) => header.findIndex((column) => names.includes(column));

/**
 * Strong: Date · Workout Name · Duration (or Duration (sec)) · Exercise Name · Set Order · Weight (or Weight (kg), Weight (lb)) · Reps.
 * Strong's comma file has no unit (the user is asked); a unit in the weight header is the file's.
 */
function strongForm(header: string[], decimalComma: boolean): Form | null {
  const date = at(header, 'date');
  const workout = at(header, 'workout name');
  const exercise = at(header, 'exercise name');
  const order = at(header, 'set order');
  const reps = at(header, 'reps');
  const weight = at(header, 'weight', 'weight (kg)', 'weight (lb)', 'weight (lbs)');
  if ([date, workout, exercise, order, reps, weight].some((i) => i < 0)) return null;
  const unit: FileUnit = header[weight] === 'weight (kg)' ? 'kg' : header[weight].startsWith('weight (lb') ? 'lb' : null;
  const length = at(header, 'duration', 'duration (sec)', 'duration (s)');
  const seconds = header[length]?.startsWith('duration (') === true;
  return {
    source: 'STRONG',
    unit,
    row: (cells) => {
      const startedAt = localDate(cells[date]);
      const lasted = length < 0 ? null : seconds ? wholeSeconds(cells[length]) : duration(cells[length]);
      return {
        session: startedAt === null ? null : { key: cells[date], startedAt, endedAt: new Date(startedAt.getTime() + (lasted ?? 0) * 1000), routine: (cells[workout] ?? '').trim() },
        name: (cells[exercise] ?? '').trim(),
        warmUp: false,
        weight: weightOf(cells[weight], decimalComma),
        reps: cells[reps] ?? '',
      };
    },
  };
}

/** Hevy: title · start_time · end_time · exercise_title · set_type · weight_kg (or weight_lbs) · reps. The unit is in the header. */
function hevyForm(header: string[], decimalComma: boolean): Form | null {
  const title = at(header, 'title');
  const start = at(header, 'start time');
  const end = at(header, 'end time');
  const exercise = at(header, 'exercise title');
  const type = at(header, 'set type');
  const reps = at(header, 'reps');
  const kg = at(header, 'weight kg');
  const lb = at(header, 'weight lbs', 'weight lb');
  const weight = kg >= 0 ? kg : lb;
  if ([title, start, exercise, reps, weight].some((i) => i < 0)) return null;
  return {
    source: 'HEVY',
    unit: kg >= 0 ? 'kg' : 'lb',
    row: (cells) => {
      const startedAt = hevyDate(cells[start]);
      const ended = end < 0 ? null : hevyDate(cells[end]);
      return {
        session:
          startedAt === null
            ? null
            : {
                key: `${cells[title]}\u0000${cells[start]}`,
                startedAt,
                endedAt: ended !== null && ended >= startedAt ? ended : startedAt,
                routine: (cells[title] ?? '').trim(),
              },
        name: (cells[exercise] ?? '').trim(),
        warmUp: type >= 0 && normal(cells[type] ?? '').replace(' ', '') === 'warmup',
        weight: weightOf(cells[weight], decimalComma),
        reps: cells[reps] ?? '',
      };
    },
  };
}

export function readExport(text: string, keep: { routines?: boolean } = {}): ExportRead {
  const delimiter = delimiterOf(text);
  let rows: string[][];
  try {
    rows = parseCsv(text, delimiter);
  } catch {
    return { kind: 'unknown' };
  }
  if (rows.length === 0) return { kind: 'unknown' };
  const header = rows[0].map(normal);
  // A decimal comma is a number only in a file whose fields are not split by commas.
  const decimalComma = delimiter !== ',';
  // Hevy's names are the more particular (snake_case with a unit), so it is asked first.
  const form = hevyForm(header, decimalComma) ?? strongForm(header, decimalComma);
  if (form === null) return { kind: 'unknown' };

  const sessions = new Map<string, FileSession>();
  let leftOut = 0;
  for (const cells of rows.slice(1)) {
    const { session, reps: repsText, ...set } = form.row(cells);
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

/** An empty weight is a set with none (a bodyweight move); anything else must be a number (a decimal comma only where it is allowed). */
function weightOf(text: string | undefined, decimalComma: boolean): number {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') return 0;
  return Number(decimalComma && /^\d+,\d+$/.test(trimmed) ? trimmed.replace(',', '.') : trimmed);
}

/**
 * A date as a phone writes it in local time with no zone: "2025-01-18 18:05:28" (Strong, H13 B2), or without the seconds, or
 * with a T between. 24-hour, two digits each; an AM/PM time or a date with no time is not one of these. A date that is not on
 * the calendar is not one.
 */
function localDate(text: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec((text ?? '').trim());
  if (m === null) return null;
  const [y, mo, d, h, mi] = m.slice(1, 6).map(Number);
  return calendar(y, mo - 1, d, h, mi, Number(m[6] ?? 0));
}

/** "30 Jun 2025, 19:56" (Hevy, H13 B3; seconds if there are any), the phone's local time; or the plain form above. */
function hevyDate(text: string | undefined): Date | null {
  const m = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4}), (\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec((text ?? '').trim());
  if (m === null) return localDate(text);
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return null;
  return calendar(Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0));
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

/** A column that counts seconds ("Duration (sec)"): whole seconds, nothing else. */
function wholeSeconds(text: string | undefined): number | null {
  return /^\d+$/.test((text ?? '').trim()) ? Number((text ?? '').trim()) : null;
}
