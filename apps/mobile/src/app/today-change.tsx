import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ProblemText, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { changeToday } from '@/train/changes';
import { dayName } from '@/train/program';
import { movedOffToday, moveShifts, sessionState } from '@/train/week';

type Change = components['schemas']['TodayChange']['change'];

type Row = 'short' | 'full' | 'busy' | 'move' | 'skip' | 'undo';
const CHANGES: Record<Exclude<Row, 'busy'>, Change> = { short: 'SHORT', full: 'FULL', move: 'MOVE', skip: 'SKIP', undo: 'UNDO' };
const SAID = { conflict: 'todayChange.conflict', offline: 'todayChange.offline', failed: 'todayChange.failed' } as const;

/**
 * "Change today" (K-970, ADR-073 #5, Ek 3; prototype `#today`), opened from today's card with its program day. Short on
 * time (the program's first moves, the session still counts), Move it (to tomorrow; the server shifts the week and
 * never passes Sunday) and Skip today (no catch-up). The server changes this week's session and the Train tab reads it
 * again; CONFLICT, no connection or our failure is said here and nothing is taken as changed. A workout of the day
 * under way leaves only the short version (the server refuses a move or a skip then); one done leaves nothing to change.
 * The short version offers the full workout back (FULL); a move or skip of today the server says can be undone
 * (`undoable`) offers Undo. Today, under way and done are the server's (`Program.today`, `WeekSession.workout`; K-995),
 * never the phone's clock or its own records. Route: `/today-change?day=<programDayId>` (This week's card opens it too, K-969).
 */
export default function TodayChangeScreen() {
  const { api, training, workoutRecords } = useAppServices();
  const { color } = useTheme();
  const { day: programDayId } = useLocalSearchParams<{ day?: string }>();
  const { data } = useReadOnFocus(
    useCallback(async () => {
      const [read, records] = await Promise.all([training.read(api), workoutRecords()]);
      return { program: read.program.state === 'ready' ? read.program.value : null, kept: read.kept, records };
    }, [api, training, workoutRecords]),
  );
  const [problem, setProblem, occurrence] = useProblem();
  const [busy, setBusy] = useState(false);
  // A ref, not state: two taps in the same moment both see state from before either ran.
  const sending = useRef(false);
  // An answer that comes once the sheet has gone closes nothing: going back then would close another screen.
  const shown = useRef(true);
  useEffect(() => {
    shown.current = true;
    return () => {
      shown.current = false;
    };
  }, []);

  const program = data?.program ?? null;
  // Today, and whether its session is under way (on this phone, its sets maybe still queued, or on another), done or
  // neither: the phone's records first, then the server's word (sessionState, as the Train tab and This week).
  const state = program === null ? null : sessionState({ program, kept: data?.kept === true, records: data?.records ?? [], now: new Date() });
  const today = state?.found ?? null;
  const named = today !== null && today.day.id === programDayId ? today : null;
  const session = named !== null && named.session.skipped !== true ? named : null;
  const status = state?.status ?? 'none';
  // Today's move or skip of this day that the server says can be undone: the day's session, skipped or moved off today.
  // Not from a copy kept offline: its word on what can be undone was the server's then.
  const away = program === null || state?.stale !== false ? null : movedOffToday(program);
  const undoable =
    state?.stale !== false ? null : ([named, away].find((f) => f !== null && f.day.id === programDayId && f.session.undoable === true) ?? null);

  const send = async (change: Change) => {
    const target = change === 'UNDO' ? undoable : session;
    if (target === null || sending.current) return;
    sending.current = true;
    setBusy(true);
    const answer = await changeToday(api, target.day.id, change);
    sending.current = false;
    if (!shown.current) return;
    setBusy(false);
    if (answer.kind === 'done') router.back();
    else if (answer.kind === 'conflict') setProblem(t(conflictKey(change)));
    else setProblem(t(SAID[answer.kind]));
  };
  /** A refusal (409) says what it was for the change sent: the day changed, the workout began, or why it can't move. */
  const conflictKey = (change: Change): string => {
    if (change === 'SHORT' || change === 'FULL') return 'train.dayChanged';
    if (change === 'MOVE' && preview?.conflict != null) return `todayChange.moveConflict.${preview.conflict}`;
    if (change === 'MOVE') return 'todayChange.conflict';
    return 'todayChange.started';
  };
  // "Gym is busy" is a swap for today: which move is taken first (the swap sheet), never a toast.
  const act = (key: Row) => {
    if (key !== 'busy') return void send(CHANGES[key]);
    if (session !== null) router.replace({ pathname: '/swap', params: { day: session.day.id, scope: 'today' } });
  };
  // "Move it" says what it would do, as the server previews it (`movePreview`): the day it goes to, or the week
  // re-laid, or why it can't (then it is off). Without a preview, its general words.
  // Not from a copy kept offline: the preview was the server's then.
  const preview = session === null || program === null || state?.stale !== false ? null : moveShifts(program, session.session);
  const moveBody = (): string => {
    if (preview === null) return t('todayChange.move.body');
    if (preview.conflict !== null) return t(`todayChange.moveConflict.${preview.conflict}`);
    const [first, ...rest] = preview.shifts;
    if (first === undefined) return t('todayChange.move.body');
    const short = (weekday: string) => t(`programEditor.weekdayShort.${weekday}`);
    if (rest.length === 0) return t('todayChange.moveTo', { weekday: short(first.weekday) });
    return t('todayChange.moveShifts', { days: preview.shifts.map((s) => t('train.weekRow', { weekday: short(s.weekday), day: dayName(s.day) })).join(', ') });
  };
  const row = (key: Row) => {
    const body = key === 'move' ? moveBody() : t(`todayChange.${key}.body`);
    const off = busy || (key === 'move' && preview?.conflict != null);
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityLabel={`${t(`todayChange.${key}.title`)}. ${body}`}
        accessibilityState={{ disabled: off }}
        disabled={off}
        onPress={() => act(key)}
        style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, (pressed || off) && styles.dim]}>
        <Text style={[styles.title, { color: color.text }]}>{t(`todayChange.${key}.title`)}</Text>
        <Text style={[styles.small, { color: color.textSecondary }]}>{body}</Text>
      </Pressable>
    );
  };

  const line = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  let body = null;
  if (data !== null && undoable !== null && session === null) body = <View style={styles.rows}>{row('undo')}</View>;
  else if (data !== null && session === null) body = line('todayChange.none');
  else if (session !== null && status === 'done') body = line('train.doneToday');
  else if (session !== null) {
    const started = status === 'onPhone' || status === 'openElsewhere';
    body = (
      <View style={styles.rows}>
        {started && line('todayChange.started')}
        {session.session.short === true && line('todayChange.shortNow')}
        {row(session.session.short === true ? 'full' : 'short')}
        {!started && row('busy')}
        {!started && row('move')}
        {!started && row('skip')}
      </View>
    );
  }
  return (
    <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: color.background }]}>
      <ScreenTitle>{t('todayChange.title')}</ScreenTitle>
      {body}
      {problem !== null && (
        <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
          {problem}
        </ProblemText>
      )}
      <Button label={t('todayChange.close')} variant="ghost" onPress={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: tokens.space.lg, gap: tokens.space.md },
  rows: { gap: tokens.space.sm },
  row: { minHeight: tokens.size.touch, borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.xs },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
