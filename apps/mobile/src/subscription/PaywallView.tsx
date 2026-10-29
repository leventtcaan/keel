import { router } from 'expo-router';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { AccountButton, AccountSheet } from '@/subscription/AccountSheet';
import { BrandMark } from '@/subscription/BrandMark';
import { ExampleCard } from '@/subscription/ExampleCard';
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
  | { at: 'active' }
  /** Bought; the server has not seen it yet (ADR-057 D2). */
  | { at: 'waiting'; looking: boolean };

/** The screen's step for what opening found. */
function stepOf(opened: Opened): Step {
  if (opened.state === 'plans') return { at: 'plans', plans: opened.plans, chosen: opened.plans[0].id, busy: null, note: null };
  return opened.state === 'subscribed' ? { at: 'active' } : { at: 'closed', why: opened.state };
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
};

/**
 * The paywall (K-702, K-1033; prototype paywall-v2, ADR-057, ADR-072 #7 and Ek 3). The example call as the hero, marked as one;
 * the headline, three values; the store's plans, annual chosen first, each with the store's price (K2) and, when it is real, the
 * saving; the timeline — today, the first call, the reminder, the charge — for the chosen plan, the trial as long as the store's
 * offer; the chosen plan's terms in full, the trial only for someone who can have it (Apple 3.1.2). The button, the price in a
 * line and Restore, Terms, Privacy stay at the bottom. Bought, the server is asked until it sees it (D2): subscribed, or "it can
 * take a minute" with a way to look again — never a second purchase. Opened only when the user asks (D5): from a feature that
 * needs it, or Settings.
 */
export function Paywall({ required = false, onActive, preview = null }: Props) {
  const { api, purchases, report } = useAppServices();
  const { color } = useTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const [step, setStep] = useState<Step>({ at: 'loading' });
  const [account, setAccount] = useState(false);
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
    <Button label={t('subscription.close')} variant="ghost" size="sm" onPress={() => router.back()} />
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
    // Right after onboarding, with calls: the plan the person just saw is the hero, tagged Yours (K-1058). Met later (Settings), or
    // without calls, the example stays: it is not this person's call, and says so.
    hero = preview !== null && preview.firstCall !== null ? <YourPlanCard preview={{ ...preview, firstCall: preview.firstCall }} /> : <ExampleCard kind={calls ? 'call' : 'set'} />;
    // The weekly call on the profile's own day; met later, with no plan just shown, without a day; the cardio only when the program sets some.
    let call: string;
    if (preview === null) call = t('subscription.values.weeklyCall');
    else if (preview.firstCall === null) call = t(preview.hasCardio ? 'subscription.values.cardio' : 'subscription.values.swap');
    else call = t('subscription.values.call', { day: t(`onboarding.schedule.dayName.${preview.checkInDay}`) });
    const program: ValueRow = { icon: 'program', words: t(preview?.own === true ? 'subscription.values.own' : 'subscription.values.built') };
    const sets: ValueRow = { icon: 'sets', words: t('subscription.values.sets') };
    const weekly: ValueRow = { icon: 'call', words: call };
    // With a call of its own, it leads (K-1058): the call, food and training together, then what each set holds.
    const values: ValueRow[] = preview !== null && preview.firstCall !== null ? [weekly, program, sets] : [program, sets, weekly];
    const choose = (id: string) => setStep((now) => (now.at === 'plans' && now.busy === null ? { ...now, chosen: id, note: null } : now));
    body = (
      <View style={styles.part}>
        <View style={styles.part}>
          <ScreenTitle accent={words.accent ?? undefined} label={words.title}>
            {words.lead}
          </ScreenTitle>
          {words.sub !== null && (
            <Text style={[styles.text, { color: color.textSecondary }]}>
              {words.sub.lead} <Text style={styles.bold}>{words.sub.date}</Text>
              {'.'}
            </Text>
          )}
        </View>
        <Values rows={values} />
        <View accessibilityRole="radiogroup" style={styles.plans}>
          {step.plans.map((plan) => (
            <PlanOption key={plan.id} line={planWords(plan, saving)} selected={plan.id === chosen.id} disabled={step.busy !== null} onPress={() => choose(plan.id)} />
          ))}
        </View>
        <TimelineCard rows={timeline} />
        {/* The full terms (Apple 3.1.2): the line at the bottom says them in short. */}
        <View style={styles.terms}>{words.terms.map((line) => <Text key={line} style={[styles.fine, { color: color.muted }]}>{line}</Text>)}</View>
      </View>
    );
    dock = (
      <View style={[styles.dock, { backgroundColor: color.background, borderTopColor: color.line, paddingBottom: Math.max(insets?.bottom ?? 0, tokens.space.sm) }]}>
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

  return (
    <View testID="paywall" style={[styles.safe, { backgroundColor: color.background }]}>
      {/* The status bar's own place, outside the scroll (ADR-087 #2): in the band's colour, so at rest it is the band's top, and
          scrolled, the page stops under it instead of passing under the clock. */}
      <View testID="status-bar-band" style={{ height: insets?.top ?? 0, backgroundColor: color.accentSoft }} />
      <ScrollView testID="paywall-scroll" contentContainerStyle={styles.scroll}>
        <View style={[styles.band, { backgroundColor: color.accentSoft, paddingTop: tokens.space.sm }]}>
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

/** Restore, Terms, Privacy: quiet, underlined, a touch target of their own. */
function QuietLink({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { color } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={tokens.space.sm}>
      <Text style={[styles.link, { color: color.muted }, disabled && styles.dim]}>{label}</Text>
    </Pressable>
  );
}

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  band: { borderBottomLeftRadius: tokens.radius.card * 2, borderBottomRightRadius: tokens.radius.card * 2, paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: tokens.size.touch },
  brand: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  brandName: { fontFamily: tokens.font.display, fontSize: tokens.type.heading },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  part: { gap: tokens.space.md },
  plans: { gap: tokens.space.sm },
  terms: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.bold },
  fine: { fontSize: tokens.type.label },
  dock: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, gap: tokens.space.sm, borderTopWidth: tokens.border.hairline },
  line: { fontSize: tokens.type.label, textAlign: 'center' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: tokens.space.lg },
  link: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold, textDecorationLine: 'underline', paddingVertical: tokens.space.sm },
  dim: { opacity: tokens.opacity.dim },
});
