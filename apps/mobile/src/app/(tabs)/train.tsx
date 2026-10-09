import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PlusEntry } from '@/components/PlusEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { CallRow } from '@/train/CallRow';
import { dayName, programNotes } from '@/train/program';
import { TodayCard } from '@/train/TodayCard';
import { movesOf } from '@/train/trainData';
import { splitName, todaySession, weekRows } from '@/train/week';
import { activeWorkout } from '@/train/workout';

/**
 * The Train tab (K-405, K-217, K-970; prototype `#train`): the program's split and days, the calls of the deload ladder
 * in force, today's card (the session the server put on today, with Start and Change), and the rest of the week as the
 * server laid it out, moved and skipped sessions marked. A day without a session starts any of the week's. A workout
 * under way is continued, not started again. Offline, the copy kept on the phone, saying so (ADR-006). Nothing is
 * computed here: every date, move and number is the server's.
 */
export default function TrainScreen() {
  const { api, training, workoutRecords, state } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const { day, data, reload } = useReadOnFocus(
    useCallback(async () => {
      // A state declared, as the phone last knew it (K-518): a busy week brings its least dose (K-528).
      // The user's own moves too: an own program names them by the user's words, never by their id (K-968).
      // This week's call too (a row above the card; K-970).
      const [read, own, records, declared, decision] = await Promise.all([
        training.read(api),
        training.own(api),
        workoutRecords(),
        state.current().catch(() => null),
        load(() => api.GET('/v1/decisions/current')),
      ]);
      return { ...read, own, active: activeWorkout(records), declared, decision };
    }, [api, training, workoutRecords, state]),
  );

  const program = data?.program.state === 'ready' ? data.program.value : null;
  const moves = movesOf(data, data?.own ?? []);
  const active = data?.active ?? null;

  // The session opens on the day; the workout is kept only once a set is logged (an empty workout is no session). One
  // screen per tap: a second tap before the screen is up must not stack a second session (K-405 review).
  const opening = useRef(false);
  useFocusEffect(
    useCallback(() => {
      opening.current = false;
    }, []),
  );
  const start = (programDayId: string) => {
    if (opening.current) return;
    opening.current = true;
    router.push({ pathname: '/workout', params: { day: programDayId } });
  };

  const problem =
    data !== null && data.program.state === 'failed' ? (
      <View style={styles.note}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('train.failed')}</Text>
        <Button label={t('train.retry')} variant="ghost" size="sm" onPress={reload} />
      </View>
    ) : null;
  const none = data?.program.state === 'none' ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('train.none')}</Text> : null;
  const kept = data?.kept === true && program !== null ? <Text style={[styles.small, { color: color.muted }]}>{t('train.kept')}</Text> : null;
  // The first read on its way: a calm sign, not an empty page (simulator walk, K-970).
  const loading =
    data === null ? <ActivityIndicator accessible accessibilityLabel={t('train.loading')} color={color.muted} style={styles.loading} /> : null;
  if (program === null) {
    return (
      <Screen>
        {loading}
        {problem}
        {none}
      </Screen>
    );
  }

  const today = todaySession(program, day);
  const days = t(program.days.length === 1 ? 'train.days.one' : 'train.days.other', { count: program.days.length });
  const notes = programNotes(program, data?.declared);
  // With no session today (and no week off), any of the week's can be started from its row.
  const pick = today === null && program.restUntil === undefined && active === null;
  const rows = weekRows(program, day);
  // The review's changes in force (ADR-073 #3): how many, and the page that undoes each.
  const appliedCount = program.review?.applied.length ?? 0;
  const applied =
    appliedCount === 0 ? null : (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/edit-program', params: { part: 'changes' } })}
        style={({ pressed }) => [styles.applied, { backgroundColor: color.accentSoft }, pressed && styles.dim]}>
        <Text style={[styles.text, styles.bold, styles.grow, { color: color.text }]}>
          {t(appliedCount === 1 ? 'editProgram.applied.one' : 'editProgram.applied.other', { count: appliedCount })}
        </Text>
        <Text style={[styles.text, { color: color.text }]}>{t('editProgram.appliedUndo')}</Text>
      </Pressable>
    );
  const decision = data?.decision.state === 'ready' && data.decision.value.action.type !== 'NO_DECISION_YET' ? data.decision.value : null;
  return (
    <Screen editable>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('train.head', { split: splitName(program), days })}</Text>
      {applied}
      {decision !== null && <CallRow decision={decision} onChanged={reload} />}
      {kept}
      {notes.map((note) => (
        <Text key={note} style={[styles.text, { color: color.text }]}>
          {note}
        </Text>
      ))}
      <TodayCard
        program={program}
        date={day}
        today={today}
        moves={moves}
        units={units}
        underWay={active !== null}
        canPick={pick && rows.some((row) => row.session.skipped !== true)}
        onStart={start}
      />
      <View style={styles.week}>
        <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
          {t('train.thisWeek')}
        </Text>
        {rows.map((row) => {
          const tag = row.session.skipped === true ? t('train.skippedTag') : row.session.moved === true ? t('train.moved') : null;
          const label = t('train.startDay', { day: dayName(row.day) });
          const startRow =
            pick && row.session.skipped !== true ? <Button label={t('train.startThis')} accessibilityLabel={label} variant="ghost" onPress={() => start(row.day.id)} /> : null;
          return (
            <View key={row.day.id} style={[styles.row, { borderColor: color.line }]}>
              <Text style={[styles.text, styles.grow, { color: color.text }]}>
                {t('train.weekRow', { weekday: t(`programEditor.weekdayShort.${row.weekday}`), day: dayName(row.day) })}
              </Text>
              {tag !== null && <Text style={[styles.small, { color: color.muted }]}>{tag}</Text>}
              {startRow}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

/** The tab's frame; with a program, "Edit" beside the title (prototype `#train` › `.tlink`). */
function Screen({ children, editable = false }: { children: ReactNode; editable?: boolean }) {
  const { color } = useTheme();
  const edit = editable ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('editProgram.editLabel')}
      onPress={() => router.push('/edit-program')}
      style={({ pressed }) => [styles.edit, pressed && styles.dim]}>
      <Text style={[styles.text, styles.bold, { color: color.accent }]}>{t('editProgram.edit')}</Text>
    </Pressable>
  ) : null;
  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the "+" sits above it.
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.top}>
          <View style={styles.grow}>
            <ScreenTitle>{t('screens.train.title')}</ScreenTitle>
          </View>
          {edit}
        </View>
        {children}
      </ScrollView>
      <View style={styles.plus}>
        <PlusEntry />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  note: { gap: tokens.space.sm },
  week: { gap: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch, borderTopWidth: tokens.border.hairline },
  grow: { flex: 1 },
  loading: { alignSelf: 'flex-start', minHeight: tokens.size.touch },
  top: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  edit: { minHeight: tokens.size.touch, minWidth: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  applied: { minHeight: tokens.size.touch, borderRadius: tokens.radius.card, padding: tokens.space.md, flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  bold: { fontWeight: tokens.weight.semibold },
  dim: { opacity: tokens.opacity.dim },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  plus: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
});
