import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import type { LocalRecord } from '@/sync/store';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Loaded, localDay } from '@/today/today';
import { type PersonalRecord, historyOf, recordsOf, sessionsOf } from '@/train/history';
import { exerciseName, shortDate } from '@/train/program';
import { setText } from '@/train/session';
import type { TrainData } from '@/train/trainData';
import { type UnitSystem, formatLoad, loadValue } from '@/units/units';

type Schemas = components['schemas'];

/** A session's day on the phone's calendar, as "Sep 28". */
const dayOf = (startedAt: string) => shortDate(localDay(new Date(startedAt)));

function recordText(record: PersonalRecord, move: Schemas['Exercise'], units: UnitSystem): string {
  switch (record.kind) {
    case 'heaviest':
      return t('history.heaviest', { set: setText(record, move, units) });
    case 'estimatedMax':
      return t('history.estimatedMax', { load: formatLoad(record.kg, units) });
    case 'repsAt':
      return t('history.repsAt', { load: formatLoad(record.loadKg, units), reps: record.reps });
    case 'mostReps':
      return t('history.mostReps', { reps: record.reps });
  }
}

/**
 * A move's history (K-415, ADR-033): its records, then every session that has it, newest first, each set as it was done.
 * The server's list (kept on the phone) joined with what the phone has not sent; without either, the phone's own.
 */
export default function ExerciseHistoryScreen() {
  const { api, training, workoutRecords, report } = useAppServices();
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const units = useUnits();
  const { color } = useTheme();
  const [read, setRead] = useState<{ data: TrainData; history: Loaded<Schemas['Workout'][]>; records: LocalRecord[] } | null>(null);

  useEffect(() => {
    void Promise.all([training.read(api), training.history(api, new Date()), workoutRecords()])
      .then(([data, history, records]) => setRead({ data, history, records }))
      .catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
  }, [api, training, workoutRecords, report]);

  const move = read?.data.exercises.state === 'ready' ? read.data.exercises.value.find((m) => m.id === exercise) : undefined;
  const server = read?.history.state === 'ready' ? read.history.value : null;
  const sessions = read === null ? [] : historyOf(sessionsOf(server, read.records), exercise);
  const records = move === undefined ? [] : recordsOf(move, sessions, (kg) => loadValue(kg, units));

  const phoneOnly = read !== null && server === null ? <Text style={[styles.small, { color: color.muted }]}>{t('history.phoneOnly')}</Text> : null;
  const empty =
    read !== null && sessions.length === 0 ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('history.empty')}</Text> : null;
  const recordCard =
    move === undefined || records.length === 0 ? null : (
      <Card>
        <Text style={[styles.heading, { color: color.text }]}>{t('history.records')}</Text>
        {records.map((record) => (
          <View key={`${record.kind}-${'loadKg' in record ? record.loadKg : ''}`} style={styles.row}>
            <Text style={[styles.text, styles.grow, { color: color.text }]}>{recordText(record, move, units)}</Text>
            <Text style={[styles.small, { color: color.muted }]}>{dayOf(record.on)}</Text>
          </View>
        ))}
      </Card>
    );
  const sessionCards =
    move === undefined
      ? null
      : sessions.map((session) => (
          <Card key={session.clientId}>
            <Text style={[styles.label, { color: color.text }]}>{dayOf(session.startedAt)}</Text>
            {session.sets.map((s) => {
              const done = setText(s, move, units);
              const line =
                s.setType === 'WARM_UP'
                  ? t('history.warmUp', { set: done })
                  : s.rir === undefined
                    ? done
                    : t('summary.setRir', { set: done, rir: s.rir });
              return (
                <Text key={s.clientId} style={[styles.small, { color: s.setType === 'WARM_UP' ? color.muted : color.textSecondary }]}>
                  {line}
                </Text>
              );
            })}
          </Card>
        ));

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{exerciseName(exercise)}</ScreenTitle>
        {phoneOnly}
        {recordCard}
        {sessions.length > 0 && <Text style={[styles.heading, { color: color.text }]}>{t('history.sessions')}</Text>}
        {sessionCards}
        {empty}
        <Button label={t('history.done')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space.sm },
  grow: { flex: 1 },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
