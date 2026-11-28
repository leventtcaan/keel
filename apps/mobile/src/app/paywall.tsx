import { useLocalSearchParams } from 'expo-router';

import { useAppServices } from '@/services/ServicesProvider';
import { lockedWeekOf } from '@/subscription/PaywallHero';
import { Paywall } from '@/subscription/PaywallView';

/**
 * The plans, opened on a tap: from a feature that needs them, a locked call, or Settings (K-702, ADR-057 D5); never by itself
 * (ADR-091 Ek 7 #1: the trial is offered at the first locked call, no longer at the end of onboarding). Closed with its own button.
 * From a locked call, `?week=` names its week: once the server confirms it, the hero is the person's own call (ADR-094 Ek 8 #2).
 * Otherwise, on the day onboarding ended, the hero is the plan just shown (K-1058).
 */
export default function PaywallScreen() {
  const { week } = useLocalSearchParams<{ week?: string }>();
  const { planPreviews } = useAppServices();
  return <Paywall preview={planPreviews.current()} lockedWeek={lockedWeekOf(week)} />;
}
