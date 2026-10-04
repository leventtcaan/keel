import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { configuredLegalLinks } from '@/subscription/links';
import { type Opened, confirmActive, openPaywall, restorePurchases, subscribe, wait } from '@/subscription/paywall';
import type { Plan } from '@/subscription/store';
import { paywallWords, planWords } from '@/subscription/words';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** A line under the plans: what came of the last thing tried. */
type Note = 'pending' | 'purchaseFailed' | 'restoreWaiting' | 'restoreFailed';
type Step =
  | { at: 'loading' }
  | { at: 'closed'; why: Exclude<Opened['state'], 'plans' | 'subscribed'> }
  | { at: 'plans'; plans: Plan[]; chosen: string; busy: 'buying' | 'restoring' | null; note: Note | null }
  | { at: 'active' }
  /** Bought; the server has not seen it yet (ADR-057 D2). */
  | { at: 'waiting'; looking: boolean };

/** The screen's step for what opening found. */
function stepOf(opened: Opened): Step {
  if (opened.state === 'plans') return { at: 'plans', plans: opened.plans, chosen: opened.plans[0].id, busy: null, note: null };
  return opened.state === 'subscribed' ? { at: 'active' } : { at: 'closed', why: opened.state };
}

/**
 * The paywall (K-702, prototype 1.11, ADR-057). The store's plans, annual chosen first, each with the store's price (K2);
 * the chosen plan's terms — the trial only for someone who can have it (Apple 3.1.2) — and its button. Bought, the server is
 * asked until it sees it (D2): subscribed, or "it can take a minute" with a way to look again — never a second purchase.
 * Restore is always offered; so are the legal links set in the build and a way out. Opened only when the user asks
 * (D5): from a feature that needs it, or Settings.
 */
export default function PaywallScreen() {
  const { api, purchases, report } = useAppServices();
  const { color } = useTheme();
  const [step, setStep] = useState<Step>({ at: 'loading' });
  const [links] = useState(configuredLegalLinks);
  // One purchase or restore at a time: a second tap while Apple's sheet is up does nothing (a ref both taps share).
  const running = useRef(false);

  const opening = useCallback(() => openPaywall({ api, store: purchases, report, links }).then(stepOf), [api, purchases, report, links]);
  useEffect(() => {
    let live = true; // an answer after the screen closed changes nothing
    void opening().then((opened) => {
      if (live) setStep(opened);
    });
    return () => {
      live = false;
    };
  }, [opening]);
  const open = async () => {
    setStep({ at: 'loading' });
    setStep(await opening());
  };

  const busy = (on: 'buying' | 'restoring' | null, note: Note | null = null) =>
    setStep((now) => (now.at === 'plans' ? { ...now, busy: on, note } : now));

  const buy = async (planId: string) => {
    if (running.current) return;
    running.current = true;
    busy('buying');
    try {
      const outcome = await subscribe({ api, store: purchases, wait }, planId);
      if (outcome === 'active') setStep({ at: 'active' });
      else if (outcome === 'waiting') setStep({ at: 'waiting', looking: false });
      else busy(null, outcome === 'pending' ? 'pending' : null);
    } catch (error) {
      report({ name: nameOf(error) });
      busy(null, 'purchaseFailed');
    } finally {
      running.current = false;
    }
  };

  const restore = async () => {
    if (running.current) return;
    running.current = true;
    busy('restoring');
    try {
      if ((await restorePurchases({ api, store: purchases, wait })) === 'active') setStep({ at: 'active' });
      else busy(null, 'restoreWaiting');
    } catch (error) {
      report({ name: nameOf(error) });
      busy(null, 'restoreFailed');
    } finally {
      running.current = false;
    }
  };

  const lookAgain = async () => {
    setStep({ at: 'waiting', looking: true });
    setStep((await confirmActive(api, wait)) ? { at: 'active' } : { at: 'waiting', looking: false });
  };

  const text = (words: string, tone: 'text' | 'textSecondary' | 'muted' = 'text') => (
    <Text style={[styles.text, { color: color[tone] }]}>{words}</Text>
  );
  const close = <Button label={t('subscription.close')} variant="ghost" size="sm" onPress={() => router.back()} />;

  let body: React.ReactNode;
  if (step.at === 'loading') {
    body = text(t('subscription.loading'), 'muted');
  } else if (step.at === 'closed') {
    // Not in the build (or not set up in it) cannot change by trying again; no connection and a store that failed can.
    const retryable = step.why === 'offline' || step.why === 'failed';
    const tryAgain = <Button label={t('subscription.tryAgain')} variant="ghost" onPress={() => void open()} />;
    body = (
      <View style={styles.part}>
        {text(t(`subscription.${step.why}`))}
        {retryable && tryAgain}
      </View>
    );
  } else if (step.at === 'active') {
    body = text(t('subscription.active'));
  } else if (step.at === 'waiting') {
    const look = <Button label={t('subscription.lookAgain')} variant="ghost" onPress={() => void lookAgain()} />;
    body = (
      <View style={styles.part}>
        {text(t('subscription.waiting'))}
        {step.looking ? text(t('subscription.confirming'), 'muted') : look}
      </View>
    );
  } else {
    const chosen = step.plans.find((plan) => plan.id === step.chosen) ?? step.plans[0];
    const words = paywallWords(chosen);
    const buying = step.busy === 'buying';
    const legal =
      links.length === 0 ? null : (
        <View style={styles.links}>
          {links.map((link) => linkButton(link.key, link.url, report))}
        </View>
      );
    body = (
      <View style={styles.part}>
        <ScreenTitle>{words.title}</ScreenTitle>
        {text(t('subscription.includes'), 'textSecondary')}
        <View accessibilityRole="radiogroup" style={styles.plans}>
          {step.plans.map((plan) => {
            const { title, body: price } = planWords(plan);
            return (
              <OptionCard
                key={plan.id}
                title={title}
                body={price}
                selected={plan.id === chosen.id}
                onPress={() => setStep((now) => (now.at === 'plans' && now.busy === null ? { ...now, chosen: plan.id, note: null } : now))}
              />
            );
          })}
        </View>
        <View style={styles.terms}>{words.terms.map((line) => <Text key={line} style={[styles.small, { color: color.textSecondary }]}>{line}</Text>)}</View>
        {step.note !== null && text(t(`subscription.${step.note}`))}
        {buying ? text(t('subscription.buying'), 'muted') : <Button label={words.action} disabled={step.busy !== null} onPress={() => void buy(chosen.id)} />}
        <Button label={t('subscription.restore')} variant="ghost" disabled={step.busy !== null} onPress={() => void restore()} />
        {legal}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.head}>{close}</View>
      <ScrollView contentContainerStyle={styles.body}>{body}</ScrollView>
    </SafeAreaView>
  );
}

/** A legal link set in the build (links.ts): opened in the browser; one that cannot be opened is reported by name. */
function linkButton(key: string, url: string, report: (problem: { name: string }) => void) {
  const open = () => void Linking.openURL(url).catch((error: unknown) => report({ name: nameOf(error) }));
  return <Button key={key} label={t(key)} variant="ghost" size="sm" onPress={open} />;
}

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

const styles = StyleSheet.create({
  safe: { flex: 1 },
  head: { paddingHorizontal: tokens.space.lg, alignItems: 'flex-end' },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  part: { gap: tokens.space.md },
  plans: { gap: tokens.space.sm },
  terms: { gap: tokens.space.xs },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
