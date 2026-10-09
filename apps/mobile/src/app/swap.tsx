import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { swapMove } from '@/train/changes';
import { MoveThumb } from '@/train/MoveThumb';
import { exerciseName } from '@/train/program';
import { swapChoice } from '@/train/swap';
import { movesOf } from '@/train/trainData';
import { sessionMoves, sessionState } from '@/train/week';

type Scope = components['schemas']['MoveSwap']['scope'];
type Equipment = components['schemas']['Equipment'];

const SAID = { conflict: 'swap.conflict', offline: 'swap.offline', failed: 'swap.failed' } as const;

/**
 * Swap a move (K-970, ADR-073 #6, Ek 3; prototype sheet `swap`). Route `/swap?day=<programDayId>&move=<exerciseId>`
 * from a move on today's card: titled by the move as it is now (not offered again), the server's options for the
 * planned move, and a pick asks "Today only" or "From now on". The new move starts fresh: no target, its own history
 * (the server's). A move swapped for today offers "Back to the planned move" (undoes it, today). `scope=today` without
 * a move is "Gym is busy": "Which one is taken?" first, then today only; a move with nothing to swap to leads to
 * skipping today instead, or back to the list. While a workout of the day is under way, the swap for today is the
 * workout's own: here only from now on. CONFLICT and no connection are said here.
 */
export default function SwapScreen() {
  const { api, training, workoutRecords } = useAppServices();
  const { color } = useTheme();
  const params = useLocalSearchParams<{ day?: string; move?: string; scope?: string }>();
  const todayOnly = params.scope === 'today';
  const { data } = useReadOnFocus(
    useCallback(async () => {
      const [read, own, records] = await Promise.all([training.read(api), training.own(api), workoutRecords()]);
      return { ...read, own, records };
    }, [api, training, workoutRecords]),
  );
  const [picked, setPicked] = useState<string | null>(params.move ?? null);
  const [to, setTo] = useState<string | null>(null);
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

  const program = data?.program.state === 'ready' ? data.program.value : null;
  const moves = movesOf(data, data?.own ?? []);
  const name = (id: string) => exerciseName(id, moves);
  // Today and whether its session is under way or done: the phone's records first, then the server's word (sessionState).
  const state = program === null ? null : sessionState({ program, kept: data?.kept === true, records: data?.records ?? [], now: new Date() });
  const found = state?.found ?? null;
  // The move from the card is the day's even when today is not its session (a from-now-on swap needs no session today).
  const programDay = program?.days.find((d) => d.id === params.day) ?? null;
  // Begun today (under way on this phone or another, or done): today's swaps are the workout's own then.
  const started = found !== null && found.day.id === params.day && state?.status !== 'none';
  // For today only while today is the day's session and its workout has not begun (then the workout swaps).
  const session = found !== null && found.day.id === params.day && found.session.skipped !== true && !started ? found : null;
  const planOnly = programDay === null ? null : { programDayId: programDay.id, date: state?.today ?? '', exerciseIds: programDay.exercises.map((e) => e.exerciseId) };
  const target = programDay === null || planOnly === null ? null : (session ?? { day: programDay, session: planOnly });
  const choice = target === null || picked === null ? null : swapChoice(target, picked);

  const send = async (exerciseId: string, next: string, scope: Scope) => {
    if (params.day === undefined || sending.current) return;
    sending.current = true;
    setBusy(true);
    const answer = await swapMove(api, { programDayId: params.day, exerciseId, to: next, scope });
    sending.current = false;
    if (!shown.current) return;
    setBusy(false);
    if (answer.kind === 'done') router.back();
    else setProblem(t(SAID[answer.kind]));
  };

  let title = t('swap.titleGeneric');
  let body: ReactNode = null;
  const line = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  if (data === null) {
    body = null; // still reading
  } else if (program === null) {
    body = line('train.failed');
  } else if (programDay === null || (picked !== null && choice === null)) {
    body = line('swap.notFound');
  } else if (todayOnly && started) {
    body = line('todayChange.started');
  } else if (todayOnly && session === null) {
    body = line('todayChange.none');
  } else if (choice === null && session !== null) {
    // "Gym is busy": the session's moves by their name today; the swap names the planned move.
    title = t('swap.which');
    body = (
      <View style={styles.rows}>
        {line('swap.whichWhy')}
        {sessionMoves(session.day, session.session).map((m) => (
          <OptionRow
            key={m.planned.exerciseId}
            label={name(m.planned.exerciseId)}
            equipment={moves.get(m.planned.exerciseId)?.equipment}
            busy={busy}
            onPress={() => setPicked(m.insteadOf?.exerciseId ?? m.planned.exerciseId)}
          />
        ))}
      </View>
    );
  } else if (choice !== null && to === null) {
    title = t('swap.title', { move: name(choice.current.exerciseId) });
    const plannedId = choice.planned.exerciseId;
    const offered = todayOnly ? choice.todayOptions : choice.options;
    // The user's own move has no options at all; a catalog move may have none in this gym.
    const none = moves.get(choice.current.exerciseId)?.name !== undefined ? 'swap.noneOwn' : 'swap.none';
    const ways =
      offered.length === 0 && todayOnly ? (
        <View style={styles.rows}>
          <Button label={t('swap.skipInstead')} variant="ghost" onPress={() => router.replace({ pathname: '/today-change', params: { day: params.day ?? '' } })} />
          <Button label={t('swap.backToList')} variant="ghost" onPress={() => setPicked(null)} />
        </View>
      ) : null;
    body = (
      <View style={styles.rows}>
        {line(offered.length === 0 ? none : 'swap.why')}
        {offered.map((id) => (
          <OptionRow
            key={id}
            label={name(id)}
            note={id === plannedId ? t('swap.back') : undefined}
            equipment={moves.get(id)?.equipment}
            busy={busy}
            // Back to the planned move undoes today's swap; from "Gym is busy" a swap is for today only.
            onPress={() => (id === plannedId || todayOnly ? void send(plannedId, id, 'TODAY') : setTo(id))}
          />
        ))}
        {ways}
      </View>
    );
  } else if (choice !== null && to !== null) {
    const planned = name(choice.planned.exerciseId);
    const plannedId = choice.planned.exerciseId;
    title = t('swap.scopeTitle', { move: name(to), current: name(choice.current.exerciseId) });
    // Today only while today is the day's session and the move is not in it yet; from now on whenever.
    const today = session !== null && choice.todayOptions.includes(to);
    body = (
      <View style={styles.rows}>
        {today && <ScopeButton label={t('swap.today')} note={t('swap.todayBody', { current: planned })} busy={busy} onPress={() => void send(plannedId, to, 'TODAY')} />}
        <ScopeButton label={t('swap.fromNow')} note={t('swap.fromNowBody', { move: name(to) })} busy={busy} onPress={() => void send(plannedId, to, 'FROM_NOW_ON')} />
      </View>
    );
  }
  return (
    <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: color.background }]}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{title}</ScreenTitle>
        {body}
        {problem !== null && (
          <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
            {problem}
          </ProblemText>
        )}
        <Button label={t('swap.close')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

type RowProps = { label: string; note?: string; equipment: Equipment | undefined; busy: boolean; onPress: () => void };

/** A move to pick: its image, its name, and a note under it ("Back to the planned move"). */
function OptionRow({ label, note, equipment, busy, onPress }: RowProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={note === undefined ? label : `${label}. ${note}`}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.row, (pressed || busy) && styles.dim]}>
      <MoveThumb equipment={equipment} />
      <View style={styles.grow}>
        <Text style={[styles.text, styles.bold, { color: color.text }]}>{label}</Text>
        {note !== undefined && <Text style={[styles.small, { color: color.muted }]}>{note}</Text>}
      </View>
    </Pressable>
  );
}

/** "Today only" or "From now on", each saying what it means. */
function ScopeButton({ label, note, busy, onPress }: Omit<RowProps, 'equipment'> & { note: string }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.scope, { backgroundColor: color.surface }, (pressed || busy) && styles.dim]}>
      <Text style={[styles.text, styles.bold, { color: color.text }]}>{label}</Text>
      <Text style={[styles.small, { color: color.textSecondary }]}>{note}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  rows: { gap: tokens.space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch },
  scope: { minHeight: tokens.size.touch, borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.xs },
  grow: { flex: 1, gap: tokens.space.xs },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
