import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useAppServices, useSubscriptionGate } from '@/services/ServicesProvider';
import { AccountSection } from '@/settings/AccountSection';
import { Paywall } from '@/subscription/PaywallView';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The gate after onboarding (K-706, ADR-058 › 107): an account that never subscribed sees the plans, with no way to close them.
 * Its account stays reachable — export, delete (App Review 5.1.1(v): deletion in the app, without paying), sign out. Once the
 * server sees a purchase or a restore the gate asks again and the root layout opens the tabs. Not known yet (nothing kept on
 * this phone): it asks, and waits. Right after onboarding it opens on the plan just shown (#paywall, ADR-072 #7, K-967).
 */
export default function SubscribeScreen() {
  const { gate, planPreviews } = useAppServices();
  const state = useSubscriptionGate();
  const { color } = useTheme();
  const [unanswered, setUnanswered] = useState(false);

  // Not known: ask (the gate reports its own failures). No answer is said, with a way to ask again — the gate never opens
  // by failing after a sign-in (K-706 review).
  const ask = useCallback(() => gate.refresh().then((answered) => setUnanswered(!answered)), [gate]);
  useEffect(() => {
    if (state === 'unknown') void ask();
  }, [ask, state]);
  // Subscribed: the plan kept for this screen is let go, then the gate asks again (the tabs open).
  const active = () => {
    planPreviews.forget();
    void gate.refresh();
  };
  const again = () => {
    setUnanswered(false);
    void ask();
  };

  if (state !== 'required') {
    const retry = unanswered ? <Button label={t('subscription.tryAgain')} variant="ghost" onPress={again} /> : null;
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]}>
        <Text style={[styles.text, { color: color.muted }]}>{t(unanswered ? 'subscription.checkFailed' : 'subscription.checking')}</Text>
        {retry}
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <Paywall required onActive={active} preview={planPreviews.current()} />
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
