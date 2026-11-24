/**
 * The day's plan in one phrase, for the screens that point to each other (K-1217): which program day is today's, and what is
 * left of today's food. Not decided here: the day is the Train card's (todayCardOf, the same function the Home and Train cards use),
 * the calories left are the server's budget, said as the single number the food page shows (ADR-090 #5). Nothing is counted on
 * the phone (U1); a part that cannot be read is left out, never guessed. Past the target says nothing (U7: no blame, no make-up).
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { formatNumber } from '@/copy/format';
import { t } from '@/copy';
import { budgetLine } from '@/food/budget';
import { mid } from '@/food/single';
import type { LocalRecord } from '@/sync/store';
import { dayName } from '@/train/program';

import { load, localDay } from './today';
import { todayCardOf } from './todayWorkout';

type Schemas = components['schemas'];

type Deps = { api: Pick<ApiClient, 'GET'>; workoutRecords?: () => Promise<LocalRecord[]> };

/**
 * Today's program day when today is a training day: a session to do, one under way, one done today. A skipped or moved session, a
 * rest day, a week off, no program, a program that could not be read: none.
 */
export async function trainingToday(deps: Deps, now: Date): Promise<Schemas['ProgramDay'] | null> {
  const program = await load(() => deps.api.GET('/v1/program'));
  if (program.state !== 'ready') return null;
  const records = await Promise.resolve()
    .then(() => deps.workoutRecords?.() ?? [])
    .catch((): LocalRecord[] => []);
  const card = todayCardOf({ program: program.value, kept: false, records, now });
  return card.kind === 'open' || card.kind === 'done' || card.kind === 'session' ? card.day : null;
}

export type DayPlan = { training: string | null; kcalLeft: number | null };

/** Today's training day (by name) and the calories left, each null when it cannot be said. */
export async function readDayPlan(deps: Deps, now: Date): Promise<DayPlan> {
  const [day, budget] = await Promise.all([
    trainingToday(deps, now).catch(() => null),
    load(() => deps.api.GET('/v1/days/{day}/budget', { params: { path: { day: localDay(now) } } })),
  ]);
  const left = budget.state === 'ready' ? budgetLine(budget.value.left).kcal : null;
  return { training: day === null ? null : dayName(day), kcalLeft: left !== null && left.kind === 'left' ? mid(left) : null };
}

/** "Today: Lower A · 1,136 kcal left"; null when there is nothing to say (a rest day with no budget read). */
export function planLine(plan: DayPlan): string | null {
  const parts = [plan.training, plan.kcalLeft === null ? null : t('dayPlan.kcalLeft', { kcal: formatNumber(plan.kcalLeft) })].filter((part) => part !== null);
  return parts.length === 0 ? null : t('dayPlan.today', { plan: parts.join(t('dayPlan.join')) });
}
