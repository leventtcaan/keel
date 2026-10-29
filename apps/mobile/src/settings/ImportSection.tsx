import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { ConsentsSection } from './ConsentsSection';
import { Section } from './Section';
import { useAction } from './useAction';

/** What the last import said: how many were found, none new, or the Apple Health consent it needs. */
type Outcome = { found: number } | 'consent' | null;

/**
 * Import weigh-ins (K-616, ADR-018 §3, ADR-053): Apple Health's older weigh-ins, read once when the user asks, never on its
 * own. They join the history and never change a call; one line says so before the tap. Where HealthKit is not in the build
 * (Expo Go), it says so. Without the Apple Health consent the page does not stop at a sentence: the consent is right under it,
 * a button away (K-1062). The workouts file has its own screen (Settings › Training › Import workouts).
 */
export function ImportSection({ bare = false }: { bare?: boolean } = {}) {
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
  const action = health.available ? (
    <Button label={t('settings.import.import')} accessibilityLabel={t('settings.import.importLabel', { what })} size="touch" disabled={busy} onPress={importWeighIns} />
  ) : (
    <Text style={[styles.note, { color: color.muted }]}>{t('settings.import.unavailable')}</Text>
  );
  const result =
    outcome === 'consent' ? (
      <>
        <Text style={[styles.note, { color: color.text }]}>{t('settings.import.needsConsent')}</Text>
        <ConsentsSection only="APPLE_HEALTH" bare onChanged={() => setOutcome(null)} />
      </>
    ) : outcome !== null ? (
      <Text style={[styles.note, { color: color.text }]}>{said(outcome)}</Text>
    ) : null;
  return (
    <Section title={bare ? undefined : t('settings.import.title')}>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.import.note')}</Text>
      {action}
      {result}
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </Section>
  );
}

function said(outcome: { found: number }): string {
  if (outcome.found === 0) return t('settings.import.noneNew');
  return outcome.found === 1 ? t('settings.import.foundOne') : t('settings.import.found', { count: outcome.found });
}

const styles = StyleSheet.create({
  note: { fontSize: tokens.type.bodySmall },
});
