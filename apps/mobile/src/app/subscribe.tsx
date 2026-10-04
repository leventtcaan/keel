import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/copy';
import { useAppServices, useSubscriptionGate } from '@/services/ServicesProvider';
import { AccountSection } from '@/settings/AccountSection';
import { Paywall } from '@/subscription/PaywallView';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The gate after onboarding (K-706, ADR-058 #1): an account that never subscribed sees the plans, with no way to close them.
 * Its account stays reachable — export, delete (App Review 5.1.1(v): deletion in the app, without paying), sign out. Once the
 * server sees a purchase or a restore the gate asks again and the root layout opens the tabs. Not known yet (nothing kept on
 * this phone): it asks, and waits.
 */
export default function SubscribeScreen() {
  const { gate } = useAppServices();
  const state = useSubscriptionGate();
  const { color } = useTheme();

  useEffect(() => {
    if (state === 'unknown') void gate.refresh(); // it reports its own failures; with no answer it opens
  }, [gate, state]);

  if (state !== 'required') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]}>
        <Text style={[styles.text, { color: color.muted }]}>{t('subscription.checking')}</Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <Paywall required onActive={() => void gate.refresh()} />
      <ScrollView style={styles.account} contentContainerStyle={styles.accountBody}>
        <AccountSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  text: { fontSize: tokens.type.body, padding: tokens.space.lg },
  account: { flexGrow: 0 },
  accountBody: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md },
});
