import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DecisionBlock } from '@/components/DecisionBlock';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { useAppServices } from '@/services/ServicesProvider';

import { applyCall, appliedKey, variantOf } from './call';
import { labelKey, reasonLines } from './today';

type Decision = components['schemas']['Decision'];

// "Mon, Oct 5": the review day as a date only, in English like every word of the app.
const REVIEW_DAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');
// No connection is the user's to fix; a call that is past (409) is said so; anything else is ours, worth another try.
const SAID: Record<string, string> = { NoConnection: 'today.call.applyFailed', ApplyRefused: 'today.call.applyRefused' };

/**
 * This week's call (K-212), in its own words: label, title and body from its copy key, whatever the action — the "not
 * yet" variants (U3), the short cut (K-227), a safety call as its general change of phase (ADR-028 #24: the words of
 * the copy key, nothing more). Its face (K-502): a hold says nothing needs doing; a wait gives no confidence (its label
 * says "Wait"); a change is one thing at a time, applied from today with one tap — then Today reads again. The next review
 * is always in sight; "Why this call" opens the reasons, each with its kind of source (U14), and leads on to the
 * data behind it (K-502, its own page).
 */
export function CallCard({ decision, onChanged }: { decision: Decision | null; onChanged: () => void }) {
  const { api, report } = useAppServices();
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Not applied, said for the read it happened on: Today read again is a new try (as the coach's question, K-520).
  const [failed, setFailed] = useState<{ read: Decision; key: string } | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);
  if (decision === null) {
    return (
      <Card>
        <Text style={[styles.label, { color: color.muted }]}>{t('today.call.eyebrow')}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('today.call.none')}</Text>
      </Card>
    );
  }
  const titleKey = `${decision.copyKey}.title`;
  const reasons = open ? (
    <View style={styles.reasons}>
      {reasonLines(decision).map((line, i) => (
        <View key={i} style={styles.reason}>
          {line.sentenceKey !== null && <Text style={[styles.text, { color: color.decisionText }]}>{t(line.sentenceKey)}</Text>}
          <Text style={[styles.small, { color: color.decisionMuted }]}>{t(`today.call.source.${line.tag}`)}</Text>
        </View>
      ))}
      <Button label={t('today.call.data')} variant="ghost" size="sm" onPress={() => router.push({ pathname: '/why', params: { id: decision.id } })} />
    </View>
  ) : null;
  const variant = variantOf(decision);
  const holds = variant === 'hold';
  const waits = variant === 'wait';
  const shown = decision;

  async function apply() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      await applyCall(api, shown.id);
      setFailed(null);
      onChanged();
    } catch (error) {
      const name = nameOf(error);
      report({ name });
      setFailed({ read: shown, key: SAID[name] ?? 'today.call.applyError' });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const state = decision.application.state;
  const change =
    variant !== 'change' ? null : state === 'PENDING' ? (
      <View style={styles.reasons}>
        <Text style={[styles.text, { color: color.decisionTextSecondary }]}>{t('today.call.oneThing')}</Text>
        <Button label={t('today.call.apply')} size="sm" onPress={() => void apply()} disabled={busy} />
        {failed?.read === decision ? <Text style={[styles.small, { color: color.decisionMuted }]}>{t(failed.key)}</Text> : null}
      </View>
    ) : (
      <Text style={[styles.text, { color: color.decisionTextSecondary }]}>{t(state === 'UNDONE' ? 'today.call.undone' : appliedKey(decision.copyKey))}</Text>
    );
  return (
    <DecisionBlock testID="call" eyebrow={t(labelKey(decision.copyKey))} title={t(titleKey)}>
      <View style={styles.row}>
        <Text style={[styles.small, { color: color.decisionMuted }]}>{t('today.call.eyebrow')}</Text>
        {/* Waiting has no confidence to give: its label says "Wait" already. */}
        {waits ? null : (
          <Text style={[styles.small, { color: color.decisionMuted }]}>{t(`today.call.confidence.${decision.confidence}`)}</Text>
        )}
      </View>
      <Text style={[styles.text, { color: color.decisionTextSecondary }]}>{t(`${decision.copyKey}.body`)}</Text>
      {holds ? <Text style={[styles.text, { color: color.decisionTextSecondary }]}>{t('today.call.hold')}</Text> : null}
      {waits ? <Text style={[styles.text, { color: color.decisionTextSecondary }]}>{t('today.call.waitNote')}</Text> : null}
      {change}
      <Text style={[styles.small, { color: color.decisionMuted }]}>
        {t('today.call.nextReview', { date: REVIEW_DAY.format(new Date(`${decision.nextReview}T00:00:00Z`)) })}
      </Text>
      <Button label={open ? t('today.call.hide') : t('today.call.why')} variant="ghost" size="sm" onPress={() => setOpen(!open)} />
      {reasons}
    </DecisionBlock>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
  },
  reasons: { gap: tokens.space.sm },
  reason: { gap: tokens.space.xs },
});
