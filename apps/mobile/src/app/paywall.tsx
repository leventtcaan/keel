import { useLocalSearchParams } from 'expo-router';

import { useAppServices } from '@/services/ServicesProvider';
import { lockedWeekOf } from '@/subscription/PaywallHero';
import { Paywall } from '@/subscription/PaywallView';

/**
 * The plans, opened on a tap: from a feature that needs them, a locked call, or Settings (K-702, ADR-057 D5); never by itself
 * (ADR-091 Ek 7 #1: the trial is offered at the first locked call, no longer at the end of onboarding). Closed with its own button.
 * From a locked call, `?week=` names its week: the hero is the person's own call (ADR-094 Ek 8 #2). Opened from anywhere else in
 * the run that ended onboarding, the hero is the plan just shown (K-1058).
 */
export default function PaywallScreen() {
  const { week } = useLocalSearchParams<{ week?: string }>();
  const { planPreviews } = useAppServices();
  const lockedWeek = lockedWeekOf(week);
  return <Paywall preview={lockedWeek === null ? planPreviews.current() : null} lockedWeek={lockedWeek} />;
}
