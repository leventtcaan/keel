import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import type { LocalRecord } from '@/sync/store';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { SupersetLine } from '@/train/SupersetLink';
import { exerciseName } from '@/train/program';
import { supersetPartners } from '@/train/superset';
import { setText } from '@/train/session';
import { type Summary, summarize } from '@/train/summary';
import { type Move, type TrainData, movesOf } from '@/train/trainData';
import { lastTime, setsOf, workoutOf } from '@/train/workout';

/**
 * After the workout (K-406, prototype 2.6): effort, not volume. How many moves reached the target effort; each move's
 * sets and what improved since last time; a note where the effort was short of the target. Built from the phone's
 * records, so it shows offline, right after the finish.
 */
export default function WorkoutSummaryScreen() {
  const { api, training, workoutRecords, report } = useAppServices();
  const { workout } = useLocalSearchParams<{ workout: string }>();
  const units = useUnits();
  const { color } = useTheme();
  const [read, setRead] = useState<{ data: TrainData; own: Move[]; records: LocalRecord[] } | null>(null);

  useEffect(() => {
    void Promise.all([training.read(api), training.own(api), workoutRecords()])
      .then(([data, own, records]) => setRead({ data, own, records }))
      .catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
  }, [api, training, workoutRecords, report]);

  let summary: Summary | null = null;
  let partners = new Map<string, string[]>();
  const moves = movesOf(read?.data ?? null, read?.own ?? []);
  if (read !== null) {
    const program = read.data.program.state === 'ready' ? read.data.program.value : null;
    const dayId = workoutOf(read.records, workout)?.programDayId;
    const planned = program?.days.find((d) => d.id === dayId)?.exercises ?? [];
    partners = supersetPartners(setsOf(read.records, workout));
    summary = summarize(setsOf(read.records, workout), (id) => lastTime(read.records, id, workout), moves, planned, units);
  }

  const header =
    summary === null ? null : (
      <View style={[styles.header, { backgroundColor: color.decisionBackground }]}>
        <Text style={[styles.headline, { color: color.decisionText }]}>
          {summary.judged === 0
            ? t('summary.noneJudged')
            : summary.judged === 1
              ? t('summary.reachedOne', { reached: summary.reached })
              : t('summary.reached', { reached: summary.reached, judged: summary.judged })}
        </Text>
      </View>
    );
  const cards = summary?.moves.map((done) => {
    const move = moves.get(done.exerciseId);
    return (
      <Card key={done.exerciseId}>
        <Text style={[styles.heading, { color: color.text }]}>{exerciseName(done.exerciseId, moves)}</Text>
        <SupersetLine partners={partners.get(done.exerciseId)} moves={moves} />
        {done.line !== null && <Text style={[styles.text, { color: color.accent }]}>{done.line}</Text>}
        {move !== undefined &&
          done.sets.map((s) => (
            <Text key={s.clientId} style={[styles.small, { color: color.textSecondary }]}>
              {s.rir === undefined ? setText(s, move, units) : t('summary.setRir', { set: setText(s, move, units), rir: s.rir })}
            </Text>
          ))}
        {done.note !== null && <Text style={[styles.small, { color: color.muted }]}>{done.note}</Text>}
      </Card>
    );
  });

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('summary.title')}</ScreenTitle>
        {header}
        {cards}
        <Button label={t('summary.done')} onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  header: { borderRadius: tokens.radius.card, padding: tokens.space.md },
  headline: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
