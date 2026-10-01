import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { dayName, exerciseName } from '@/train/program';
import { buildSet, exerciseStatus, parseEntry } from '@/train/session';
import type { TrainData } from '@/train/trainData';
import { type ExercisePlan, activeWorkout, finishRecord, lastTime, planExercise } from '@/train/workout';
import { weightInput } from '@/units/units';

/**
 * The session (K-405, prototype 2.4, B §6.5): the day's moves; the move under way with its rows — the server's next
 * target faint (K-217), last time beside it — and one tap logs the row as suggested, with the RIR picked. A rest timer
 * after each set (G1 K-49). Finishing asks whether each move's form was clean (G6 K-31). Every set and the finish are
 * records on the phone first (K-304): the session runs offline and is found again after a restart. Opened on a day, the
 * workout is kept only with its first set, and finishing before any set sends nothing: an empty workout is no session
 * (the server counts each workout as a session done, K-220).
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
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ row: string; text: string } | null>(null);
  const saving = useRef(false); // two taps at once must not log the set twice

  const refresh = useCallback(() => workoutRecords().then(setRecords), [workoutRecords]);
  useEffect(() => {
    void Promise.all([training.read(api), workoutRecords()]).then(([read, kept]) => {
      setData(read);
      setRecords(kept);
    });
  }, [api, training, workoutRecords]);

  const active = records === null ? null : activeWorkout(records);
  const program = data?.program.state === 'ready' ? data.program.value : null;
  // The workout under way decides the day; otherwise the day the session was opened on, not kept until a set is logged.
  const dayId = active === null ? (opened ?? null) : active.programDayId;
  const day = program?.days.find((d) => d.id === dayId) ?? null;
  const done = active?.sets ?? [];
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

  // The fields hold the row under way: its suggestion until the user changes it. What was typed belongs to its row, so a
  // new row starts from its own suggestion, and a problem said about one row is gone at the next.
  const rowKey = `${selected}-${plan?.current ?? 'done'}`;
  const [typed, setTyped] = useState<{ row: string; load: string; reps: string; rir: number } | null>(null);
  const entry =
    typed !== null && typed.row === rowKey
      ? typed
      : {
          row: rowKey,
          load: row === null || row.suggested.loadKg === null ? '' : weightInput(row.suggested.loadKg, units),
          reps: row === null ? '' : String(row.suggested.reps),
          rir: planned?.targetRir ?? 0,
        };
  const setEntry = (change: Partial<typeof entry>) => setTyped({ ...entry, ...change });
  const said = problem !== null && problem.row === rowKey ? problem.text : null;

  const log = async () => {
    if (saving.current || day === null || move === undefined || row === null || plan === null) return;
    const parsed = parseEntry(entry.load, entry.reps, move, units, row.suggested.loadKg);
    if (parsed === null) {
      setProblem({ row: rowKey, text: t('workout.invalid') });
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      let workoutClientId = active?.clientId;
      if (workoutClientId === undefined) {
        workoutClientId = newClientId();
        await queue.record({ kind: 'workout', body: { clientId: workoutClientId, startedAt: new Date().toISOString(), programDayId: day.id } });
      }
      await queue.record({ kind: 'set', workoutClientId, body: buildSet(newClientId(), move, row.side, parsed, entry.rir) });
      setRest(new Date().getTime());
      // The move picked is done: the next one with sets left comes up.
      if (plan.current === plan.rows.length - 1) setPicked(null);
      await refresh();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem({ row: rowKey, text: t('workout.saveFailed') });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const finish = async () => {
    if (saving.current || active === null) return;
    saving.current = true;
    setBusy(true);
    try {
      await queue.record(finishRecord(active.clientId, newClientId(), new Date(), [...unclean]));
      router.back();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem({ row: FINISH, text: t('workout.saveFailed') });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const finishProblem = problem !== null && problem.row === FINISH ? <Text style={[styles.text, { color: color.text }]}>{problem.text}</Text> : null;

  const movesDone = plans.filter((p) => p !== null && p.rows.some((r) => r.done !== null)).length;
  const worked = [...new Set(done.filter((s) => s.setType === 'WORKING').map((s) => s.exerciseId))];
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
        <SetTable plan={plan} move={move} />
        {entryBlock}
      </Card>
    );

  const finishButton = day === null ? null : <Button label={t('workout.finish')} variant="ghost" onPress={onFinish} />;
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
      {finishButton}
    </>
  );

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.cardHead}>
          <ScreenTitle>{day === null ? t('workout.title') : dayName(day)}</ScreenTitle>
          {day !== null && (
            <Text style={[styles.small, { color: color.muted }]}>{t('workout.progress', { done: movesDone, count: day.exercises.length })}</Text>
          )}
        </View>
        {data?.kept === true && <Text style={[styles.small, { color: color.muted }]}>{t('workout.kept')}</Text>}
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
