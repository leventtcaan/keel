import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { DecisionBlock } from '@/components/DecisionBlock';
import { ProblemText, announce } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';
import { applyCall, callFace, declineCall } from '@/today/call';
import { ChangeRows } from '@/today/ChangeRows';
import { changeRows } from '@/today/callChanges';
import { callReasons } from '@/today/callReasons';
import { SourceMark } from '@/today/SourceMark';
import { useWeek1 } from '@/today/useWeek1';
import { type Loaded, labelKey, load, weekdayDate } from '@/today/today';

type Decision = components['schemas']['Decision'];

/**
 * Two reasons on the call (ADR-077 #3: the data and the rule); the rest stay on record. The call that closes the first
 * week says when food and weight start in the second one's place (prototype #week1).
 */
const REASONS_SHOWN = 2;

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');
// No connection is the user's to fix; a 409 is the call past changing; anything else is ours, worth another try.
const SAID: Record<string, string> = {
  NoConnection: 'callScreen.keepFailed',
  DeclineRefused: 'callScreen.keepRefused',
  DeclineFailed: 'callScreen.keepError',
  ApplyRefused: 'today.call.applyRefused',
  ApplyFailed: 'today.call.applyError',
};

/**
 * The call (K-978, ADR-077 #3, prototype #call), one layer: its label and its one line, where the plan stands ("In this
 * week's plan", or kept off it), two reasons each with its kind of source (U14), the confidence and the next call's date
 * (U3's four parts), Got it, and the one second way the server allows: "Keep last week's plan" (K-963; never on a call
 * resting on the safety net, U13), or "Use this call" back. After a change the call is read again, so the screen shows
 * what changed. `?id=` opens a past call (Progress › Calls) on the same screen, read only. The call rises into place
 * once, as the prototype does, unless Reduce Motion is on.
 */
export default function CallScreen() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const readOnly = id !== undefined;
  const backKey = from === 'progress' ? 'callScreen.backProgress' : 'callScreen.back';
  const { api, report } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const reduce = useReduceMotion();
  const [call, setCall] = useState<Loaded<Decision> | null>(null);
  const [busy, setBusy] = useState(false);
  // Not changed, said for one read of the call: the one it happened on (no connection: nothing new to read), or, for the
  // server's "not now" (409), the read that follows (`next`), so the note speaks of the call as it now is.
  const [failed, setFailed] = useState<{ read: Decision | 'next'; from: Loaded<Decision> | null; key: string } | null>(null);
  if (failed?.read === 'next' && call !== failed.from && call?.state === 'ready') setFailed({ ...failed, read: call.value });
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);
  // The call that closes the first week picks days (K-978, ADR-077 #4); every other call, none.
  const week1 = useWeek1(call?.state === 'ready' && !readOnly ? call.value : null);
  // Changed: the read that follows says the call's new standing aloud (VoiceOver, K-815).
  const toSay = useRef<Loaded<Decision> | null | undefined>(undefined);

  // Read on arrival and again after a change or on asking; an answer landing after the screen left is dropped.
  const [reads, setReads] = useState(0);
  const read = () => setReads((n) => n + 1);
  useEffect(() => {
    let live = true;
    void load(() => (id === undefined ? api.GET('/v1/decisions/current') : api.GET('/v1/decisions/{id}', { params: { path: { id } } }))).then((found) => {
      if (live) setCall(found);
    });
    return () => {
      live = false;
    };
  }, [api, id, reads]);

  const [rise] = useState(() => new Animated.Value(0));
  const shown = call?.state === 'ready';
  useEffect(() => {
    if (!shown) return;
    if (reduce) rise.setValue(1);
    else Animated.timing(rise, { toValue: 1, duration: tokens.motion.revealMs, useNativeDriver: true }).start();
  }, [shown, reduce, rise]);

  useEffect(() => {
    if (toSay.current === undefined || call === toSay.current || call?.state !== 'ready') return;
    toSay.current = undefined;
    const foot = callFace(call.value, readOnly).foot;
    if (foot !== null) announce(t(`callScreen.${foot}`));
  }, [call, readOnly]);

  async function change(decision: Decision, how: 'keep' | 'use') {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      await (how === 'keep' ? declineCall(api, decision.id) : applyCall(api, decision.id));
      setFailed(null);
      toSay.current = call;
      read();
    } catch (error) {
      const name = nameOf(error);
      report({ name });
      const key = how === 'use' && name === 'NoConnection' ? 'today.call.applyFailed' : (SAID[name] ?? 'callScreen.keepError');
      // Past changing (409): read the call again, so no button stays that cannot do anything; then say why.
      if (name === 'DeclineRefused' || name === 'ApplyRefused') {
        setFailed({ read: 'next', from: call, key });
        read();
      } else {
        setFailed({ read: decision, from: call, key });
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const back = (
    <Pressable accessibilityRole="button" accessibilityLabel={t(backKey)} onPress={() => router.back()} hitSlop={tokens.space.md}>
      <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t(backKey)}`}</Text>
    </Pressable>
  );
  const note = (key: string, action?: { label: string; onPress: () => void }) => {
    // Built outside the JSX children (the raw-text guard reads them).
    const button = action === undefined ? null : <Button label={action.label} variant="ghost" size="sm" onPress={action.onPress} />;
    return (
      <View style={styles.note}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>
        {button}
      </View>
    );
  };
  let body = null;
  let dock = null;
  if (call?.state === 'consent') body = note('today.consent.body', { label: t('today.consent.open'), onPress: () => router.push('/settings') });
  else if (call?.state === 'subscription') body = note('callScreen.subscription', { label: t('subscription.seePlans'), onPress: () => router.push('/paywall') });
  else if (call?.state === 'none') body = note('callScreen.none');
  else if (call?.state === 'failed') body = note('callScreen.failed', { label: t('callScreen.retry'), onPress: read });
  else if (call?.state === 'ready') {
    const decision = call.value;
    const face = callFace(decision, readOnly);
    const waits = decision.action.type === 'NO_DECISION_YET';
    // Built outside the JSX children (the raw-text guard reads them).
    const tick = face.foot === 'inPlan' ? <SymbolView name="checkmark" size={tokens.type.body} tintColor={color.accentInk} weight="bold" /> : null;
    const foot =
      face.foot === null ? null : (
        <View style={[styles.foot, { borderTopColor: color.decisionLine }]}>
          {tick}
          <Text style={[styles.small, { color: color.decisionTextSecondary }]}>{t(`callScreen.${face.foot}`)}</Text>
        </View>
      );
    const waitsDays = decision.observationDays;
    const reasons = callReasons(decision, units)
      .slice(0, waitsDays === undefined ? REASONS_SHOWN : REASONS_SHOWN - 1)
      .map((line, i) => (
        <View key={i} style={[styles.reason, { borderTopColor: color.line }]}>
          <SourceMark tag={line.tag} />
          {/* A reason with no sentence (the safety net) says its kind of source in words: there is nothing else to read. */}
          <Text style={[styles.text, styles.sentence, { color: color.text }]}>{line.text ?? t(`today.call.source.${line.tag}`)}</Text>
        </View>
      ));
    const observation =
      waitsDays === undefined ? null : (
        <View style={[styles.waits, { borderTopColor: color.line }]}>
          <SymbolView name="clock" size={tokens.type.body} tintColor={color.muted} />
          <Text style={[styles.text, { color: color.text }]}>{t('callScreen.observation', { days: waitsDays })}</Text>
        </View>
      );
    body = (
      <>
        <Text style={[styles.small, { color: color.muted }]}>{weekdayDate(decision.madeOn)}</Text>
        <Animated.View
          style={{ opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [tokens.motion.revealRise, 0] }) }] }}>
          <DecisionBlock testID="call-block" title={t(labelKey(decision.copyKey))}>
            <Text style={[styles.line, { color: color.decisionTextSecondary }]}>{t(`${decision.copyKey}.title`)}</Text>
            {foot}
          </DecisionBlock>
        </Animated.View>
        <ChangeRows rows={week1?.rows ?? changeRows(decision)} />
        <View>
          {reasons}
          {observation}
        </View>
        <View style={styles.meta}>
          {waits ? null : (
            <Text style={[styles.small, { color: color.textSecondary }]}>{t('callScreen.confidence', { level: t(`callScreen.level.${decision.confidence}`) })}</Text>
          )}
          <Text style={[styles.small, { color: color.textSecondary }]}>{t('callScreen.nextCall', { date: weekdayDate(decision.nextReview) })}</Text>
        </View>
        {failed?.read === decision ? <ProblemText style={[styles.small, { color: color.text }]}>{t(failed.key)}</ProblemText> : null}
        {week1?.note}
      </>
    );
    const second = face.second;
    const secondWay =
      second === null ? null : (
        <Button label={t(second === 'keep' ? 'callScreen.keep' : 'callScreen.use')} variant="ghost" disabled={busy} onPress={() => void change(decision, second)} />
      );
    dock =
      week1?.dock ??
      (readOnly ? null : (
        <View style={styles.dock}>
          <Button label={t('callScreen.gotIt')} onPress={() => router.back()} />
          {secondWay}
        </View>
      ));
  }

  if (week1?.changing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
        {week1.changing}
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        {back}
        {body}
      </ScrollView>
      {dock}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  back: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  note: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  line: { fontSize: tokens.type.body },
  sentence: { flex: 1 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.sm },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space.sm, borderTopWidth: tokens.border.hairline, paddingVertical: tokens.space.sm },
  waits: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderTopWidth: tokens.border.hairline, paddingVertical: tokens.space.sm },
  meta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: tokens.space.sm },
  dock: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
});
