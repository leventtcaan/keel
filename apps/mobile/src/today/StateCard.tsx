import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type Loaded, weekdayDate } from './today';

type Props = { state: Loaded<components['schemas']['DeclaredState']> | undefined; onChanged: () => void };

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

/** Which state a read showed: a note said for one is not shown under another. */
function identityOf(state: Props['state']): string | null {
  if (state?.state === 'ready') return `${state.value.kind}@${state.value.since}`;
  return state?.state === 'none' ? 'none' : null;
}

/**
 * State mode on Today (K-518, ADR-038): a state in force says the week is paused, since when, and offers "I'm back";
 * none, one quiet way to say life got in the way (U9: declared, never asked). Back, a welcome with nothing to make up
 * (U7, I1 C6) — kept while Today reads no state, gone once another one is read. A state that could not be read shows
 * nothing: it is a way in, not a part of the week, and the next read of Today tries again.
 */
export function StateCard({ state, onChanged }: Props) {
  const { state: declared, report } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  // A note and the state it belongs to: after "I'm back", none; after a failure, the state still in force.
  const [said, setSaid] = useState<{ identity: string | null; key: string } | null>(null);
  const identity = identityOf(state);

  async function back() {
    setBusy(true);
    try {
      await declared.back();
      setSaid({ identity: 'none', key: 'today.state.welcomeBack' });
      onChanged();
    } catch (error) {
      report({ name: nameOf(error) });
      setSaid({ identity, key: 'today.state.failed' });
    } finally {
      setBusy(false);
    }
  }

  const note =
    said === null || said.identity !== identity ? null : <ProblemText style={[styles.text, { color: color.textSecondary }]}>{t(said.key)}</ProblemText>;
  if (state?.state === 'ready') {
    const kind = t(`state.kind.${state.value.kind.toLowerCase()}.name`);
    return (
      <Card>
        <Text style={[styles.text, { color: color.text }]}>{t('today.state.paused', { state: kind, since: weekdayDate(state.value.since) })}</Text>
        <Button label={t('today.state.back')} variant="ghost" size="sm" onPress={() => void back()} disabled={busy} />
        {note}
      </Card>
    );
  }
  if (state?.state !== 'none') return null;
  return (
    <View style={styles.entry}>
      {note}
      <Button label={t('today.state.declare')} variant="ghost" size="sm" onPress={() => router.push('/state')} />
    </View>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: tokens.type.body },
  entry: { gap: tokens.space.sm },
});
