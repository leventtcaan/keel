import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useAppServices, useSubscriptionGate } from '@/services/ServicesProvider';
import { Paywall } from '@/subscription/PaywallView';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The gate after onboarding (K-706, ADR-058 › 107): an account that never subscribed sees the plans, with no way to close them.
 * Its account stays reachable behind the header's Account button — export, delete (App Review 5.1.1(v): deletion in the app,
 * without paying), sign out (paywall v2, ADR-072 Ek 3). Once the server sees a purchase or a restore the gate asks again and the
 * root layout opens the tabs. Not known yet (nothing kept on this phone): it asks, and waits. Right after onboarding it opens
 * knowing the plan just shown (#paywall, ADR-072 #7, K-967).
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
  return <Paywall required onActive={active} preview={planPreviews.current()} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  text: { fontSize: tokens.type.body, padding: tokens.space.lg },
});
