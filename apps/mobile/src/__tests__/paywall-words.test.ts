/**
 * What the paywall says (K-702, ADR-057 D3, Apple 3.1.2): each plan's price as the store formats it, how long it runs, the
 * trial only for someone who can have it, what is charged when it ends, that it renews until cancelled and how to cancel.
 * No price in code (K2); every word from the copy. The legal links come from configuration, not code.
 */
import { t } from '@/copy';
import { legalLinks } from '@/subscription/links';
import type { Plan } from '@/subscription/store';
import { paywallWords, planWords } from '@/subscription/words';

const ANNUAL: Plan = { id: '$rc_annual', period: 'annual', price: '$59.99', pricePerMonth: '$5.00', trial: { count: 7, unit: 'day' } };
const MONTHLY: Plan = { id: '$rc_monthly', period: 'monthly', price: '$12.99', pricePerMonth: null, trial: null };

test("each plan: its name and the store's price, the annual one's monthly share as the store works it out", () => {
  expect(planWords(ANNUAL)).toEqual({ title: t('subscription.plan.annual'), body: '$59.99 a year · $5.00 a month, billed once a year' });
  expect(planWords(MONTHLY)).toEqual({ title: t('subscription.plan.monthly'), body: '$12.99 a month · Billed every month' });
  expect(planWords({ ...ANNUAL, pricePerMonth: null }).body).toBe('$59.99 a year');
});

test('with a trial: what today costs, what is charged when it ends and that it renews until cancelled; the button starts the trial', () => {
  expect(paywallWords(ANNUAL)).toEqual({
    title: 'Try it free for 7 days',
    terms: ['Today: full access, nothing charged.', 'When the trial ends: $59.99 a year, renewing every year until you cancel.', t('subscription.cancelNote')],
    action: t('subscription.startTrial'),
  });
});

test('without one (none offered, or had already): the price and the renewal only; no word of a trial anywhere', () => {
  const words = paywallWords(MONTHLY);
  expect(words).toEqual({
    title: t('subscription.title'),
    terms: ['$12.99 a month, renewing every month until you cancel.', t('subscription.cancelNote')],
    action: t('subscription.subscribe'),
  });
  expect(JSON.stringify(words).toLowerCase()).not.toContain('trial');
});

test.each([
  [{ count: 1, unit: 'week' } as const, 'Try it free for 1 week'],
  [{ count: 2, unit: 'week' } as const, 'Try it free for 2 weeks'],
  [{ count: 1, unit: 'month' } as const, 'Try it free for 1 month'],
])('the trial is said in the store’s own unit (%j)', (trial, title) => {
  expect(paywallWords({ ...ANNUAL, trial }).title).toBe(title);
});

test('the cancel note says how, when, and that what was paid for stays', () => {
  expect(t('subscription.cancelNote')).toMatch(/Settings/);
  expect(t('subscription.cancelNote')).toMatch(/24 hours/);
});

test('the legal links come from configuration; one not set, or not https, is not shown', () => {
  expect(legalLinks({ terms: 'https://example.test/terms', privacy: 'https://example.test/privacy' })).toEqual([
    { key: 'subscription.terms', url: 'https://example.test/terms' },
    { key: 'subscription.privacy', url: 'https://example.test/privacy' },
  ]);
  expect(legalLinks({ terms: undefined, privacy: ' ' })).toEqual([]);
  expect(legalLinks({ terms: 'http://example.test/terms', privacy: 'javascript:alert(1)' })).toEqual([]);
});
