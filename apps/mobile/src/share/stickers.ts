/**
 * The share stickers' words (K-975, ADR-076 #2): four stickers, each from the server's numbers as they are (the workout's
 * summary, the consistency record, the training progress). Nothing is computed beyond a difference of two kilos the
 * server states; no body weight, calorie, body fat or estimated max is ever read here (U4, V3, B10), no blame (U7), and
 * the weekly call is not a sticker (ADR-076 #1). Drawing them is Sticker.tsx; handing them on is shareImage.ts.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { dayName, exerciseName, shortDate } from '@/train/program';
import type { Move } from '@/train/trainData';
import { type UnitSystem, formatLoad, loadValue } from '@/units/units';

import { shareParams } from './params';

type Schemas = components['schemas'];

export type StickerKind = 'workout' | 'pr' | 'streak' | 'progress';
export type WeekCell = Schemas['ConsistencyWeek']['state'];
/** A number and what it counts; `accent` marks the one the sticker leads with. */
export type Stat = { value: string; label: string; accent?: boolean };
export type Sticker = { kind: StickerKind; kicker: string; title: string; stats: Stat[]; lines: string[]; weeks: WeekCell[] };

export type StickerFacts = {
  /** The workout's summary (the server's) and the program day it was done on; the program names the day. */
  workout: { summary: Schemas['WorkoutSummary']; program: Schemas['Program'] | null; programDayId: string | null } | null;
  consistency: Schemas['Consistency'] | null;
  progress: Schemas['TrainingProgress'] | null;
  /** The catalog's moves and the user's own, by id. */
  moves: ReadonlyMap<string, Move>;
};

const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const plural = (key: string, n: number) => t(`${key}.${n === 1 ? 'one' : 'other'}`);

/** The stickers there is something true to say for, in the order the screen offers them. */
export function stickersFor(facts: StickerFacts, units: UnitSystem): Sticker[] {
  return [workout(facts, units), personalRecord(facts, units), streak(facts), progress(facts, units)].filter((s): s is Sticker => s !== null);
}

const setText = (loadKg: number, reps: number, units: UnitSystem) => t('workoutEnd.set', { load: formatLoad(loadKg, units), reps });

function workout({ workout: end, moves }: StickerFacts, units: UnitSystem): Sticker | null {
  if (end === null) return null;
  const { summary } = end;
  const day = end.program?.days.find((d) => d.id === end.programDayId);
  const stats: Stat[] = [];
  if (summary.minutes !== undefined) stats.push({ value: String(summary.minutes), label: plural('workoutEnd.minutes', summary.minutes) });
  stats.push({ value: NUMBER.format(loadValue(summary.liftedKg, units)), label: t(units === 'METRIC' ? 'workoutEnd.liftedKg' : 'workoutEnd.liftedLb'), accent: true });
  stats.push({ value: String(summary.workingSets), label: plural('workoutEnd.sets', summary.workingSets) });
  const record = summary.marks.find((m) => m.kind === 'RECORD');
  if (record !== undefined) {
    stats.push({ value: setText(record.loadKg, record.reps, units), label: t('share.sticker.workout.recordLabel', { move: exerciseName(record.exerciseId, moves).toLowerCase() }) });
  } else if (summary.marks.some((m) => m.kind === 'BASELINE')) {
    stats.push({ value: t('share.sticker.workout.baselineValue'), label: t('share.sticker.workout.baselineLabel') });
  }
  return { kind: 'workout', kicker: t('workoutEnd.title'), title: day === undefined ? t('share.sticker.workout.plain') : dayName(day), stats, lines: [], weeks: [] };
}

function personalRecord({ workout: end, progress: trained, moves }: StickerFacts, units: UnitSystem): Sticker | null {
  const marks = end?.summary.marks ?? [];
  const record = marks.find((m) => m.kind === 'RECORD');
  if (record === undefined) {
    const baseline = marks.find((m) => m.kind === 'BASELINE');
    if (baseline === undefined) return null;
    return { kind: 'pr', kicker: exerciseName(baseline.exerciseId, moves), title: t('workoutEnd.baseline'), stats: [], lines: [t('workoutEnd.baselineBody')], weeks: [] };
  }
  const stats: Stat[] = [{ value: setText(record.loadKg, record.reps, units), label: t('share.sticker.pr.best'), accent: true }];
  const lift = trained?.lifts.find((l) => l.exerciseId === record.exerciseId);
  if (lift !== undefined && gain(lift) > 0) {
    stats.push({ value: t('share.sticker.pr.change', { load: formatLoad(gain(lift), units) }), label: t('share.sticker.pr.since', { date: shortDate(lift.baseline.day) }) });
  }
  return { kind: 'pr', kicker: t('share.sticker.pr.kicker'), title: exerciseName(record.exerciseId, moves), stats, lines: [], weeks: [] };
}

/** The kilos a lift's best set is above its baseline: two numbers the server gives, one subtraction. */
const gain = (lift: Schemas['LiftProgress']) => lift.best.loadKg - lift.baseline.loadKg;

function streak({ consistency }: StickerFacts): Sticker | null {
  const record = consistency?.record;
  if (consistency == null || record === undefined || record.countedWeeks === 0) return null;
  const lines = record.forgivenWeeks > 0 ? [t(`share.sticker.streak.spare.${record.forgivenWeeks === 1 ? 'one' : 'other'}`, { count: record.forgivenWeeks })] : [];
  return {
    kind: 'streak',
    kicker: t('share.sticker.streak.kicker'),
    title: t('share.sticker.streak.title', { onTrack: record.onTrackWeeks, counted: record.countedWeeks }),
    stats: [],
    lines,
    weeks: consistency.weeks.map((w) => w.state),
  };
}

function progress({ consistency, progress: trained, moves }: StickerFacts, units: UnitSystem): Sticker | null {
  const gained = (trained?.lifts ?? []).filter((l) => l.stronger && gain(l) > 0);
  if (gained.length === 0) return null;
  // Most kilos first; lifts that gained the same stay in the program's order.
  const top = gained.map((lift, order) => ({ lift, order })).sort((a, b) => gain(b.lift) - gain(a.lift) || a.order - b.order).slice(0, shareParams.progressLifts);
  const weeks = consistency?.record.countedWeeks ?? 0;
  return {
    kind: 'progress',
    kicker: t('share.sticker.progress.kicker'),
    title: weeks > 0 ? t(`share.sticker.progress.inWeeks.${weeks === 1 ? 'one' : 'other'}`, { count: weeks }) : t('share.sticker.progress.soFar'),
    stats: [],
    lines: top.map(({ lift }) => t('share.sticker.progress.lift', { move: exerciseName(lift.exerciseId, moves), load: formatLoad(gain(lift), units) })),
    weeks: [],
  };
}
