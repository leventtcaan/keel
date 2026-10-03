/**
 * The first eight weeks on Today (K-521, ADR-040, I1 F2): the week's own words, from the server's key (none in week one);
 * and in the weeks that read the risk, one message — when the server saw a signal, or the app was not opened in the week
 * before today's open (known only on the phone, ADR-041 #66). Any signal is a risk; none is weighed (ADR-040 #3).
 */
import type { components } from '@/api/schema';

import params from '../../../../data/parameters/onboarding.json';

type FirstWeeks = components['schemas']['FirstWeeks'];

const ABSENT_DAYS = (params.parameters as { key: string; value: unknown }[]).find((p) => p.key === 'first_weeks_app_absent_days')?.value as number;

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/** The week's words, and the risk's message key when there is one (in the plan's own words: training or not). */
export type FirstWeeksSaid = { content?: string; risk?: string };

export function firstWeeksSay(week: FirstWeeks, previousOpen: string | null, today: string): FirstWeeksSaid {
  // A week of days between this open and the one before: the app not opened in the week just over.
  const absent = previousOpen !== null && daysBetween(previousOpen, today) > ABSENT_DAYS;
  const risky = week.readsRisk && (week.risk.length > 0 || absent);
  const risk = risky ? (week.training ? 'first_weeks.risk' : 'first_weeks.no_training.risk') : undefined;
  return { ...(week.contentKey !== undefined ? { content: week.contentKey } : {}), ...(risk !== undefined ? { risk } : {}) };
}
