import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { restorePurchases, wait } from '@/subscription/paywall';
import { hasStoreSubscription } from '@/subscription/status';
import { TrialReminderOffer } from '@/subscription/TrialReminderOffer';
import { dayWords } from '@/subscription/words';
import { load } from '@/today/today';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Section } from './Section';
import { useAction } from './useAction';

type Subscription = components['schemas']['Subscription'];
type Read = { state: 'loading' } | { state: 'ready'; subscription: Subscription } | { state: 'failed' };

/** What the server keeps, in words: none, or the status with the day its access ends (or ended). */
function stateWords(subscription: Subscription): string {
  if (subscription.status === undefined) return t('settings.subscription.none');
  const date = subscription.accessUntil === undefined ? '' : dayWords(subscription.accessUntil);
  return t(`settings.subscription.status.${subscription.status}`, { date });
}

/**
 * Settings › Subscription (K-702, prototype 5.2, ADR-057 D4). The server's word on the subscription (K-705), said plainly.
 * Cancelling is two taps: "Cancel or change plan" opens Apple's own page at once — no screen of ours between, no "are you
 * sure", nothing said about what would be lost (U7; ADR-012: cancelling is visible). No pause button: the App Store has no
 * pause (ADR-057). Without a subscription, the way to the plans. Restore always, where the store is in the build; nothing
 * is pressed under an account the server did not name.
 */
export function SubscriptionSection() {
  const { api, purchases } = useAppServices();
  const { color } = useTheme();
  const { busy, problem, run } = useAction();
  const [read, setRead] = useState<Read>({ state: 'loading' });
  const [restoreWaiting, setRestoreWaiting] = useState(false);

  const reading = useCallback(
    () => load(() => api.GET('/v1/subscription')).then((loaded): Read => (loaded.state === 'ready' ? { state: 'ready', subscription: loaded.value } : { state: 'failed' })),
    [api],
  );
  // Read whenever Settings comes into view: the paywall closes over it, so a purchase made there shows here (K-702 review).
  useFocusEffect(
    useCallback(() => {
      let live = true; // an answer after Settings went out of view changes nothing
      void reading().then((now) => {
        if (live) setRead(now);
      });
      return () => {
        live = false;
      };
    }, [reading]),
  );
  const refresh = async () => setRead(await reading());

  const note = (words: string, tone: 'text' | 'muted' = 'muted') => <Text style={[styles.note, { color: color[tone] }]}>{words}</Text>;

  if (read.state !== 'ready') {
    const failed = read.state === 'failed' ? note(t('settings.subscription.failed'), 'text') : null;
    return <Section title={t('settings.subscription.title')}>{failed}</Section>;
  }
  const { subscription } = read;
  const manageable = hasStoreSubscription(subscription);

  const manage = () =>
    void run(
      async () => {
        await purchases.identify(subscription.appUserId);
        await purchases.manage();
        await refresh(); // back from Apple's page: a cancellation or a change made there shows here
      },
      {},
      'settings.subscription.manageFailed',
    );
  const restore = () =>
    void run(
      async () => {
        setRestoreWaiting(false);
        const outcome = await restorePurchases({ api, store: purchases, wait });
        if (outcome === 'active') await refresh();
        else setRestoreWaiting(true);
      },
      {},
      'subscription.restoreFailed',
    );

  const manageButton = <Button label={t('settings.subscription.manage')} variant="ghost" size="sm" disabled={busy} onPress={manage} />;
  const plansButton = <Button label={t('subscription.seePlans')} variant="ghost" size="sm" onPress={() => router.push('/paywall')} />;
  const restoreButton = <Button label={t('subscription.restore')} variant="ghost" size="sm" disabled={busy} onPress={restore} />;

  return (
    <Section title={t('settings.subscription.title')}>
      <Text style={[styles.label, { color: color.text }]}>{stateWords(subscription)}</Text>
      <TrialReminderOffer subscription={subscription} />
      {manageable && purchases.available && manageButton}
      {manageable && purchases.available && note(t('settings.subscription.manageNote'))}
      {manageable && !purchases.available && note(t('settings.subscription.unavailable'))}
      {!manageable && plansButton}
      {purchases.available && restoreButton}
      {restoreWaiting && note(t('subscription.restoreWaiting'), 'text')}
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </Section>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
