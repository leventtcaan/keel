import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProblemText, announce, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { cardioDraft } from '@/train/cardio';
import { type TodaysCardio, todaysCardio } from '@/train/cardioToday';
import { MinutesStepper } from '@/train/MinutesStepper';
import { workoutParams } from '@/train/params';

/**
 * "+ > Cardio" (K-980, ADR-074 #6, Ek 2): the minutes of a cardio session, nothing else — no pace, no calories (a watch's
 * energy comes from Apple Health, never typed). The minutes start at the program's own. A day that has a record already is
 * not asked again: the record is shown (K-1019: the server's `loggedToday`, and what this phone holds that the server may
 * not have yet). A typed record has Undo — deleted on the server by its id, and the same clientId's waiting send dropped so
 * it cannot write the row again (`takeBack`); Apple Health's record is the watch's and stays. Training, not health data:
 * no consent is asked. Saved on the phone first and sent when it can be (K-304).
 */
export default function CardioScreen() {
  const { api, training, workoutRecords, queue, takeBack, report } = useAppServices();
  const { color } = useTheme();
  const { day, data, reload } = useReadOnFocus(
    useCallback(async () => {
      const [read, records] = await Promise.all([training.read(api), workoutRecords().catch(() => [])]);
      return { program: read.program.state === 'ready' ? read.program.value : null, kept: read.kept, records };
    }, [api, training, workoutRecords]),
  );
  const [typedMinutes, setMinutes] = useState<number | null>(null);
  const [problem, setProblem, occurrence] = useProblem();
  const [busy, setBusy] = useState(false);
  // One id until it is kept: a try that said it failed may have been kept all the same, and the same clientId is saved once.
  const attempt = useRef<string | null>(null);
  const working = useRef(false); // two taps in the same moment must not log twice

  const today: TodaysCardio | null = data === null ? null : todaysCardio({ program: data.program, kept: data.kept, records: data.records, day });
  const minutes = typedMinutes ?? (data?.program == null ? workoutParams.cardioMinutesStart : cardioDraft(data.program).minutes);

  const log = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setProblem(null);
    try {
      attempt.current ??= newClientId();
      await queue.record({ kind: 'cardio', body: { clientId: attempt.current, day, minutes, source: 'MANUAL' } });
      attempt.current = null;
      announce(t('workout.cardio.loggedSaid', { minutes }));
      reload();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('workout.cardio.failed'));
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const undo = async () => {
    if (today === null || today.kind !== 'typed' || working.current) return;
    working.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const result = await takeBack(
        today.clientId,
        async (id) => (await api.DELETE('/v1/cardio-sessions/{id}', { params: { path: { id } } })).response.status,
        today.serverId,
      );
      if (result === 'taken') {
        setMinutes(null);
        announce(t('workout.cardio.undoneSaid'));
        reload();
      } else {
        setProblem(t(result === 'conflict' ? 'workout.cardio.undoLate' : 'cardioLog.undoFailed'));
      }
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('cardioLog.undoFailed'));
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const problemLine =
    problem !== null ? (
      <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
        {problem}
      </ProblemText>
    ) : null;
  let body = null;
  if (today !== null && today.kind === 'none') {
    body = (
      <View style={styles.part}>
        <MinutesStepper minutes={minutes} onChange={setMinutes} />
        {problemLine}
        <Button label={t('cardioLog.log')} onPress={() => void log()} disabled={busy} />
      </View>
    );
  } else if (today !== null) {
    const fromHealth = today.kind === 'health' ? today : null;
    const source = fromHealth === null ? null : <Text style={[styles.small, { color: color.textSecondary }]}>{t('cardioLog.fromHealth')}</Text>;
    const energy =
      fromHealth === null || fromHealth.activeEnergyKcal === undefined ? null : (
        <Text style={[styles.small, { color: color.textSecondary }]}>{t('cardioLog.watch', { kcal: fromHealth.activeEnergyKcal })}</Text>
      );
    // Only the typed one can be taken back; Apple Health's is the watch's.
    const undoButton =
      today.kind === 'typed' ? (
        <Button label={t('cardioLog.undo')} variant="ghost" accessibilityLabel={t('workout.cardio.undoLabel')} onPress={() => void undo()} disabled={busy} />
      ) : null;
    body = (
      <View style={styles.part}>
        <View style={[styles.record, { backgroundColor: color.surface }]}>
          <SymbolView name="checkmark.circle.fill" size={tokens.type.heading} tintColor={color.accent} />
          <View style={styles.grow}>
            <Text style={[styles.strong, { color: color.text }]}>{t('workout.cardio.loggedSaid', { minutes: today.minutes })}</Text>
            {source}
            {energy}
          </View>
        </View>
        {problemLine}
        {undoButton}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('cardioLog.title')}</ScreenTitle>
        {body}
        <Button label={t('cardioLog.done')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.md },
  record: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, borderRadius: tokens.radius.card, padding: tokens.space.md },
  grow: { flex: 1, gap: tokens.space.xs },
  text: { fontSize: tokens.type.body },
  strong: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
});
