import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
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
 * Bring in your history (K-616, K-609, ADR-018 §3, ADR-053): Apple Health's older weigh-ins, read once when the user
 * asks — never on its own — and workouts from a Strong or Hevy export, on their own screen. What is brought in is seen
 * in the history and never changes a call; the note says so before the tap. Where HealthKit is not in the build (Expo
 * Go), the weigh-ins say so; a file needs no HealthKit.
 */
export function ImportSection() {
  const { health, importHealthWeights } = useAppServices();
  const { color } = useTheme();
  const { busy, problem, run } = useAction();
  const [outcome, setOutcome] = useState<Outcome>(null);

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
  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const weighIns = health.available ? (
    <Row label={what} hint={t('settings.import.weighInsHint')}>
      <Button label={t('settings.import.import')} accessibilityLabel={t('settings.import.importLabel', { what })} size="sm" disabled={busy} onPress={importWeighIns} />
    </Row>
  ) : (
    <Text style={[styles.note, { color: color.muted }]}>{t('settings.import.unavailable')}</Text>
  );
  return (
    <Section title={t('settings.import.title')}>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.import.note')}</Text>
      {weighIns}
      {outcome !== null && <Said text={said(outcome)} />}
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
      {/* A file needs no HealthKit: workouts can be brought in in any build (K-609). */}
      <Row label={t('settings.import.workouts')} hint={t('settings.import.workoutsHint')}>
        <Button
          label={t('settings.import.open')}
          accessibilityLabel={t('settings.import.workoutsLabel')}
          size="sm"
          onPress={() => router.push('/import')}
        />
      </Row>
    </Section>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.words}>
        <Text style={[styles.label, { color: color.text }]}>{label}</Text>
        <Text style={[styles.note, { color: color.muted }]}>{hint}</Text>
      </View>
      {children}
    </View>
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
