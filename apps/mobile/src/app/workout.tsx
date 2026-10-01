import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import type { LocalRecord } from '@/sync/store';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { FinishForm } from '@/train/FinishForm';
import { RestTimer } from '@/train/RestTimer';
import { SetEntry } from '@/train/SetEntry';
import { SetTable } from '@/train/SetTable';
import { Warmups } from '@/train/Warmups';
import { dayName, exerciseName } from '@/train/program';
import { buildSet, exerciseStatus, parseEntry, parseLoad, platesLine } from '@/train/session';
import type { TrainData } from '@/train/trainData';
import { warmupSets, warmups, warmupsDone } from '@/train/warmup';
import { type ExercisePlan, activeWorkout, finishRecord, lastTime, planExercise } from '@/train/workout';
import { weightInput } from '@/units/units';

/**
 * The session (K-405, prototype 2.4, B §6.5): the day's moves; the move under way with its rows — the server's next
 * target faint (K-217), last time beside it — and one tap logs the row as suggested, with the RIR picked. A rest timer
 * after each set (G1 K-49). Finishing asks whether each move's form was clean (G6 K-31). Every set and the finish are
 * records on the phone first (K-304): the session runs offline and is found again after a restart. Opened on a day, the
 * workout is kept only with its first set, and finishing before any set sends nothing: an empty workout is no session
 * (the server counts each workout as a session done, K-220). Before a move's first work set, its warm-ups (K-417): three
 * before the day's first move, one before the others, each one tap; with the gym in use known, the plates a side.
 */
export default function WorkoutScreen() {
  const { api, training, workoutRecords, queue, report } = useAppServices();
  const { day: opened } = useLocalSearchParams<{ day?: string }>();
  const units = useUnits();
  const { color } = useTheme();
  const [data, setData] = useState<TrainData | null>(null);
  const [records, setRecords] = useState<LocalRecord[] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [rest, setRest] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [unclean, setUnclean] = useState<Set<string>>(() => new Set());
  const [sessionNote, setSessionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ row: string; text: string } | null>(null);
  // Two taps in one frame, before `busy` disables the button, must not log the set twice.
  const saving = useRef(false);
  const [failed, setFailed] = useState(false);

  const named = useCallback((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }), [report]);
  // A failed read back is not a failed save: the set is kept; the screen catches up at the next read.
  const refresh = useCallback(() => workoutRecords().then(setRecords).catch(named), [workoutRecords, named]);
  useEffect(() => {
    void Promise.all([training.read(api), workoutRecords()])
      .then(([read, kept]) => {
        setData(read);
        setRecords(kept);
      })
      .catch((error: unknown) => {
        named(error);
        setFailed(true);
      });
  }, [api, training, workoutRecords, named]);

  const active = records === null ? null : activeWorkout(records);
  const program = data?.program.state === 'ready' ? data.program.value : null;
  // The workout under way decides the day; otherwise the day the session was opened on, not kept until a set is logged.
  const dayId = active === null ? (opened ?? null) : active.programDayId;
  const day = program?.days.find((d) => d.id === dayId) ?? null;
  const done = active?.sets ?? [];
  // Warm-ups done before the workout is kept wait here, ids and all, and go with its first work set: a workout with
  // warm-ups alone is no session (K-220). Leaving before a work set leaves nothing behind.
  const [held, setHeld] = useState<components['schemas']['NewSet'][]>([]);
  const warmedUp = [...done, ...held];
  const moves = useMemo(() => new Map((data?.exercises.state === 'ready' ? data.exercises.value : []).map((m) => [m.id, m])), [data]);
  const plans: (ExercisePlan | null)[] =
    day === null || records === null
      ? []
      : day.exercises.map((planned) => {
          const move = moves.get(planned.exerciseId);
          return move === undefined ? null : planExercise(planned, move, lastTime(records, planned.exerciseId, active?.clientId ?? ''), done);
        });
  const firstOpen = plans.findIndex((plan) => plan !== null && plan.current !== null);
  const selected = picked ?? (firstOpen < 0 ? 0 : firstOpen);
  const plan = plans[selected] ?? null;
  const planned = day?.exercises[selected];
  const move = planned === undefined ? undefined : moves.get(planned.exerciseId);
  const row = plan === null || plan.current === null ? null : plan.rows[plan.current];
  // Warm-ups come before the move's first work set; the day's first move is the one picked before any work set at all.
  const worked = [...new Set(done.filter((s) => s.setType === 'WORKING').map((s) => s.exerciseId))];
  const warming =
    move === undefined || plan === null || worked.includes(move.id)
      ? []
      : warmups(plan.rows[0]?.suggested.loadKg ?? null, move, worked.length === 0, data?.gym ?? null, units);

  // The fields hold the row under way: its suggestion until the user changes it. What was typed belongs to its row, so a
  // new row starts from its own suggestion, and a problem said about one row is gone at the next.
  const rowKey = `${selected}-${plan?.current ?? 'done'}`;
  const [typed, setTyped] = useState<{ row: string; load: string; reps: string; rir: number; note: string | null } | null>(null);
  const entry =
    typed !== null && typed.row === rowKey
      ? typed
      : {
          row: rowKey,
          load: row === null || row.suggested.loadKg === null ? '' : weightInput(row.suggested.loadKg, units),
          reps: row === null ? '' : String(row.suggested.reps),
          rir: planned?.targetRir ?? 0,
          note: null,
        };
  const setEntry = (change: Partial<typeof entry>) => setTyped({ ...entry, ...change });
  const said = problem !== null && problem.row === rowKey ? problem.text : null;

  /** Keeps the workout on the phone with its first set. */
  const start = async (programDayId: string): Promise<string> => {
    const clientId = newClientId();
    await queue.record({ kind: 'workout', body: { clientId, startedAt: new Date().toISOString(), programDayId } });
    return clientId;
  };

  const log = async () => {
    if (saving.current || day === null || move === undefined || row === null || plan === null) return;
    const parsed = parseEntry(entry.load, entry.reps, move, units, row.suggested.loadKg);
    if (parsed === null) {
      setProblem({ row: rowKey, text: t('workout.invalid') });
      return;
    }
    saving.current = true;
    setBusy(true);
    let saved = false;
    try {
      // The workout this set belongs to: the one under way as last read, or — read again, as a set that failed after its
      // workout was kept, or another screen, may have started one since — none yet, and this set starts it.
      const workoutClientId = active?.clientId ?? activeWorkout(await workoutRecords())?.clientId ?? (await start(day.id));
      // The warm-ups waiting go first, under their own ids: one already saved before a failure is not saved twice.
      for (const warmup of held) await queue.record({ kind: 'set', workoutClientId, body: warmup });
      setHeld([]);
      await queue.record({ kind: 'set', workoutClientId, body: buildSet(newClientId(), move, row.side, parsed, entry.rir, entry.note ?? undefined) });
      saved = true;
    } catch (error) {
      named(error);
      setProblem({ row: rowKey, text: t('workout.saveFailed') });
    }
    if (saved) {
      setRest(new Date().getTime());
      // The move picked is done: the next one with sets left comes up.
      if (plan.current === plan.rows.length - 1) setPicked(null);
      await refresh();
    }
    saving.current = false;
    setBusy(false);
  };

  /**
   * The next warm-up, one tap: the move's sets of it still missing (both sides of a one-sided move). No rest timer. Before
   * the workout is kept, held on the screen for its first work set.
   */
  // A warm-up's problem is its move's: picking another move does not carry it.
  const warmupKey = `warmup-${move?.id ?? ''}`;
  const logWarmup = async () => {
    if (saving.current || day === null || move === undefined) return;
    const warmup = warming[warmupsDone(warmedUp, move)];
    if (warmup === undefined) return;
    saving.current = true;
    setBusy(true);
    try {
      const sets = warmupSets(warmup, move, warmedUp).map((set) => ({ clientId: newClientId(), ...set }));
      const workoutClientId = active?.clientId ?? activeWorkout(await workoutRecords())?.clientId ?? null;
      if (workoutClientId === null) setHeld((waiting) => [...waiting, ...sets]);
      else for (const set of sets) await queue.record({ kind: 'set', workoutClientId, body: set });
      setProblem((said) => (said?.row === warmupKey ? null : said));
    } catch (error) {
      named(error);
      setProblem({ row: warmupKey, text: t('workout.saveFailed') });
    }
    await refresh();
    saving.current = false;
    setBusy(false);
  };

  const finish = async () => {
    if (saving.current || active === null) return;
    saving.current = true;
    setBusy(true);
    try {
      await queue.record(finishRecord(active.clientId, newClientId(), new Date(), [...unclean], sessionNote));
      // What was done, against last time (K-406); a workout without a work set has nothing to show.
      if (worked.length > 0) router.replace({ pathname: '/workout-summary', params: { workout: active.clientId } });
      else router.back();
    } catch (error) {
      named(error);
      setProblem({ row: FINISH, text: t('workout.finishFailed') });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const finishProblem = problem !== null && problem.row === FINISH ? <Text style={[styles.text, { color: color.text }]}>{problem.text}</Text> : null;

  const movesDone = plans.filter((p) => p !== null && p.rows.some((r) => r.done !== null)).length;
  // Nothing kept yet: close and send nothing. A workout kept without a working set: finish it, there is nothing to ask.
  const onFinish = () => {
    if (active === null) router.back();
    else if (worked.length === 0) void finish();
    else setFinishing(true);
  };

  const list = (
    <View style={styles.list}>
      {day?.exercises.map((p, index) => {
        const status = plans[index];
        const on = index === selected;
        return (
          <Pressable
            key={`${p.exerciseId}-${index}`}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => setPicked(index)}
            style={[styles.move, on && { backgroundColor: color.surface }]}>
            <Text style={[styles.text, styles.grow, { color: status?.current === null ? color.muted : color.text }]}>
              {exerciseName(p.exerciseId)}
            </Text>
            <Text style={[styles.small, { color: on ? color.accent : color.muted }]}>{status === null ? '' : exerciseStatus(status)}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const entryBlock =
    move === undefined || plan === null || plan.current === null || row === null ? null : (
      <SetEntry
        move={move}
        index={plan.current}
        side={row.side}
        entry={entry}
        onChange={setEntry}
        onLog={() => void log()}
        problem={said}
        busy={busy}
      />
    );
  const typedKg = row === null ? null : parseLoad(entry.load, units, row.suggested.loadKg);
  const perSide = move === undefined || typedKg === null || entryBlock === null ? null : platesLine(move, typedKg, data?.gym);
  const plates = perSide === null ? null : <Text style={[styles.small, { color: color.muted }]}>{perSide}</Text>;
  const warmBlock =
    move === undefined || warming.length === 0 ? null : (
      <Warmups
        move={move}
        warmups={warming}
        done={warmupsDone(warmedUp, move)}
        gym={data?.gym}
        onLog={() => void logWarmup()}
        problem={problem !== null && problem.row === warmupKey ? problem.text : null}
        busy={busy}
      />
    );
  const card =
    planned === undefined ? null : move === undefined || plan === null ? (
      <Card>
        <Text style={[styles.heading, { color: color.text }]}>{exerciseName(planned.exerciseId)}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('workout.unknownMove')}</Text>
      </Card>
    ) : (
      <Card>
        <View style={styles.cardHead}>
          <Text style={[styles.heading, styles.grow, { color: color.text }]}>{exerciseName(planned.exerciseId)}</Text>
          <Text style={[styles.small, { color: color.muted }]}>{t('workout.targetRir', { max: planned.targetRir })}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('history.openLabel', { exercise: exerciseName(planned.exerciseId) })}
          onPress={() => router.push({ pathname: '/exercise-history', params: { exercise: planned.exerciseId } })}>
          <Text style={[styles.small, { color: color.accent }]}>{t('history.open')}</Text>
        </Pressable>
        {warmBlock}
        <SetTable plan={plan} move={move} />
        {entryBlock}
        {plates}
      </Card>
    );

  const finishButton = day === null && active === null ? null : <Button label={t('workout.finish')} variant="ghost" onPress={onFinish} />;
  // The program was made again (new days) or cannot be read: the workout under way can still be finished.
  const dayGone =
    active !== null && day === null && data !== null ? (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('workout.dayGone')}</Text>
    ) : null;
  const loadFailed = failed ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('workout.loadFailed')}</Text> : null;
  const form = (
    <>
      <FinishForm
        moves={worked}
        unclean={unclean}
        busy={busy}
        onMark={(id, clean) =>
          setUnclean((current) => {
            const next = new Set(current);
            if (clean) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        note={sessionNote}
        onNote={setSessionNote}
        onFinish={() => void finish()}
        onBack={() => setFinishing(false)}
      />
      {finishProblem}
    </>
  );
  const session = (
    <>
      {list}
      {card}
      {rest !== null && <RestTimer since={rest} />}
      {dayGone}
      {finishButton}
      {finishProblem}
    </>
  );

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.cardHead}>
          <ScreenTitle>{day === null ? t('workout.title') : dayName(day)}</ScreenTitle>
          {day !== null && (
            <Text style={[styles.small, { color: color.muted }]}>
              {day.exercises.length === 1
                ? t('workout.progressOne', { done: movesDone })
                : t('workout.progress', { done: movesDone, count: day.exercises.length })}
            </Text>
          )}
        </View>
        {data?.kept === true && <Text style={[styles.small, { color: color.muted }]}>{t('workout.kept')}</Text>}
        {loadFailed}
        {finishing ? form : session}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The finish's own key for a problem: not a row of any move. */
const FINISH = 'finish';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  list: { gap: tokens.space.xs },
  move: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.button },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.sm },
  grow: { flex: 1 },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
