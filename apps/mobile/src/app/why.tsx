import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DecisionBlock } from '@/components/DecisionBlock';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { basisRows } from '@/today/basis';
import { variantOf } from '@/today/call';
import { labelKey, load, reasonLines, weekdayDate, type Loaded } from '@/today/today';

type Decision = components['schemas']['Decision'];
type Basis = components['schemas']['DecisionBasis'];
type Read = { decision: Loaded<Decision>; basis: Loaded<Basis> };

/**
 * "Why this call" (K-502, prototype 3.5; Ö-25 transparency, Ö-26 the kind of source): the call, the data it read
 * (K-519: from its own snapshot, nothing estimated here), the rules it applied each with its kind of source (U14), its
 * confidence and the next review — and that the call comes from the rules, not the coach (U1). A safety call is its
 * general change and nothing of why (ADR-028 #24); a research file stays on the server.
 */
export default function WhyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAppServices();
  const { color } = useTheme();
  const [read, setRead] = useState<Read | null>(null);
  const [reads, setReads] = useState(0);

  useEffect(() => {
    let live = true;
    const path = { params: { path: { id } } };
    void Promise.all([load(() => api.GET('/v1/decisions/{id}', path)), load(() => api.GET('/v1/decisions/{id}/basis', path))]).then(
      ([decision, basis]) => {
        if (live) setRead({ decision, basis });
      },
    );
    return () => {
      live = false;
    };
  }, [api, id, reads]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('why.back')} onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t('why.back')}`}</Text>
        </Pressable>
        <ScreenTitle>{t('why.title')}</ScreenTitle>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Body read={read} onRetry={() => setReads((n) => n + 1)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Body({ read, onRetry }: { read: Read | null; onRetry: () => void }) {
  const { color } = useTheme();
  const units = useUnits();
  if (read === null) return null;
  const line = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  if (read.decision.state === 'consent' || read.basis.state === 'consent') {
    return (
      <View style={styles.note}>
        {line('today.consent.body')}
        <Button label={t('today.consent.open')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
      </View>
    );
  }
  if (read.decision.state !== 'ready' || read.basis.state !== 'ready') {
    return (
      <View style={styles.note}>
        {line('why.failed')}
        <Button label={t('why.retry')} variant="ghost" size="sm" onPress={onRetry} />
      </View>
    );
  }
  const decision = read.decision.value;
  const basis = read.basis.value;
  const titleKey = `${decision.copyKey}.title`;
  const rows = basisRows(basis, units);
  // Waiting has no confidence to give (as on Today's card).
  const confident = variantOf(decision) !== 'wait';
  const small = [styles.small, { color: color.textSecondary }];
  return (
    <>
      <DecisionBlock eyebrow={t(labelKey(decision.copyKey))} title={t(titleKey)}>
        <Text style={[styles.small, { color: color.decisionMuted }]}>
          {t('why.made', { date: weekdayDate(decision.madeOn), phase: t(`why.phase.${basis.phase}`) })}
        </Text>
      </DecisionBlock>
      <Card>
        <Text style={[styles.label, { color: color.muted }]}>{t('why.data')}</Text>
        {rows.length === 0
          ? line('why.noData')
          : rows.map((row) => (
              <View key={row.label} style={[styles.row, { borderTopColor: color.line }]}>
                <Text style={[styles.text, { color: color.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.value, { color: color.text }]}>{row.value}</Text>
              </View>
            ))}
      </Card>
      <Card>
        <Text style={[styles.label, { color: color.muted }]}>{t('why.rules')}</Text>
        {reasonLines(decision).map((reason, i) => (
          <View key={i} style={[styles.rule, { borderTopColor: color.line }]}>
            {reason.sentenceKey !== null ? <Text style={[styles.text, { color: color.text }]}>{t(reason.sentenceKey)}</Text> : null}
            <Text style={small}>{t(`today.call.source.${reason.tag}`)}</Text>
          </View>
        ))}
      </Card>
      {/* What else the data says (K-603), beside the call and never changing it; a safety call says nothing else. */}
      {decision.safety !== true && basis.signals !== undefined && basis.signals.length > 0 ? (
        <Card>
          <Text style={[styles.label, { color: color.muted }]}>{t('why.signals')}</Text>
          {basis.signals.map((signal) => (
            <View key={signal.rule} style={[styles.rule, { borderTopColor: color.line }]}>
              <Text style={[styles.text, { color: color.text }]}>{t(`decision.rule.${signal.rule}`)}</Text>
              <Text style={small}>{t(`today.call.source.${signal.source.tag}`)}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      <Card>
        {confident ? <Text style={[styles.text, { color: color.text }]}>{t(`today.call.confidence.${decision.confidence}`)}</Text> : null}
        <Text style={small}>{t('today.call.nextReview', { date: weekdayDate(decision.nextReview) })}</Text>
      </Card>
      {decision.safety !== true && <WhatIfButton id={decision.id} />}
      <Text style={small}>{t('why.boundary')}</Text>
      <Button label={t('ledger.open')} variant="ghost" size="sm" onPress={() => router.push('/ledger')} />
    </>
  );
}

/** The same rules on example weeks (K-610); not from a safety call, which says nothing of why (ADR-028 #24). */
function WhatIfButton({ id }: { id: string }) {
  return <Button label={t('whatIf.open')} variant="ghost" size="sm" onPress={() => router.push({ pathname: '/what-if', params: { id } })} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  head: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.sm, gap: tokens.space.sm },
  back: { fontSize: tokens.type.body },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  note: { gap: tokens.space.sm },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  value: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space.sm, paddingTop: tokens.space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  rule: { gap: tokens.space.xs, paddingTop: tokens.space.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
