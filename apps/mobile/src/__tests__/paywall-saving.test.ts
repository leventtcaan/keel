/**
 * The "Save X%" badge (K-1033, paywall v2, ADR-072 Ek 3): worked out on the phone from the store's own numbers, `1 - yearly /
 * (12 x monthly)`, in one currency, to the nearest whole percent; shown only at or above `saving_badge_min_percent`
 * (data/parameters/subscription.json, K2). Never a number of its own, never across currencies.
 */
import { subscriptionParams } from '@/subscription/params';
import { savingPercent } from '@/subscription/saving';
import type { Plan } from '@/subscription/store';

const ANNUAL: Plan = { id: '$rc_annual', period: 'annual', price: '$59.99', amount: 59.99, currency: 'USD', pricePerMonth: '$5.00', trial: null };
const MONTHLY: Plan = { id: '$rc_monthly', period: 'monthly', price: '$12.99', amount: 12.99, currency: 'USD', pricePerMonth: null, trial: null };

test('59.99 a year against 12.99 a month is 62%', () => {
  expect(savingPercent([ANNUAL, MONTHLY], 10)).toBe(62);
});

test('the minimum comes from the parameters, not from the code', () => {
  expect(subscriptionParams.savingBadgeMinPercent).toBe(10);
  expect(savingPercent([ANNUAL, MONTHLY])).toBe(62);
});

test('a saving under the minimum is not said', () => {
  const dear: Plan = { ...ANNUAL, amount: 140 }; // 1 - 140 / 155.88 = 10.2%
  expect(savingPercent([dear, MONTHLY], 10)).toBe(10);
  expect(savingPercent([dear, MONTHLY], 11)).toBeNull();
  expect(savingPercent([{ ...ANNUAL, amount: 150 }, MONTHLY], 10)).toBeNull(); // 3.8%
});

test('no saving at all (yearly dearer than twelve months), or nothing to compare: nothing', () => {
  expect(savingPercent([{ ...ANNUAL, amount: 200 }, MONTHLY], 0)).toBeNull();
  expect(savingPercent([ANNUAL], 10)).toBeNull();
  expect(savingPercent([MONTHLY], 10)).toBeNull();
  expect(savingPercent([{ ...ANNUAL, amount: 0 }, MONTHLY], 10)).toBeNull();
  expect(savingPercent([ANNUAL, { ...MONTHLY, amount: 0 }], 10)).toBeNull();
});

test('two currencies are not compared: no percentage', () => {
  expect(savingPercent([ANNUAL, { ...MONTHLY, currency: 'EUR' }], 10)).toBeNull();
});
