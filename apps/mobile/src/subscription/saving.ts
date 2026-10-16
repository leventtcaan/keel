/**
 * The saving of the yearly plan over twelve months of the monthly one (K-1033, paywall v2, ADR-072 Ek 3): `1 - yearly / (12 x
 * monthly)` from the store's own numbers (Plan.amount), rounded DOWN to a whole percent: a saving is never overstated (Apple 3.1.2),
 * so 61.5% is said as 61. Said only when both plans are there, in one named currency (two are not comparable without a rate the
 * phone does not have), and at or above `saving_badge_min_percent` (K2).
 */
import { subscriptionParams } from './params';
import type { Plan } from './store';

const MONTHS_A_YEAR = 12;
const PERCENT = 100;
// Floating point can put an exact 10% a hair under (9.999999999999998): the floor must not take it down to 9.
const EPSILON = 1e-9;

export function savingPercent(plans: Plan[], minPercent: number = subscriptionParams.savingBadgeMinPercent): number | null {
  const annual = plans.find((plan) => plan.period === 'annual');
  const monthly = plans.find((plan) => plan.period === 'monthly');
  if (annual === undefined || monthly === undefined) return null;
  // Two plans with no currency, or two different ones, are not shown to be in the same one.
  if (!hasCurrency(annual) || !hasCurrency(monthly) || annual.currency !== monthly.currency) return null;
  if (!(annual.amount > 0) || !(monthly.amount > 0)) return null;
  const percent = Math.floor((1 - annual.amount / (MONTHS_A_YEAR * monthly.amount)) * PERCENT + EPSILON);
  return percent > 0 && percent >= minPercent ? percent : null;
}

const hasCurrency = (plan: Plan) => typeof plan.currency === 'string' && plan.currency !== '';
