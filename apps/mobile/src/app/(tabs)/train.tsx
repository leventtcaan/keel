import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';

import { Button } from '@/components/Button';
import { ProblemText, announce, useProblem } from '@/components/ProblemText';
import { PlusEntry } from '@/components/PlusEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { CallRow } from '@/train/CallRow';
import { changeToday } from '@/train/changes';
import { dayName, programNotes } from '@/train/program';
import { TodayCard } from '@/train/TodayCard';
import { movesOf } from '@/train/trainData';
import { finishedDay, movedOffToday, sessionState, splitName, todayKind, weekRows } from '@/train/week';

type Schemas = components['schemas'];

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
  const { data, reload } = useReadOnFocus(
    useCallback(async () => {
      // A state declared, as the phone last knew it (K-518): a busy week brings its least dose (K-528).
      // The user's own moves too: an own program names them by the user's words, never by their id (K-968).
      // This week's call too (a row above the card; K-970).
      // A workout under way or done: the phone's records first (sets and a finish may still be in the queue), then the
      // server's word (WeekSession.workout, K-995) — sessionState.
      const [read, own, records, declared, decision] = await Promise.all([
        training.read(api),
        training.own(api),
        workoutRecords(),
        state.current().catch(() => null),
        load(() => api.GET('/v1/decisions/current')),
      ]);
      return { ...read, own, records, declared, decision };
    }, [api, training, workoutRecords, state]),
  );

  // The program the server just answered (an undo, the full workout back), shown until the tab reads again.
  const [answered, setAnswered] = useState<{ program: Schemas['Program']; over: typeof data } | null>(null);
  const read = data?.program.state === 'ready' ? data.program.value : null;
  const program = answered !== null && answered.over === data ? answered.program : read;
  const moves = movesOf(data, data?.own ?? []);
  // Today's change undone or the full workout back (K-995): one at a time (a ref: two taps in one moment both see
  // state from before either ran); what came of it said under the card.
  const [changing, setChanging] = useState(false);
  const sending = useRef(false);
  const [notice, setNotice, occurrence] = useProblem();
  const changeToday_ = async (programDayId: string, change: 'UNDO' | 'FULL') => {
    if (sending.current || program === null) return;
    sending.current = true;
    setChanging(true);
    const before = program;
    const answer = await changeToday(api, programDayId, change);
    sending.current = false;
    setChanging(false);
    if (answer.kind === 'conflict') setNotice(t(change === 'UNDO' ? 'todayChange.started' : 'train.dayChanged'));
    else if (answer.kind !== 'done') setNotice(t(SAID[answer.kind]));
    else {
      setAnswered({ program: answer.program, over: data });
      // An undo the server answered without undoing (the day turned meanwhile, nothing to undo): never called undone.
      if (change === 'UNDO' && !undone(before, answer.program, programDayId)) setNotice(t('train.notUndone'));
      else {
        setNotice(null);
        announce(t(change === 'UNDO' ? 'train.undone' : 'train.fullBack'));
      }
    }
    reload();
  };

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

  const session = sessionState({ program, kept: data?.kept === true, records: data?.records ?? [], now: new Date() });
  const today = session.found;
  const active = session.onPhone;
  const days = t(program.days.length === 1 ? 'train.days.one' : 'train.days.other', { count: program.days.length });
  const notes = programNotes(program, data?.declared);
  // What the card says, by the one function This week reads too (todayKind).
  const kind = todayKind(program, session);
  // With no session today (and no week off), any of the week's can be started from its row.
  const pick = today === null && kind !== 'restWeek' && active === null;
  const rows = weekRows(program, session.today);
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
        today={today}
        date={session.today}
        kind={kind}
        stale={session.stale}
        finishedDay={finishedDay(program, session)}
        movedAway={kind === 'moved' ? movedOffToday(program) : null}
        moves={moves}
        units={units}
        underWay={active !== null}
        canPick={pick && rows.some((row) => startable(row.session))}
        onStart={start}
        onChange={changing ? null : (id, change) => void changeToday_(id, change)}
        notice={
          notice === null ? null : (
            <ProblemText occurrence={occurrence} style={[styles.small, { color: color.text }]}>
              {notice}
            </ProblemText>
          )
        }
      />
      <View style={styles.week}>
        <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
          {t('train.thisWeek')}
        </Text>
        {rows.map((row) => {
          const tag = row.session.skipped === true ? t('train.skippedTag') : row.session.moved === true ? t('train.moved') : null;
          const label = t('train.startDay', { day: dayName(row.day) });
          const startRow =
            pick && startable(row.session) ? <Button label={t('train.startThis')} accessibilityLabel={label} variant="ghost" onPress={() => start(row.day.id)} /> : null;
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

/**
 * Whether today's undo did undo: the session no longer skipped, or back off the day it was moved to, on the same day of
 * the server's. Compared with what was sent, as the server answers 200 with nothing changed when there is nothing to undo.
 */
function undone(before: Schemas['Program'], after: Schemas['Program'], programDayId: string): boolean {
  if (after.today !== before.today) return false;
  const was = before.week?.find((s) => s.programDayId === programDayId);
  const now = after.week?.find((s) => s.programDayId === programDayId);
  if (was === undefined || now === undefined) return false;
  if (was.skipped === true) return now.skipped !== true;
  return now.date !== was.date || now.moved !== true;
}

/** A session of the week that can be started from its row: not skipped, not done already (the server's word). */
const startable = (session: Schemas['WeekSession']) => session.skipped !== true && session.workout?.state !== 'DONE';

const SAID = { conflict: 'todayChange.conflict', offline: 'todayChange.offline', failed: 'todayChange.failed' } as const;

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
