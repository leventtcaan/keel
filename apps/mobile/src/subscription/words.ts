/**
 * What the paywall says (K-702, ADR-057 D3; Apple 3.1.2): the plan's name and the store's price, how long it runs, the trial
 * only when the store says this user can have it, what is charged when it ends, that it renews until cancelled, and how to
 * cancel. Every word from the copy; every price the store's own string (K2).
 */
import { t } from '@/copy';

import type { Plan } from './store';

/** "7 days", "1 week": the trial in the store's own unit. */
function span(trial: NonNullable<Plan['trial']>): string {
  return trial.count === 1 ? t(`subscription.trialSpanOne.${trial.unit}`) : t(`subscription.trialSpan.${trial.unit}`, { count: String(trial.count) });
}

/** One plan to choose: its name, and its price as the store gives it. */
export function planWords(plan: Plan): { title: string; body: string } {
  if (plan.period === 'annual') {
    const price = t('subscription.plan.annualPrice', { price: plan.price });
    return {
      title: t('subscription.plan.annual'),
      body: plan.pricePerMonth === null ? price : `${price} · ${t('subscription.plan.annualPerMonth', { perMonth: plan.pricePerMonth })}`,
    };
  }
  return { title: t('subscription.plan.monthly'), body: `${t('subscription.plan.monthlyPrice', { price: plan.price })} · ${t('subscription.plan.monthlyBilled')}` };
}

/** The page for the chosen plan: its title, the terms in order, and what its button says. */
export function paywallWords(plan: Plan): { title: string; terms: string[]; action: string } {
  const cancel = t('subscription.cancelNote');
  if (plan.trial === null) {
    return { title: t('subscription.title'), terms: [t(`subscription.renews.${plan.period}`, { price: plan.price }), cancel], action: t('subscription.subscribe') };
  }
  return {
    title: t('subscription.titleTrial', { trial: span(plan.trial) }),
    terms: [t('subscription.today'), t(`subscription.after.${plan.period}`, { price: plan.price }), cancel],
    action: t('subscription.startTrial'),
  };
}
