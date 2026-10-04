import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { CoachEntry } from '@/components/CoachEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { PhotoCard } from '@/photos/PhotoCard';
import { StrengthSection } from '@/progress/StrengthSection';
import { ProjectionEntry } from '@/projection/ProjectionEntry';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import type { LocalRecord } from '@/sync/store';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Loaded, load, localDay } from '@/today/today';
import { sessionsOf } from '@/train/history';
import { type Move, type TrainData, historyFrom, movesOf } from '@/train/trainData';

type Schemas = components['schemas'];
type Read = {
  data: TrainData;
  own: Move[];
  history: Loaded<Schemas['Workout'][]>;
  records: LocalRecord[];
  from: string;
  today: string;
  /** The week of the first eight (K-513), for the first photo's week (K-614). */
  firstWeeks: Loaded<Schemas['FirstWeeks']>;
};

/** The flow's week as the photo window reads it: over once the server has none (404); unknown without consent or offline. */
function flowWeek(read: Loaded<Schemas['FirstWeeks']>): number | 'over' | null {
  if (read.state === 'ready') return read.value.week;
  return read.state === 'none' ? 'over' : null;
}

/**
 * Progress (prototype section 4): the evidence beside the scale. Strength first (K-604): a compound lift's estimated 1RM
 * week by week, read from the same history as a move's records (ADR-033: the server's list kept on the phone, joined with
 * what is not sent yet); then progress photos — on this phone only, the window for the next one (K-614); then the way to
 * the shape projection (K-606).
 */
export default function ProgressScreen() {
  const { api, training, workoutRecords, report } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const [read, setRead] = useState<Read | null>(null);

  // Read whenever the tab comes into view: a session just finished shows at once.
  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      void Promise.all([
        training.read(api),
        training.own(api),
        training.history(api, now),
        workoutRecords(),
        load(() => api.GET('/v1/first-weeks')),
      ])
        .then(([data, own, history, records, firstWeeks]) =>
          setRead({ data, own, history, records, from: historyFrom(now), today: localDay(now), firstWeeks }),
        )
        .catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
    }, [api, training, workoutRecords, report]),
  );

  const server = read?.history.state === 'ready' ? read.history.value : null;
  const strength =
    read === null ? null : (
      <StrengthSection
        moves={movesOf(read.data, read.own)}
        catalogRead={read.data.exercises.state === 'ready'}
        sessions={sessionsOf(server, read.records, read.from)}
        today={read.today}
        units={units}
      />
    );
  const phoneOnly = read !== null && server === null ? <Text style={[styles.small, { color: color.muted }]}>{t('history.phoneOnly')}</Text> : null;

  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the coach bar sits above it.
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('screens.progress.title')}</ScreenTitle>
        {phoneOnly}
        {strength}
        {read !== null && <PhotoCard today={read.today} flowWeek={flowWeek(read.firstWeeks)} />}
        <ProjectionEntry />
      </ScrollView>
      <View style={styles.coach}>
        <CoachEntry />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, paddingBottom: tokens.space.lg, gap: tokens.space.md },
  small: { fontSize: tokens.type.bodySmall },
  coach: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md },
});
