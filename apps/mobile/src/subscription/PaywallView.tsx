import { router } from 'expo-router';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { coachAvailable } from '@/food/aiLogging';
import { useAppServices } from '@/services/ServicesProvider';
import { stateWords } from '@/settings/SubscriptionSection';
import { AccountButton, AccountSheet } from '@/subscription/AccountSheet';
import { BrandMark } from '@/subscription/BrandMark';
import { ExampleCard } from '@/subscription/ExampleCard';
import { type ReadyCall, ReadyCallHero, WeightExample, loadReadyCall } from '@/subscription/PaywallHero';
import { YourPlanCard } from '@/subscription/YourPlanCard';
import { configuredLegalLinks } from '@/subscription/links';
import { type Opened, confirmActive, openPaywall, restorePurchases, subscribe, wait } from '@/subscription/paywall';
import { PlanOption, TimelineCard, type ValueRow, Values } from '@/subscription/PaywallParts';
import type { PlanPreview } from '@/subscription/planPreview';
import { savingPercent } from '@/subscription/saving';
import type { Plan } from '@/subscription/store';
import { TrialReminderOffer } from '@/subscription/TrialReminderOffer';
import { paywallTimeline, paywallWords, planWords } from '@/subscription/words';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { localDay } from '@/today/today';

/** A line above the button: what came of the last thing tried. */
type Note = 'pending' | 'purchaseFailed' | 'restoreWaiting' | 'restoreFailed';
type Step =
  | { at: 'loading' }
  | { at: 'closed'; why: Exclude<Opened['state'], 'plans' | 'subscribed'> }
  | { at: 'plans'; plans: Plan[]; chosen: string; busy: 'buying' | 'restoring' | null; note: Note | null }
  | { at: 'active'; subscription?: components['schemas']['Subscription'] }
  /** Bought; the server has not seen it yet (ADR-057 D2). */
  | { at: 'waiting'; looking: boolean };

/** The screen's step for what opening found. */
function stepOf(opened: Opened): Step {
  if (opened.state === 'plans') return { at: 'plans', plans: opened.plans, chosen: opened.plans[0].id, busy: null, note: null };
  return opened.state === 'subscribed' ? { at: 'active', subscription: opened.subscription } : { at: 'closed', why: opened.state };
}

type Props = {
  /**
   * The gate after onboarding (K-706, ADR-058 › 107): no way to close it, and the account behind a button instead (App Review
   * 5.1.1(v)); once the server sees the subscription, "Continue" calls `onActive` and the gate asks again (the tabs open) — on a
   * tap, never by itself, so the moment is said first.
   */
  required?: boolean;
  onActive?: () => void;
  /** The plan just shown at the end of onboarding (#ob-plan): what its program has (the values), and whether it has calls (K-967). */
  preview?: PlanPreview | null;
  /** The week of the person's locked call, when its "See plans" opened the paywall (ADR-094 Ek 8 #2): the hero is theirs. */
  lockedWeek?: string | null;
};

/**
 * The paywall (K-702, K-1033, K-1253; ADR-057, ADR-072 #7 and Ek 3, ADR-094 Ek 8): the page is the paper, no band and no card.
 * The hero first — the plan just shown, or the person's own call waiting locked with their weight, or an example told in
 * weight, marked as one; then what happens when, under the screen's heading (today, the first call, the reminder, the charge)
 * for the chosen plan, the trial as long as the store's offer; then the store's plans side by side, annual chosen first, each
 * with the store's price (K2) and, when it is real, the saving; the benefits; the chosen plan's terms in full, the trial only
 * for someone who can have it (Apple 3.1.2). The button, the price in a line and Restore, Terms, Privacy stay at the bottom.
 * Bought, the server is asked until it sees it (D2): subscribed, or "it can take a minute" with a way to look again — never a
 * second purchase. Opened only when the user asks (D5): from a feature that needs it, or Settings.
 */
export function Paywall({ required = false, onActive, preview = null, lockedWeek = null }: Props) {
  const { api, purchases, report } = useAppServices();
  const { color } = useTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const [step, setStep] = useState<Step>({ at: 'loading' });
  const [account, setAccount] = useState(false);
  // How tall the sticky bottom is: the page ends with that much room, so the last plan and the terms are never behind it.
  const [dockHeight, setDockHeight] = useState(0);
  const [links] = useState(configuredLegalLinks);
  // One purchase or restore at a time: a second tap while Apple's sheet is up does nothing (a ref both taps share).
  const running = useRef(false);

  // Opened from the person's locked call (ADR-094 Ek 8 #2): their call once the server confirms it waits for that week, with
  // their weight. While it is asked there is no hero (no example that turns into their call); not confirmed is the example.
  // The answer is kept with the week it is for, so a week that changed is asked again, never shown with the old answer.
  const [answer, setAnswer] = useState<{ week: string; found: ReadyCall | null } | null>(null);
  useEffect(() => {
    if (lockedWeek === null) return;
    let live = true;
    void loadReadyCall(api, lockedWeek, localDay(new Date()))
      .catch(() => null)
      .then((found) => {
        if (live) setAnswer({ week: lockedWeek, found });
      });
    return () => {
      live = false;
    };
  }, [api, lockedWeek]);
  const ready: ReadyCall | null | 'asking' = lockedWeek === null ? null : answer?.week === lockedWeek ? answer.found : 'asking';

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
  const activate = () => setStep({ at: 'active' });

  const busy = (on: 'buying' | 'restoring' | null, note: Note | null = null) =>
    setStep((now) => (now.at === 'plans' ? { ...now, busy: on, note } : now));

  const buy = async (planId: string) => {
    if (running.current) return;
    running.current = true;
    busy('buying');
    try {
      const outcome = await subscribe({ api, store: purchases, wait }, planId);
      if (outcome === 'active') activate();
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
      if ((await restorePurchases({ api, store: purchases, wait })) === 'active') activate();
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
    if (await confirmActive(api, wait)) activate();
    else setStep({ at: 'waiting', looking: false });
  };

  const text = (words: string, tone: 'text' | 'textSecondary' | 'muted' = 'text') => (
    <Text style={[styles.text, { color: color[tone] }]}>{words}</Text>
  );
  // The gate has no way out but the plans and, behind a button, the account: ADR-058 › 107, App Review 5.1.1(v).
  const corner = required ? (
    <AccountButton onPress={() => setAccount(true)} />
  ) : (
    <Button label={t('subscription.close')} variant="text" size="sm" onPress={() => router.back()} />
  );

  let hero: React.ReactNode = null;
  let body: React.ReactNode;
  let dock: React.ReactNode = null;
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
    const onward = required ? <Button label={t('subscription.continue')} onPress={() => onActive?.()} /> : null;
    body = (
      <View style={styles.part}>
        {text(t('subscription.active'))}
        {/* What the server already says of it: the status and the day it renews or ends (as Settings says it). */}
        {step.subscription?.status !== undefined && text(stateWords(step.subscription), 'textSecondary')}
        <TrialReminderOffer />
        {onward}
      </View>
    );
  } else if (step.at === 'waiting') {
    const look = <Button label={t('subscription.lookAgain')} variant="ghost" onPress={() => void lookAgain()} />;
    body = (
      <View style={styles.part}>
        {text(t('subscription.waiting'))}
        {step.looking ? text(t('subscription.confirming'), 'muted') : look}
      </View>
    );
  } else {
    const today = localDay(new Date());
    const chosen = step.plans.find((plan) => plan.id === step.chosen) ?? step.plans[0];
    const words = paywallWords(chosen, today);
    const saving = savingPercent(step.plans);
    const buying = step.busy === 'buying';
    const timeline = paywallTimeline(chosen, { today, firstCall: preview?.firstCall ?? null });
    // Without the health data consent there are no calls (ADR-074): the example is a set's target, and another value takes the call's place.
    const calls = preview === null || preview.firstCall !== null;
    // The hero (ADR-094 Ek 8 #2): right after onboarding, with calls, the plan the person just saw, tagged Yours (K-1058); else their
    // own call waiting locked, with their weight; else an example told in weight. Without calls, the set's example.
    if (preview !== null && preview.firstCall !== null) hero = <YourPlanCard preview={{ ...preview, firstCall: preview.firstCall }} />;
    else if (!calls) hero = <ExampleCard />;
    else if (ready === 'asking') hero = null;
    else hero = ready === null ? <WeightExample /> : <ReadyCallHero ready={ready} />;
    // Concrete lines (ADR-094 Ek 8 #5). With calls: the call every week after the first, on the profile's own day (met later,
    // with no plan just shown, without a day), and the coach once it is on (aiLogging.ts, never as a promise) or the cardio and
    // food that adjust. Without calls (no health data consent): the program, the weights, and the cardio only when the program
    // sets some. Logging, programs and weights are free, so they are not sold here (ADR-091 #1).
    let values: ValueRow[];
    if (preview !== null && preview.firstCall === null) {
      const program: ValueRow = { words: t(preview.own ? 'subscription.values.own' : 'subscription.values.built') };
      const other: ValueRow = { words: t(preview.hasCardio ? 'subscription.values.cardio' : 'subscription.values.swap') };
      values = [program, { words: t('subscription.values.after') }, other];
    } else {
      const call = preview === null ? t('subscription.values.weeklyCall') : t('subscription.values.call', { day: t(`onboarding.schedule.dayName.${preview.checkInDay}`) });
      const second: ValueRow = { words: t(coachAvailable() ? 'subscription.values.coach' : 'subscription.values.adjust') };
      values = [{ words: call }, second];
    }
    const choose = (id: string) => setStep((now) => (now.at === 'plans' && now.busy === null ? { ...now, chosen: id, note: null } : now));
    body = (
      <View style={styles.part}>
        {/* What happens when, under the screen's heading, before the prices (ADR-094 Ek 8 #3; arastirma M2 › K3). */}
        <TimelineCard rows={timeline} title={words.title} lead={words.lead} accent={words.accent} />
        <View accessibilityRole="radiogroup" style={styles.plans}>
          {step.plans.map((plan) => (
            <PlanOption key={plan.id} line={planWords(plan, saving)} price={plan.price} selected={plan.id === chosen.id} disabled={step.busy !== null} onPress={() => choose(plan.id)} />
          ))}
        </View>
        <Values rows={values} />
        {/* The full terms (Apple 3.1.2): the line at the bottom says them in short. */}
        <View style={styles.terms}>{words.terms.map((line) => <Text key={line} style={[styles.fine, { color: color.muted }]}>{line}</Text>)}</View>
      </View>
    );
    dock = (
      <View testID="paywall-dock" onLayout={(event) => setDockHeight(event.nativeEvent.layout.height)} style={[styles.dock, { backgroundColor: color.background, borderTopColor: color.line, paddingBottom: Math.max(insets?.bottom ?? 0, tokens.space.sm) }]}>
        {step.note !== null && text(t(`subscription.${step.note}`))}
        {buying ? text(t('subscription.buying'), 'muted') : <Button label={words.action} disabled={step.busy !== null} onPress={() => void buy(chosen.id)} />}
        {/* The billed amount is as prominent as the trial claim (Apple 3.1.2): bold, in the text colour, not the muted one. */}
        <Text accessibilityLabel={words.dock.label} style={[styles.line, { color: color.muted }]}>
          {words.dock.strong !== null && <Text style={[styles.bold, { color: color.text }]}>{words.dock.strong}</Text>}
          {words.dock.strong !== null && ' '}
          {words.dock.lead !== null && `${words.dock.lead} `}
          <Text style={[styles.bold, { color: color.text }]}>{words.dock.price}</Text>
          {words.dock.tail}
        </Text>
        <View style={styles.links}>
          <QuietLink label={t('subscription.restore')} disabled={step.busy !== null} onPress={() => void restore()} />
          {links.map((link) => (
            <QuietLink key={link.key} label={t(link.key)} onPress={() => void Linking.openURL(link.url).catch((error: unknown) => report({ name: nameOf(error) }))} />
          ))}
        </View>
      </View>
    );
  }

  const statusBand = required ? <View testID="status-bar-band" style={{ height: insets?.top ?? 0, backgroundColor: color.background }} /> : null;
  return (
    <View testID="paywall" style={[styles.safe, { backgroundColor: color.background }]}>
      {/* The status bar's own place, outside the scroll (ADR-087 #2), only where the page fills the screen (the gate): scrolled,
          the page stops under the clock instead of passing under it. A sheet starts below the clock already, so it has none
          (ADR-094 Ek 8 #1). The paper's colour: no band, no card (ADR-094 §1). */}
      {statusBand}
      <ScrollView testID="paywall-scroll" contentContainerStyle={[styles.scroll, dockHeight > 0 && { paddingBottom: dockHeight }]}>
        <View style={styles.top}>
          <View style={styles.head}>
            <View style={styles.brand}>
              <BrandMark />
              <Text style={[styles.brandName, { color: color.text }]}>{t('app.name')}</Text>
            </View>
            {corner}
          </View>
          {hero}
        </View>
        <View style={styles.body}>{body}</View>
      </ScrollView>
      {dock}
      {required && <AccountSheet visible={account} onClose={() => setAccount(false)} />}
    </View>
  );
}

/** Restore, Terms, Privacy: links in petrol (ADR-094 §3), a touch target of their own. */
function QuietLink({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { color } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={tokens.space.sm}>
      <Text style={[styles.link, { color: color.accent }, disabled && styles.dim]}>{label}</Text>
    </Pressable>
  );
}

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  top: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.sm, gap: tokens.space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: tokens.size.touch },
  brand: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  brandName: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  part: { gap: tokens.space.md },
  plans: { flexDirection: 'row', gap: tokens.space.md },
  terms: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.bold },
  fine: { fontSize: tokens.type.label },
  dock: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, gap: tokens.space.sm, borderTopWidth: tokens.border.hairline },
  line: { fontSize: tokens.type.label, textAlign: 'center' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: tokens.space.lg },
  link: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold, paddingVertical: tokens.space.sm },
  dim: { opacity: tokens.opacity.dim },
});
