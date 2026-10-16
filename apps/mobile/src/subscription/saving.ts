/**
 * The saving of the yearly plan over twelve months of the monthly one (K-1033, paywall v2, ADR-072 Ek 3): `1 - yearly / (12 x
 * monthly)` from the store's own numbers (Plan.amount), to the nearest whole percent. Said only when both plans are there, in one
 * currency (two are not comparable without a rate the phone does not have), and at or above `saving_badge_min_percent` (K2).
 */
import { subscriptionParams } from './params';
import type { Plan } from './store';

const MONTHS_A_YEAR = 12;
const PERCENT = 100;

export function savingPercent(plans: Plan[], minPercent: number = subscriptionParams.savingBadgeMinPercent): number | null {
  const annual = plans.find((plan) => plan.period === 'annual');
  const monthly = plans.find((plan) => plan.period === 'monthly');
  if (annual === undefined || monthly === undefined || annual.currency !== monthly.currency) return null;
  if (!(annual.amount > 0) || !(monthly.amount > 0)) return null;
  const percent = Math.round((1 - annual.amount / (MONTHS_A_YEAR * monthly.amount)) * PERCENT);
  return percent > 0 && percent >= minPercent ? percent : null;
}
