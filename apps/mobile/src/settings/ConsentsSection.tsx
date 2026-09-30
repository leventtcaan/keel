import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import {
  CONSENT_COPY,
  type ConsentStatus,
  connectAppleHealth,
  grantConsent,
  loadConsents,
  withdrawConsent,
} from '@/consent/consents';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Confirm } from './Confirm';
import { Section } from './Section';
import { useAction } from './useAction';

/** The consents given from the phone. The AI consent joins with its provider (K-511); the server refuses it until then. */
const KINDS = ['HEALTH_DATA', 'APPLE_HEALTH'] as const;
type Kind = (typeof KINDS)[number];

const WORDS = { NoConnection: 'settings.consents.failed', HealthSheetFailed: 'settings.consents.sheetFailed' };

/**
 * Each consent: its state, the text it was given to (View), and Allow or Withdraw (ADR-007: separately, at any time).
 * Withdrawing asks first. Apple Health brings in health data, so it needs the health data consent, and HealthKit in the
 * build. After every change the states are read again from the server, the truth.
 */
export function ConsentsSection() {
  const { api, health } = useAppServices();
  const { color } = useTheme();
  const [states, setStates] = useState<Partial<Record<Kind, ConsentStatus>> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState<Kind | null>(null);
  const [asking, setAsking] = useState<Kind | null>(null);
  const { busy, problem, run } = useAction();

  const load = useCallback(
    () =>
      loadConsents(api).then(
        (found) => {
          setLoadFailed(false);
          setStates(found);
        },
        () => setLoadFailed(true),
      ),
    [api],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const change = async (action: () => Promise<void>) => {
    setAsking(null);
    if (await run(action, WORDS)) await load();
  };

  if (states === null) {
    const retry = loadFailed ? (
      <Button label={t('settings.consents.retry')} variant="ghost" size="sm" onPress={() => void load()} />
    ) : null;
    return (
      <Section title={t('settings.consents.title')}>
        {loadFailed && <Text style={[styles.text, { color: color.text }]}>{t('settings.consents.loadFailed')}</Text>}
        {retry}
      </Section>
    );
  }

  const healthGranted = states.HEALTH_DATA === 'GRANTED';
  const rows = KINDS.map((kind) => {
    const name = t(`settings.consents.${kind}`);
    const granted = states[kind] === 'GRANTED';
    // Apple Health: only with the health data consent, and where HealthKit is in the build.
    const blocked =
      kind === 'APPLE_HEALTH' && !granted
        ? !health.available
          ? t('settings.consents.unavailable')
          : !healthGranted
            ? t('settings.consents.needsHealthConsent')
            : null
        : null;
    const allow = () =>
      change(() => (kind === 'APPLE_HEALTH' ? connectAppleHealth(api, health) : grantConsent(api, kind)));
    const toggle = granted ? (
      <Button
        label={t('settings.consents.withdraw')}
        accessibilityLabel={`${t('settings.consents.withdraw')} ${name}`}
        variant="ghost"
        size="sm"
        onPress={() => setAsking(kind)}
        disabled={busy}
      />
    ) : blocked === null ? (
      <Button
        label={t('settings.consents.allow')}
        accessibilityLabel={`${t('settings.consents.allow')} ${name}`}
        variant="ghost"
        size="sm"
        onPress={() => void allow()}
        disabled={busy}
      />
    ) : null;
    const text = open === kind ? <Text style={[styles.text, { color: color.textSecondary }]}>{t(`${CONSENT_COPY[kind]}.body`)}</Text> : null;
    const confirm =
      asking === kind ? (
        <Confirm
          title={t(`settings.withdrawConfirm.${kind}.title`)}
          body={t(`settings.withdrawConfirm.${kind}.body`)}
          confirmLabel={t('settings.withdrawConfirm.confirm')}
          keepLabel={t('settings.withdrawConfirm.keep')}
          onConfirm={() => void change(() => withdrawConsent(api, kind))}
          onKeep={() => setAsking(null)}
          busy={busy}
        />
      ) : null;
    return (
      <View key={kind} style={[styles.row, { borderTopColor: color.line }]}>
        <View style={styles.head}>
          <View style={styles.name}>
            <Text style={[styles.text, { color: color.text }]}>{name}</Text>
            <Text style={[styles.small, { color: color.muted }]}>
              {granted ? t('settings.consents.allowed') : t('settings.consents.notAllowed')}
            </Text>
          </View>
          <Button
            label={open === kind ? t('settings.consents.hide') : t('settings.consents.view')}
            accessibilityLabel={`${open === kind ? t('settings.consents.hide') : t('settings.consents.view')} ${name}`}
            variant="ghost"
            size="sm"
            onPress={() => setOpen(open === kind ? null : kind)}
          />
          {toggle}
        </View>
        {blocked !== null && <Text style={[styles.small, { color: color.muted }]}>{blocked}</Text>}
        {text}
        {confirm}
      </View>
    );
  });

  return (
    <Section title={t('settings.consents.title')}>
      {rows}
      {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.sm, gap: tokens.space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  name: { flex: 1 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
