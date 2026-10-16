/**
 * What the paywall says (K-702, ADR-057 D3, Apple 3.1.2): each plan's price as the store formats it, how long it runs, the
 * trial only for someone who can have it, what is charged when it ends, that it renews until cancelled and how to cancel.
 * No price in code (K2); every word from the copy. The legal links come from configuration, not code.
 */
import { t } from '@/copy';
import { legalLinks } from '@/subscription/links';
import type { Plan } from '@/subscription/store';
import { paywallWords, planWords } from '@/subscription/words';

const ANNUAL: Plan = { id: '$rc_annual', period: 'annual', price: '$59.99', amount: 59.99, currency: 'USD', pricePerMonth: '$5.00', trial: { count: 7, unit: 'day' } };
const TODAY = '2026-10-13';
const MONTHLY: Plan = { id: '$rc_monthly', period: 'monthly', price: '$12.99', amount: 12.99, currency: 'USD', pricePerMonth: null, trial: null };

test("each plan: its name, how it is billed and the store's price; the annual one's monthly share as the store works it out", () => {
  expect(planWords(ANNUAL, null)).toEqual({
    title: t('subscription.plan.annual'),
    note: 'Billed once a year',
    price: '$59.99 a year',
    perMonth: '$5.00 a month',
    badge: null,
    label: 'Yearly, Billed once a year, $59.99 a year, $5.00 a month',
  });
  expect(planWords(MONTHLY, null)).toEqual({
    title: t('subscription.plan.monthly'),
    note: 'Billed every month',
    price: '$12.99 a month',
    perMonth: null,
    badge: null,
    label: 'Monthly, Billed every month, $12.99 a month',
  });
  expect(planWords({ ...ANNUAL, pricePerMonth: null }, null).perMonth).toBeNull();
});

test('a saving is a badge on the yearly plan, said in full to a screen reader; the monthly plan never has one', () => {
  expect(planWords(ANNUAL, 62).badge).toBe('Save 62%');
  expect(planWords(ANNUAL, 62).label).toBe('Yearly, Billed once a year, $59.99 a year, $5.00 a month, saves 62 percent compared with monthly');
  expect(planWords(MONTHLY, 62).badge).toBeNull();
});

// ADR-058 > 105 (the product owner): a reminder can come before the trial ends, offered, never promised: the timeline says it.
test('with a trial: when it ends, what is charged then and that it renews until cancelled; the button starts it', () => {
  expect(paywallWords(ANNUAL, TODAY)).toEqual({
    title: 'Try it free for 7 days',
    lead: 'Try it free',
    accent: 'for 7 days',
    sub: { lead: 'Full access today. Nothing is charged until', date: 'Tue, Oct 20' },
    terms: ['When the trial ends: $59.99 a year, renewing every year until you cancel.', t('subscription.cancelNote')],
    dock: { strong: 'No charge today.', rest: 'Then $59.99 a year, renewing every year until you cancel.' },
    action: 'Start 7-day free trial',
  });
});

test('without one (none offered, or had already): the price and the renewal only; no word of a trial anywhere', () => {
  const words = paywallWords(MONTHLY, TODAY);
  expect(words).toEqual({
    title: t('subscription.title'),
    lead: t('subscription.title'),
    accent: null,
    sub: null,
    terms: ['$12.99 a month, renewing every month until you cancel.', t('subscription.cancelNote')],
    dock: { strong: null, rest: '$12.99 a month, renewing every month until you cancel.' },
    action: t('subscription.subscribe'),
  });
  expect(JSON.stringify(words).toLowerCase()).not.toContain('trial');
});

test.each([
  [{ count: 1, unit: 'week' } as const, 'Try it free for 1 week'],
  [{ count: 2, unit: 'week' } as const, 'Try it free for 2 weeks'],
  [{ count: 1, unit: 'month' } as const, 'Try it free for 1 month'],
])('the trial is said in the store’s own unit (%j)', (trial, title) => {
  expect(paywallWords({ ...ANNUAL, trial }, TODAY).title).toBe(title);
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
