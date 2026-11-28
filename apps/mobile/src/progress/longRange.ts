/**
 * The charts' longer ranges (K-1260, ADR-096 Ek 1). The weight trend back over a range, everything read in windows the server
 * answers; a lift's best set of each Monday week from its paged history (K-1259), by the server's rule (ProgressSummary.weeks,
 * SessionTable.best), the server's own weeks kept where it has them: they carry the held ring the phone cannot know.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { type Loaded, load, localDay } from '@/today/today';
import type { TrainingCache } from '@/train/trainData';

import { weekOf } from './strength';

type Schemas = components['schemas'];
export type LiftWeek = Schemas['LiftProgress']['weeks'][number];
type Point = Schemas['TrendPoint'];

const DAY_MS = 24 * 60 * 60 * 1000;
const plusDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** The first day of a range of `days`, today included. */
export function rangeFrom(today: string, days: number): string {
  return plusDays(today, -(days - 1));
}

type Done = { loadKg: number; reps: number; rir?: number };
/** The heaviest, then the most reps, then the fewest left; a set without RIR after one with it. */
const better = (a: Done, b: Done) =>
  a.loadKg !== b.loadKg ? a.loadKg > b.loadKg : a.reps !== b.reps ? a.reps > b.reps : a.rir !== undefined && (b.rir === undefined || a.rir < b.rir);

/** Each Monday week's best working set of the move (no reps is no set done), oldest first; held is the server's to say. */
export function weekBests(sessions: Schemas['Workout'][], exerciseId: string): LiftWeek[] {
  const best = new Map<string, Done>();
  for (const session of sessions) {
    const week = weekOf(localDay(new Date(session.startedAt)));
    for (const s of session.sets) {
      if (s.exerciseId !== exerciseId || s.setType !== 'WORKING' || s.reps < 1) continue;
      const found = best.get(week);
      if (found === undefined || better(s, found)) best.set(week, { loadKg: s.loadKg, reps: s.reps, ...(s.rir === undefined ? {} : { rir: s.rir }) });
    }
  }
  return [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, d]) => ({ weekOf: week, ...d, held: false }));
}

/** The server's weeks where it has them, the phone's for the rest, oldest first. */
export function joinWeeks(server: LiftWeek[], phone: LiftWeek[]): LiftWeek[] {
  const known = new Set(server.map((w) => w.weekOf));
  return [...server, ...phone.filter((w) => !known.has(w.weekOf))].sort((a, b) => a.weekOf.localeCompare(b.weekOf));
}

/** Everything of the trend: windows of `windowDays` back from today until one has no point. A window that fails fails the whole. */
export async function readAllTrend(
  read: (from: string, to: string) => Promise<Loaded<Point[]>>,
  today: string,
  windowDays: number,
): Promise<Loaded<Point[]>> {
  const all: Point[] = [];
  for (let to = today; ; ) {
    const from = rangeFrom(to, windowDays);
    const window = await read(from, to);
    if (window.state !== 'ready') return window;
    if (window.value.length === 0) break;
    all.push(...window.value);
    to = plusDays(from, -1);
  }
  return { state: 'ready', value: all.sort((a, b) => a.day.localeCompare(b.day)) };
}

/** The trend over a range of `days` (null: everything), from the server (U1: the phone averages nothing). */
export function readTrend(api: ApiClient, today: string, days: number | null, windowDays: number): Promise<Loaded<Point[]>> {
  const one = (from: string, to: string) => load(() => api.GET('/v1/weight-trend', { params: { query: { from, to } } }));
  return days === null ? readAllTrend(one, today, windowDays) : one(rangeFrom(today, days), today);
}

/** A lift's weeks from its history pages back to `from` (null: all of it); a page that fails fails the whole. */
export async function readLiftWeeks(training: TrainingCache, api: ApiClient, exerciseId: string, from: string | null): Promise<Loaded<LiftWeek[]>> {
  const sessions: Schemas['Workout'][] = [];
  let before: string | undefined;
  for (;;) {
    const { read } = await training.moveHistory(api, exerciseId, before);
    if (read.state !== 'ready') return read.state === 'none' ? { state: 'ready', value: [] } : read;
    sessions.push(...read.value.sessions);
    const oldest = read.value.sessions.at(-1);
    before = read.value.next;
    if (before === undefined || oldest === undefined || (from !== null && localDay(new Date(oldest.startedAt)) < weekOf(from))) break; // the first week whole, from its Monday
  }
  const weeks = weekBests(sessions, exerciseId);
  return { state: 'ready', value: from === null ? weeks : weeks.filter((w) => w.weekOf >= weekOf(from)) };
}
