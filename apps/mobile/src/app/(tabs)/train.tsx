import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CoachEntry } from '@/components/CoachEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { programToday } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { dayName, exerciseName, nextLine, programNotes, repsLine, setsLine } from '@/train/program';
import { activeWorkout } from '@/train/workout';

type Schemas = components['schemas'];

/**
 * The Train tab (K-405, K-217): the program as the server set it this week. Above the days, the calls of the deload
 * ladder in force (a week off, a lighter week, the weights held); each day with its moves, this week's sets and the next
 * session's target; today's day marked, and started from here (any day can be). A workout under way is continued, not
 * started again. Offline, the copy kept on the phone, saying so (ADR-006). Nothing is computed here: every number is the
 * server's.
 */
export default function TrainScreen() {
  const { api, training, workoutRecords } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const { day, data, reload } = useReadOnFocus(
    useCallback(async () => {
      const [read, records] = await Promise.all([training.read(api), workoutRecords()]);
      return { ...read, active: activeWorkout(records) };
    }, [api, training, workoutRecords]),
  );

  const program = data?.program.state === 'ready' ? data.program.value : null;
  const moves = new Map((data?.exercises.state === 'ready' ? data.exercises.value : []).map((move) => [move.id, move]));
  const today = program === null ? null : programToday(program, day);
  const active = data?.active ?? null;

  // The session opens on the day; the workout is kept only once a set is logged (an empty workout is no session).
  const start = (programDayId: string) => router.push({ pathname: '/workout', params: { day: programDayId } });
  const underWay =
    active === null ? null : (
      <Card outline>
        <Text style={[styles.heading, { color: color.text }]}>{t('train.inProgress')}</Text>
        <Button label={t('train.continue')} onPress={() => router.push('/workout')} />
      </Card>
    );

  const problem =
    data !== null && data.program.state === 'failed' ? (
      <View style={styles.note}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('train.failed')}</Text>
        <Button label={t('train.retry')} variant="ghost" size="sm" onPress={reload} />
      </View>
    ) : null;
  const none = data?.program.state === 'none' ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('train.none')}</Text> : null;
  const kept = data?.kept === true && program !== null ? <Text style={[styles.small, { color: color.muted }]}>{t('train.kept')}</Text> : null;
  const notes =
    program === null ? null : (
      <View style={styles.note}>
        {programNotes(program).map((note) => (
          <Text key={note} style={[styles.text, { color: color.text }]}>
            {note}
          </Text>
        ))}
        {program.restUntil !== undefined && <Text style={[styles.small, { color: color.textSecondary }]}>{t('train.status.restWeekNote')}</Text>}
      </View>
    );

  const dayCard = (programDay: Schemas['ProgramDay']) => {
    const isToday = today?.kind === 'session' && today.day.id === programDay.id;
    const variant = isToday ? 'primary' : 'ghost';
    const size = isToday ? 'md' : 'sm';
    const startButton =
      active === null ? (
        <Button label={t(isToday ? 'train.start' : 'train.startThis')} variant={variant} size={size} onPress={() => start(programDay.id)} />
      ) : null;
    return (
      <Card key={programDay.id} outline={isToday} testID={`day-${programDay.id}`}>
        <View style={styles.dayHead}>
          <Text style={[styles.heading, { color: color.text }]}>{dayName(programDay)}</Text>
          <Text style={[styles.small, { color: isToday ? color.accent : color.muted }]}>
            {isToday ? t('train.today') : programDay.weekday === undefined ? '' : t(`onboarding.schedule.dayName.${programDay.weekday}`)}
          </Text>
        </View>
        {programDay.exercises.map((planned, index) => {
          const next = nextLine(planned, units, moves.get(planned.exerciseId)?.load ?? 'EXTERNAL');
          return (
            <View key={`${planned.exerciseId}-${index}`} style={styles.move}>
              <Text style={[styles.text, { color: color.text }]}>{exerciseName(planned.exerciseId)}</Text>
              <Text style={[styles.small, { color: color.textSecondary }]}>{`${setsLine(planned)} · ${repsLine(planned)}`}</Text>
              {next !== null && <Text style={[styles.small, { color: color.text }]}>{next}</Text>}
            </View>
          );
        })}
        {startButton}
      </Card>
    );
  };

  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the coach bar sits above it.
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('screens.train.title')}</ScreenTitle>
        {problem}
        {none}
        {kept}
        {underWay}
        {notes}
        {program?.days.map(dayCard)}
      </ScrollView>
      <View style={styles.coach}>
        <CoachEntry />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  note: { gap: tokens.space.sm },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  move: { gap: tokens.space.xs },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  coach: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
});
