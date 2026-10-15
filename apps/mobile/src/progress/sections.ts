/**
 * Which parts of the Progress tab are open, and what they say (K-979, ADR-078 #1-#3, Ek 1, Ek 2). Each part opens when its
 * own data arrives; a part without data stays in its first-day form (a target or a lock), and no chart is drawn empty.
 * Every condition is a field the server sent: the first call (the consistency answers), the first workout (a lift), the
 * trend (`trendReady`). The phone keeps no counter and works out no week (ADR-078 Ek 2).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type UnitSystem, formatWeight } from '@/units/units';

import type { ProgressRead } from './read';

type Schemas = components['schemas'];

export type Target =
  | { kind: 'calories'; eaten: Schemas['KcalRange']; target: number }
  | { kind: 'protein'; eaten: Schemas['GramRange']; target: number }
  | { kind: 'steps'; steps: number | null; target: number }
  | { kind: 'cardio'; done: number; count: number; minutes: number };

/**
 * Where the user is: before the first call (its targets), after it (its results), without the health data consent (the
 * calls are not there to read), or not known because the consistency could not be read: then no first day is claimed.
 */
export type Phase = 'first' | 'running' | 'locked' | 'unknown';

export function phaseOf(read: ProgressRead): Phase {
  switch (read.consistency.state) {
    case 'ready':
      return 'running';
    case 'none':
      return 'first';
    case 'consent':
      return 'locked';
    default:
      return 'unknown';
  }
}

/** The boxes of the first days (ADR-078 #1): calories, protein, steps, cardio; each only with its own number from the server. */
export function targetsOf(read: ProgressRead): Target[] {
  const targets: Target[] = [];
  if (read.budget.state === 'ready') {
    const { eaten, targetKcal, targetProteinG } = read.budget.value;
    targets.push({ kind: 'calories', eaten: eaten.kcal, target: targetKcal });
    if (targetProteinG > 0) targets.push({ kind: 'protein', eaten: eaten.proteinG, target: targetProteinG });
  }
  if (read.starting?.state === 'ready') targets.push({ kind: 'steps', steps: read.stepsToday, target: read.starting.value.stepsPerDay });
  const cardio = read.program.state === 'ready' ? read.program.value.cardio : undefined;
  if (cardio !== undefined && cardio.sessionsPerWeek > 0) {
    targets.push({ kind: 'cardio', done: cardio.doneThisWeek, count: cardio.sessionsPerWeek, minutes: cardio.minutes });
  }
  return targets;
}

/** The sentence of results (ADR-078 #2): the lifts, then the weight; a part the server did not give is left out, not guessed. */
function resultSentence(read: ProgressRead, units: UnitSystem): string {
  const parts: string[] = [];
  if (read.training.state === 'ready') {
    const { strongerLifts, trackedLifts } = read.training.value;
    // "Stronger on 0 of 5 lifts" would read as a verdict; until there is a record to name, the sentence is silent on it.
    if (strongerLifts > 0) {
      parts.push(trackedLifts === 1 ? t('progress.result.strongerOne') : t('progress.result.stronger', { stronger: strongerLifts, tracked: trackedLifts }));
    }
  }
  const change = read.consistency.state === 'ready' ? read.consistency.value.weightChange : undefined;
  if (change !== undefined) {
    const amount = formatWeight(Math.abs(change.kg), units);
    parts.push(change.direction === 'STEADY' ? t('progress.result.steady') : t(change.direction === 'DOWN' ? 'progress.result.down' : 'progress.result.up', { amount }));
  }
  return parts.length === 0 ? t('progress.hero.early') : parts.join(' ');
}

/** The block at the top; null when the phase is not known (no first day is shown to someone who may be past it). */
export function heroOf(read: ProgressRead, units: UnitSystem): { title: string; sub: string | null } | null {
  const phase = phaseOf(read);
  if (phase === 'unknown') return null;
  if (phase === 'running') {
    const record = read.consistency.state === 'ready' ? read.consistency.value.record : null;
    const { countedWeeks, onTrackWeeks } = record ?? { countedWeeks: 0, onTrackWeeks: 0 };
    const sub = countedWeeks === 0 ? null : t(countedWeeks === 1 ? 'progress.hero.recordOne' : 'progress.hero.record', { counted: countedWeeks, onTrack: onTrackWeeks });
    return { title: resultSentence(read, units), sub };
  }
  // Without the consent the lifts and the calls are not read together: no first workout line there.
  const worked = phase === 'first' && read.training.state === 'ready' && read.training.value.lifts.length > 0;
  return { title: t(worked ? 'progress.hero.firstWorkout' : 'progress.hero.targets'), sub: targetsOf(read).length === 0 ? null : t('progress.hero.tap') };
}

/**
 * 'baseline': the first workout's form (each lift's best set, the target to beat); 'lifts': the chips, the chart and the effort
 * line, once a lift has two weeks to draw or an effort to tell (ADR-078 Ek 2, Ek 3: no chart of one point).
 */
export type StrengthPart = 'locked' | 'baseline' | 'lifts' | null;

/** Strength opens with the first workout (ADR-078 Ek 2): a lock before, then its baseline, then the lifts; nothing when it is not read. */
export function strengthOf(read: ProgressRead): StrengthPart {
  if (read.training.state !== 'ready') return null;
  const { lifts } = read.training.value;
  if (lifts.length === 0) return 'locked';
  return lifts.some((lift) => lift.weeks.length >= 2 || lift.effort !== undefined) ? 'lifts' : 'baseline';
}

/** The weigh-ins so far, while the trend is not ready; null once it is, or when it is not known. */
export function weighInDots(read: ProgressRead): { count: number; min: number } | null {
  if (read.summary.state !== 'ready' || read.summary.value.trendReady) return null;
  const { weighInCount, trendMinWeighIns } = read.summary.value;
  return { count: Math.min(weighInCount, trendMinWeighIns), min: trendMinWeighIns };
}

export type WeightPart = { kind: 'chart'; points: Schemas['TrendPoint'][] } | { kind: 'dots'; count: number; min: number; stale: boolean };

/**
 * The weight part (ADR-078 Ek 2, Ek 3): the 7-day average chart once the server says the trend is ready and has points in the
 * window; otherwise the weigh-ins toward it. Ready with no point to draw keeps the dots and says the average needs a new weigh-in.
 */
export function weightOf(read: ProgressRead): WeightPart | null {
  const waiting = weighInDots(read);
  if (waiting !== null) return { kind: 'dots', ...waiting, stale: false };
  if (read.summary.state !== 'ready') return null;
  const { weighInCount, trendMinWeighIns } = read.summary.value;
  const dots = { kind: 'dots' as const, count: Math.min(weighInCount, trendMinWeighIns), min: trendMinWeighIns };
  const points = read.trend?.state === 'ready' ? read.trend.value : [];
  return points.length > 0 ? { kind: 'chart', points } : { ...dots, stale: true };
}

/** The latest calls the server listed, newest first; none, no consent or not read: no card. */
export function callsOf(read: ProgressRead): { items: Schemas['Decision'][] } | null {
  if (read.calls.state !== 'ready' || read.calls.value.items.length === 0) return null;
  return { items: read.calls.value.items };
}
