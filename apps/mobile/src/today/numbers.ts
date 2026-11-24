/**
 * The numbers on This week besides the food (K-1206, ADR-069 #1, ADR-078 Ek 2): protein against its target, today's steps
 * against the step target, and the weight's 7-day trend. Every figure is the server's (the day's budget, the targets, the
 * trend points) or Apple Health's count read on the phone; nothing is worked out here but the difference of two numbers
 * the server gave, as the Progress weight card shows it. One morning's weigh-in is never a number here (U1, U8): before
 * the server says the trend is ready, the weigh-ins toward it.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { mid } from '@/food/single';
import { progressParams } from '@/progress/params';
import { type UnitSystem, weightChange, weightDecimals } from '@/units/units';

import { type Loaded, load, localDay } from './today';

type Schemas = components['schemas'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** What the weight tile reads: the server's count of weigh-ins toward the trend and, once it is ready, the trend's points. */
export type WeightRead = { summary: Loaded<Schemas['WeighInSummary']>; trend: Loaded<Schemas['TrendPoint'][]> | null };

/** The summary, and the trend over the Progress chart's window only once the server says it is ready (the same two reads as Progress). */
export async function loadWeight(api: ApiClient, day: string): Promise<WeightRead> {
  const summary = await load(() => api.GET('/v1/weigh-ins/summary'));
  if (summary.state !== 'ready' || !summary.value.trendReady) return { summary, trend: null };
  const from = localDay(new Date(Date.parse(`${day}T12:00:00`) - (progressParams.weightChartDays - 1) * DAY_MS));
  return { summary, trend: await load(() => api.GET('/v1/weight-trend', { params: { query: { from, to: day } } })) };
}

export type WeightNumber =
  | { kind: 'trend'; kg: number; change: { direction: 'down' | 'up' | 'steady'; delta: string; size: string; since: string } | null }
  | { kind: 'waiting'; count: number; min: number };

/**
 * The weight tile: the latest trend value and its change over the window the chart shows (the first day drawn to the latest);
 * the weigh-ins toward the trend while it is not ready, or ready with no day in the window; nothing when the server did not say.
 */
export function weightNumber(read: WeightRead | undefined, units: UnitSystem): WeightNumber | null {
  if (read === undefined || read.summary.state !== 'ready') return null;
  const { weighInCount, trendMinWeighIns } = read.summary.value;
  const waiting: WeightNumber = { kind: 'waiting', count: Math.min(weighInCount, trendMinWeighIns), min: trendMinWeighIns };
  // Ready by the server's word: the trend or nothing. A trend that failed or has no day in the window is no tile (never "7 of 7").
  if (read.summary.value.trendReady) {
    if (read.trend?.state !== 'ready' || read.trend.value.length === 0) return null;
  } else return waiting;
  const points = read.trend.value;
  const [from, to] = [points[0], points[points.length - 1]];
  if (from.day === to.day) return { kind: 'trend', kg: to.kg, change: null };
  const { delta, size } = weightChange(from.kg, to.kg, units);
  return { kind: 'trend', kg: to.kg, change: { direction: delta === 0 ? 'steady' : delta < 0 ? 'down' : 'up', delta: Math.abs(delta).toFixed(weightDecimals), size, since: from.day } };
}

/** Protein eaten (the middle of the server's range, as the food line shows its number, ADR-090 #5) against the day's target. */
export function proteinNumber(budget: Loaded<Schemas['DayBudget']>): { eaten: number; target: number } | null {
  return budget.state === 'ready' && budget.value.targetProteinG > 0 ? { eaten: mid(budget.value.eaten.proteinG), target: budget.value.targetProteinG } : null;
}

/**
 * The step target before the first call: /v1/targets answers NOT_FOUND until the first estimate, so the starting plan's stands in,
 * as Progress reads it (`progress/read.ts`); asked only while /v1/targets has no answer, and the server refuses it once the first call is made.
 */
export async function loadStarting(api: ApiClient, targets: Loaded<Schemas['Targets']>): Promise<Loaded<Schemas['StartingTarget']> | undefined> {
  return targets.state === 'ready' ? undefined : load(() => api.GET('/v1/targets/starting'));
}

/** Steps today against the target: the target alone without Apple Health's count (not connected, or not read); nothing without a target. */
export function stepsNumber(
  targets: Loaded<Schemas['Targets']>,
  starting: Loaded<Schemas['StartingTarget']> | undefined,
  stepsToday: number | null | undefined,
): { steps: number | null; target: number } | null {
  const target = targets.state === 'ready' ? targets.value.stepsPerDay : starting?.state === 'ready' ? starting.value.stepsPerDay : null;
  return target === null ? null : { steps: stepsToday ?? null, target };
}
