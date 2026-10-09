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
import { movedOffToday, todaySession } from '@/train/week';

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
  const { api, training } = useAppServices();
  const { color } = useTheme();
  const { day: programDayId } = useLocalSearchParams<{ day?: string }>();
  const { data } = useReadOnFocus(
    useCallback(async () => {
      const read = await training.read(api);
      return { program: read.program.state === 'ready' ? read.program.value : null };
    }, [api, training]),
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
  const today = program === null ? null : todaySession(program);
  const named = today !== null && today.day.id === programDayId ? today : null;
  const session = named !== null && named.session.skipped !== true ? named : null;
  const workout = session?.session.workout?.state;
  // Today's move or skip of this day that the server says can be undone: the day's session, skipped or moved off today.
  const away = program === null ? null : movedOffToday(program);
  const undoable = [named, away].find((f) => f !== null && f.day.id === programDayId && f.session.undoable === true) ?? null;

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
    else setProblem(t(SAID[answer.kind]));
  };
  // "Gym is busy" is a swap for today: which move is taken first (the swap sheet), never a toast.
  const act = (key: Row) => {
    if (key !== 'busy') return void send(CHANGES[key]);
    if (session !== null) router.replace({ pathname: '/swap', params: { day: session.day.id, scope: 'today' } });
  };
  const row = (key: Row) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityLabel={`${t(`todayChange.${key}.title`)}. ${t(`todayChange.${key}.body`)}`}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={() => act(key)}
      style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, (pressed || busy) && styles.dim]}>
      <Text style={[styles.title, { color: color.text }]}>{t(`todayChange.${key}.title`)}</Text>
      <Text style={[styles.small, { color: color.textSecondary }]}>{t(`todayChange.${key}.body`)}</Text>
    </Pressable>
  );

  const line = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  let body = null;
  if (data !== null && undoable !== null && session === null) body = <View style={styles.rows}>{row('undo')}</View>;
  else if (data !== null && session === null) body = line('todayChange.none');
  else if (session !== null && workout === 'DONE') body = line('train.doneToday');
  else if (session !== null) {
    const started = workout === 'OPEN';
    body = (
      <View style={styles.rows}>
        {started && line('todayChange.started')}
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
