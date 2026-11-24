import { useLocalSearchParams } from 'expo-router';

import { useAppServices } from '@/services/ServicesProvider';
import { Paywall } from '@/subscription/PaywallView';

/**
 * The plans, opened on a tap: from a feature that needs them, or Settings (K-702, ADR-057 D5). Closed with its own button. Right
 * after onboarding it opens once by itself (`?offer=1`, ADR-072 #7 as a soft offer, ADR-091 #1) with the plan the user just saw.
 */
export default function PaywallScreen() {
  const { offer } = useLocalSearchParams<{ offer?: string }>();
  const { planPreviews } = useAppServices();
  return <Paywall preview={offer === undefined ? null : planPreviews.current()} />;
}
