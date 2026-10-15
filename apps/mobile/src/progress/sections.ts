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
  const worked = read.training.state === 'ready' && read.training.value.lifts.length > 0;
  return { title: t(worked ? 'progress.hero.firstWorkout' : 'progress.hero.targets'), sub: targetsOf(read).length === 0 ? null : t('progress.hero.tap') };
}

export type StrengthPart = 'locked' | 'baseline' | null;

/** Strength opens with the first workout (ADR-078 Ek 2): a lock before, the baseline after; nothing when it is not read. */
export function strengthOf(read: ProgressRead): StrengthPart {
  if (read.training.state !== 'ready') return null;
  return read.training.value.lifts.length === 0 ? 'locked' : 'baseline';
}

/** The weigh-ins so far, while the trend is not ready; null once it is, or when it is not known. */
export function weighInDots(read: ProgressRead): { count: number; min: number } | null {
  if (read.summary.state !== 'ready' || read.summary.value.trendReady) return null;
  const { weighInCount, trendMinWeighIns } = read.summary.value;
  return { count: Math.min(weighInCount, trendMinWeighIns), min: trendMinWeighIns };
}
