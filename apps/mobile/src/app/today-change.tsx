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
import { todaySession } from '@/train/week';
import { activeWorkout } from '@/train/workout';

type Change = components['schemas']['TodayChange']['change'];

const SAID = { conflict: 'todayChange.conflict', offline: 'todayChange.offline', failed: 'todayChange.failed' } as const;

/**
 * "Change today" (K-970, ADR-073 #5, Ek 3; prototype `#today`), opened from today's card with its program day. Short on
 * time (the program's first moves, the session still counts), Move it (to tomorrow; the server shifts the week and
 * never passes Sunday) and Skip today (no catch-up). The server changes this week's session and the Train tab reads it
 * again; CONFLICT, no connection or our failure is said here and nothing is taken as changed. A workout of the day
 * under way leaves only the short version (the server refuses a move or a skip then); the short version offers no
 * second short. Route: `/today-change?day=<programDayId>` (This week's card opens it too, K-969).
 */
export default function TodayChangeScreen() {
  const { api, training, workoutRecords } = useAppServices();
  const { color } = useTheme();
  const { day: programDayId } = useLocalSearchParams<{ day?: string }>();
  const { day, data } = useReadOnFocus(
    useCallback(async () => {
      const [read, records] = await Promise.all([training.read(api), workoutRecords()]);
      return { program: read.program.state === 'ready' ? read.program.value : null, active: activeWorkout(records) };
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

  const today = data?.program == null ? null : todaySession(data.program, day);
  const session = today !== null && today.day.id === programDayId && today.session.skipped !== true ? today : null;
  const started = session !== null && data?.active?.programDayId === session.day.id;

  const send = async (change: Change) => {
    if (session === null || sending.current) return;
    sending.current = true;
    setBusy(true);
    const answer = await changeToday(api, session.day.id, change);
    sending.current = false;
    if (!shown.current) return;
    setBusy(false);
    if (answer.kind === 'done') router.back();
    else setProblem(t(SAID[answer.kind]));
  };
  const row = (change: Change, key: string) => (
    <Pressable
      key={change}
      accessibilityRole="button"
      accessibilityLabel={`${t(`todayChange.${key}.title`)}. ${t(`todayChange.${key}.body`)}`}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={() => void send(change)}
      style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, (pressed || busy) && styles.dim]}>
      <Text style={[styles.title, { color: color.text }]}>{t(`todayChange.${key}.title`)}</Text>
      <Text style={[styles.small, { color: color.textSecondary }]}>{t(`todayChange.${key}.body`)}</Text>
    </Pressable>
  );

  let body = null;
  if (data !== null && session === null) body = <Text style={[styles.text, { color: color.textSecondary }]}>{t('todayChange.none')}</Text>;
  else if (session !== null) {
    const short = session.session.short === true;
    body = (
      <View style={styles.rows}>
        {started && <Text style={[styles.text, { color: color.textSecondary }]}>{t('todayChange.started')}</Text>}
        {short ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('todayChange.shortNow')}</Text> : row('SHORT', 'short')}
        {!started && row('MOVE', 'move')}
        {!started && row('SKIP', 'skip')}
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
