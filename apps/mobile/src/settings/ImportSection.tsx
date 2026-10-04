import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Section } from './Section';
import { useAction } from './useAction';

/** What the last import said: how many were found, none new, or the consents it needs. */
type Outcome = { found: number } | 'consent' | null;

/**
 * Bring in your history (K-616, ADR-018 §3, ADR-053): Apple Health's older weigh-ins, read once when the user asks —
 * never on its own. What is brought in shows in the trend and never changes a call; the note says so before the tap.
 * Where HealthKit is not in the build (Expo Go), it says so.
 */
export function ImportSection() {
  const { health, importHealthWeights } = useAppServices();
  const { color } = useTheme();
  const { busy, problem, run } = useAction();
  const [outcome, setOutcome] = useState<Outcome>(null);

  if (!health.available) {
    return (
      <Section title={t('settings.import.title')}>
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.import.unavailable')}</Text>
      </Section>
    );
  }
  const importWeighIns = () =>
    void run(
      async () => {
        setOutcome(null);
        const result = await importHealthWeights();
        setOutcome(result === 'consent' ? 'consent' : { found: result });
      },
      {},
      'settings.import.failed',
    );
  const what = t('settings.import.weighIns');
  return (
    <Section title={t('settings.import.title')}>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.import.note')}</Text>
      <View style={styles.row}>
        <View style={styles.words}>
          <Text style={[styles.label, { color: color.text }]}>{what}</Text>
          <Text style={[styles.note, { color: color.muted }]}>{t('settings.import.weighInsHint')}</Text>
        </View>
        <Button
          label={t('settings.import.import')}
          accessibilityLabel={t('settings.import.importLabel', { what })}
          size="sm"
          disabled={busy}
          onPress={importWeighIns}
        />
      </View>
      {outcome !== null && <Said text={said(outcome)} />}
      {problem !== null && <Said text={problem} />}
    </Section>
  );
}

function said(outcome: Exclude<Outcome, null>): string {
  if (outcome === 'consent') return t('settings.import.needsConsent');
  if (outcome.found === 0) return t('settings.import.noneNew');
  return outcome.found === 1 ? t('settings.import.foundOne') : t('settings.import.found', { count: outcome.found });
}

function Said({ text }: { text: string }) {
  const { color } = useTheme();
  return <Text style={[styles.note, { color: color.text }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.md },
  words: { flex: 1, gap: tokens.space.xs },
  label: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
