import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { type PersonalRecord, type Session, historyOf, joinRecords, recordsOf, serverRecords, sessionsOf, unsent } from '@/train/history';
import { exerciseName, shortDate } from '@/train/program';
import { setLeftText, setText } from '@/train/session';
import { type Move, type TrainData, movesOf } from '@/train/trainData';
import { type UnitSystem, formatLoad, loadValue } from '@/units/units';

type Schemas = components['schemas'];
type MoveHistory = Schemas['MoveHistory'];

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
 * A move's history (K-415, ADR-033; K-1266): its records of all time, then every session that has it, newest first, each set as it
 * was done. The server's pages (the first kept on the phone), an older page as the list nears its end, joined with what the phone has
 * not sent; without either, the phone's own.
 */
export default function ExerciseHistoryScreen() {
  const { api, training, workoutRecords, report } = useAppServices();
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const units = useUnits();
  const { color } = useTheme();
  const [read, setRead] = useState<{ data: TrainData; own: Move[]; first: Loaded<MoveHistory>; records: LocalRecord[] } | null>(null);
  // The older pages read since the first, and the cursor of the next one (none: the list is whole).
  const [older, setOlder] = useState<{ sessions: Schemas['Workout'][]; next: string | undefined }>({ sessions: [], next: undefined });
  // The older page on its way (one at a time), the cursor it follows, and whether the last one failed: asked again only once the list
  // leaves its end and comes back. `era` ties a request to the read that began it: a refocus or another move drops what comes late.
  const reading = useRef(false);
  const cursor = useRef<string | undefined>(undefined);
  const failed = useRef(false);
  const era = useRef(0);

  // Read whenever the screen comes into view: coming back from editing a session (K-416) shows the edit at once.
  useFocusEffect(
    useCallback(() => {
      const mine = ++era.current;
      [reading.current, cursor.current, failed.current] = [false, undefined, false];
      setOlder({ sessions: [], next: undefined });
      void Promise.all([training.read(api), training.own(api), training.moveHistory(api, exercise), workoutRecords()])
        .then(([data, own, history, records]) => {
          if (mine !== era.current) return;
          const next = history.read.state === 'ready' ? history.read.value.next : undefined;
          cursor.current = next;
          setRead({ data, own, first: history.read, records });
          setOlder({ sessions: [], next });
        })
        .catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
    }, [api, training, exercise, workoutRecords, report]),
  );

  const more = useCallback(() => {
    const before = cursor.current;
    if (before === undefined || reading.current || failed.current) return;
    const mine = era.current;
    reading.current = true;
    void training
      .moveHistory(api, exercise, before)
      .then(({ read: page }) => {
        if (mine !== era.current) return;
        if (page.state !== 'ready') {
          failed.current = true;
          return;
        }
        cursor.current = page.value.next;
        setOlder((was) => ({ sessions: [...was.sessions, ...page.value.sessions], next: page.value.next }));
      })
      .catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }))
      .finally(() => {
        if (mine === era.current) reading.current = false;
      });
  }, [api, training, exercise, report]);

  const moves = movesOf(read?.data ?? null, read?.own ?? []);
  const move = read === null ? undefined : moves.get(exercise);
  const page = read?.first.state === 'ready' ? read.first.value : null;
  const server = page === null ? null : [...page.sessions, ...older.sessions];
  // While older pages remain, the phone's own from before the last session shown wait for their page: each workout once, in its place.
  const oldest = server?.at(-1);
  const from = oldest !== undefined && older.next !== undefined ? localDay(new Date(oldest.startedAt)) : '';
  // Without the catalog the move's sets cannot be written (its load model): no history rather than an empty one.
  const sessions = read === null || move === undefined ? [] : historyOf(sessionsOf(server, read.records, from), exercise);
  const shown = (kg: number) => loadValue(kg, units);
  const mine = read === null || move === undefined ? [] : recordsOf(move, historyOf(sessionsOf(null, unsent(read.records)), exercise), shown);
  const records = move === undefined ? [] : page === null ? mine : joinRecords(serverRecords(page.records), mine, shown);
  const nearEnd = ({ nativeEvent: e }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.layoutMeasurement.height + e.contentOffset.y >= e.contentSize.height - e.layoutMeasurement.height) more();
    else failed.current = false;
  };

  const phoneOnly = read !== null && server === null ? <Text style={[styles.small, { color: color.muted }]}>{t('history.phoneOnly')}</Text> : null;
  const unread =
    read !== null && move === undefined ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('history.loadFailed')}</Text> : null;
  const empty =
    read !== null && move !== undefined && sessions.length === 0 ? (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('history.empty')}</Text>
    ) : null;
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
  // Only a past session the server has can be edited: one not sent yet is not there; one under way is changed in the
  // session itself (an edit here would split the phone's session from the server's — review).
  const editLink = (session: Session) =>
    session.serverId === undefined || session.endedAt === undefined ? null : (
      <Button
        label={t('sessionEdit.open')}
        accessibilityLabel={t('sessionEdit.openSpoken', { day: dayOf(session.startedAt) })}
        variant="text"
        size="sm"
        onPress={() => router.push({ pathname: '/workout-edit', params: { workout: session.serverId } })}
      />
    );
  const sessionCards =
    move === undefined
      ? null
      : sessions.map((session) => (
          <Card key={session.clientId}>
            <View style={styles.row}>
              <Text style={[styles.label, styles.grow, { color: color.text }]}>{dayOf(session.startedAt)}</Text>
              {editLink(session)}
            </View>
            {session.note !== undefined && <Text style={[styles.small, styles.note, { color: color.textSecondary }]}>{session.note}</Text>}
            {session.sets.map((s) => {
              const done = setText(s, move, units);
              const line =
                s.setType === 'WARM_UP'
                  ? t('history.warmUp', { set: done })
                  : s.rir === undefined
                    ? done
                    : setLeftText(done, s.rir);
              return (
                <View key={s.clientId}>
                  <Text style={[styles.small, { color: s.setType === 'WARM_UP' ? color.muted : color.textSecondary }]}>{line}</Text>
                  {s.note !== undefined && <Text style={[styles.small, styles.note, { color: color.muted }]}>{s.note}</Text>}
                </View>
              );
            })}
          </Card>
        ));

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView testID="history-list" contentContainerStyle={styles.body} onScroll={nearEnd} scrollEventThrottle={16}>
        <ScreenTitle>{exerciseName(exercise, moves)}</ScreenTitle>
        {phoneOnly}
        {recordCard}
        {sessions.length > 0 && <Text style={[styles.heading, { color: color.text }]}>{t('history.sessions')}</Text>}
        {sessionCards}
        {empty}
        {unread}
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
  note: { fontStyle: 'italic' },
});
