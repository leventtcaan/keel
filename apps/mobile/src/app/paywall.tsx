import { useLocalSearchParams } from 'expo-router';

import { useAppServices } from '@/services/ServicesProvider';
import { lockedWeekOf } from '@/subscription/PaywallHero';
import { Paywall } from '@/subscription/PaywallView';

/**
 * The plans, opened on a tap: from a feature that needs them, or Settings (K-702, ADR-057 D5). Closed with its own button. Right
 * after onboarding it opens once by itself (`?offer=1`, ADR-072 #7 as a soft offer, ADR-091 #1) with the plan the user just saw.
 * From a locked call, `?week=` names its week: the hero is the person's own call (ADR-094 Ek 8 #2).
 */
export default function PaywallScreen() {
  const { offer, week } = useLocalSearchParams<{ offer?: string; week?: string }>();
  const { planPreviews } = useAppServices();
  return <Paywall preview={offer === undefined ? null : planPreviews.current()} lockedWeek={lockedWeekOf(week)} />;
}
