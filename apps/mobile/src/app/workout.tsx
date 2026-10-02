import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import type { LocalRecord } from '@/sync/store';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { FinishForm } from '@/train/FinishForm';
import { OwnMoveForm, type SaveOutcome } from '@/train/OwnMoveForm';
import { SupersetLink } from '@/train/SupersetLink';
import { nextInGroup, supersetsInForce } from '@/train/superset';
import { RestTimer } from '@/train/RestTimer';
import { SetEntry } from '@/train/SetEntry';
import { SetTable } from '@/train/SetTable';
import { Warmups } from '@/train/Warmups';
import { dayName, exerciseName } from '@/train/program';
import { findMoves } from '@/train/moves';
import { workoutParams } from '@/train/params';
import { buildSet, exerciseStatus, parseEntry, parseLoad, platesLine } from '@/train/session';
import { type Move, type TrainData, movesOf, ownMove } from '@/train/trainData';
import { warmupSets, warmups, warmupsDone } from '@/train/warmup';
import { type ExercisePlan, activeWorkout, extraPlan, finishRecord, lastTime, planExercise } from '@/train/workout';
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
  const { api, training, workoutRecords, queue, report, restAlert } = useAppServices();
  const { day: opened } = useLocalSearchParams<{ day?: string }>();
  const units = useUnits();
  const { color } = useTheme();
  const [data, setData] = useState<TrainData | null>(null);
  const [own, setOwn] = useState<Move[]>([]);
  const [records, setRecords] = useState<LocalRecord[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [rest, setRest] = useState<number | null>(null);
  // The rest's voice in the background (K-411): set when a rest starts, moved by the next, gone when the session is left.
  useEffect(() => {
    if (rest !== null) void restAlert.start(rest);
  }, [rest, restAlert]);
  useEffect(() => () => void restAlert.stop(), [restAlert]);
  const [finishing, setFinishing] = useState(false);
  const [unclean, setUnclean] = useState<Set<string>>(() => new Set());
  const [sessionNote, setSessionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ row: string; text: string } | null>(null);
  // Two taps in one frame, before `busy` disables the button, must not log the set twice.
  const saving = useRef(false);
  const [failed, setFailed] = useState(false);
  // The "Add a move" search: null while closed, what is typed while open.
  const [adding, setAdding] = useState<string | null>(null);
  // Supersets (K-416, ADR-035): the ones read back from the sets, those made here before a set (by id), those undone.
  const [formed, setFormed] = useState<Map<string, string[]>>(() => new Map());
  const [unlinked, setUnlinked] = useState<string[]>([]);
  // Creating the user's own move from the search (K-416): the name it started from, null while not creating.
  const [creating, setCreating] = useState<string | null>(null);

  const named = useCallback((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }), [report]);
  // A failed read back is not a failed save: the set is kept; the screen catches up at the next read.
  const refresh = useCallback(() => workoutRecords().then(setRecords).catch(named), [workoutRecords, named]);
  useEffect(() => {
    void Promise.all([training.read(api), training.own(api), workoutRecords()])
      .then(([read, mine, kept]) => {
        setData(read);
        setOwn(mine);
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
  const moves = useMemo(() => movesOf(data, own), [data, own]);
  // The session's moves (K-416): the day's plan, then the moves done in this session outside it (a swap, an extra; read
  // back from the sets), then the ones added on this screen in the order they were added — a first set does not move
  // one ahead of the others.
  const [added, setAdded] = useState<string[]>([]);
  const planIds = day?.exercises.map((p) => p.exerciseId) ?? [];
  const extraIds = [...new Set([...done.map((s) => s.exerciseId).filter((id) => !added.includes(id)), ...added])].filter(
    (id) => !planIds.includes(id) && moves.has(id),
  );
  const entries: { exerciseId: string; planned?: components['schemas']['PlannedExercise'] }[] =
    day === null ? [] : [...day.exercises.map((p) => ({ exerciseId: p.exerciseId, planned: p })), ...extraIds.map((exerciseId) => ({ exerciseId }))];
  const plans: (ExercisePlan | null)[] =
    records === null
      ? []
      : entries.map(({ exerciseId, planned }) => {
          const move = moves.get(exerciseId);
          const last = lastTime(records, exerciseId, active?.clientId ?? '');
          return move === undefined ? null : planned === undefined ? extraPlan(move, last, done) : planExercise(planned, move, last, done);
        });
  const firstOpen = plans.findIndex((plan) => plan !== null && plan.current !== null);
  // The move picked, by its id: the list can grow or change order under it.
  const pickedAt = entries.findIndex((e) => e.exerciseId === picked);
  const selected = pickedAt >= 0 ? pickedAt : firstOpen < 0 ? 0 : firstOpen;
  const plan = plans[selected] ?? null;
  const entry_ = entries[selected];
  const planned = entry_?.planned;
  const moveId = entry_?.exerciseId;
  const move = moveId === undefined ? undefined : moves.get(moveId);
  const row = plan === null || plan.current === null ? null : plan.rows[plan.current];
  // A superset is two moves or more, in the order its round was started: those whose last work set carries its id, then
  // the ones linked here with no set in it yet. Unlinked, the next set has no id and the move is out, opened again too.
  const inForce = supersetsInForce(done.filter((s) => s.setType === 'WORKING'));
  const groups = [...new Set([...inForce.keys(), ...formed.keys()])]
    .map((id): [string, string[]] => {
      const started = inForce.get(id) ?? [];
      return [id, [...started, ...(formed.get(id) ?? []).filter((m) => !started.includes(m))]];
    })
    .filter(([id, members]) => members.length > 1 && !unlinked.includes(id));
  const groupOf = (id: string | undefined) => groups.find(([, members]) => id !== undefined && members.includes(id));
  const group = groupOf(moveId);
  // Warm-ups come before the move's first work set; the day's first move is the one picked before any work set at all.
  const worked = [...new Set(done.filter((s) => s.setType === 'WORKING').map((s) => s.exerciseId))];
  const warming =
    move === undefined || plan === null || worked.includes(move.id)
      ? []
      : warmups(plan.rows[0]?.suggested.loadKg ?? null, move, worked.length === 0, data?.gym ?? null, units);

  // The fields hold the row under way: its suggestion until the user changes it. What was typed belongs to its row, so a
  // new row starts from its own suggestion, and a problem said about one row is gone at the next.
  const rowKey = `${moveId ?? ''}-${plan?.current ?? 'done'}`;
  const [typed, setTyped] = useState<{ row: string; load: string; reps: string; rir: number; note: string | null } | null>(null);
  const entry =
    typed !== null && typed.row === rowKey
      ? typed
      : {
          row: rowKey,
          load: row === null || row.suggested.loadKg === null ? '' : weightInput(row.suggested.loadKg, units),
          reps: row === null || row.suggested.reps === null ? '' : String(row.suggested.reps),
          // A move outside the plan has no target of its own: the work sets' aim (G1 K-5, target_rir_max).
          rir: planned?.targetRir ?? workoutParams.targetRirMax,
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
      const body = buildSet(newClientId(), move, row.side, parsed, entry.rir, entry.note ?? undefined, group?.[0]);
      await queue.record({ kind: 'set', workoutClientId, body });
      saved = true;
    } catch (error) {
      named(error);
      setProblem({ row: rowKey, text: t('workout.saveFailed') });
    }
    if (saved) {
      if (group === undefined) {
        setRest(new Date().getTime());
        // The move picked is done: the next one with sets left comes up. A move outside the plan is never done (no count).
        if (planned !== undefined && plan.current === plan.rows.length - 1) setPicked(null);
      } else {
        // In a superset the partner comes next (a one-sided move's right side first); the rest comes after the round.
        let roundDone = false;
        if (row.side !== 'LEFT') {
          const left = (id: string) =>
            id === move.id ? plan.open === true || (plan.current ?? 0) < plan.rows.length - 1 : (plans[entries.findIndex((e) => e.exerciseId === id)]?.current ?? null) !== null;
          const found = nextInGroup(group[1], move.id, left);
          roundDone = found.roundDone;
          setPicked(found.next);
        }
        if (roundDone) setRest(new Date().getTime());
        else {
          // A set inside a round ends the last round's rest: its timer goes, and its alert must not sound mid-round (K-411).
          setRest(null);
          void restAlert.stop();
        }
      }
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

  // Progress is the plan's: a move outside it is not one of the day's count.
  const movesDone = plans.filter((p, i) => entries[i]?.planned !== undefined && p !== null && p.rows.some((r) => r.done !== null)).length;
  // Nothing kept yet: close and send nothing. A workout kept without a working set: finish it, there is nothing to ask.
  const onFinish = () => {
    if (active === null) router.back();
    else if (worked.length === 0) void finish();
    else setFinishing(true);
  };

  // Adding a move outside the plan (K-416): found in the catalog by name or alias, on the phone (offline too).
  const addMove = (id: string) => {
    setAdded((before) => (before.includes(id) ? before : [...before, id]));
    setPicked(id);
    setAdding(null);
    setCreating(null);
  };
  // Saved online (ADR-035): kept on the phone from the server's answer at once, so it is there offline later; then the
  // own moves read again.
  const saveOwn = async (body: components['schemas']['NewCustomExercise']): Promise<SaveOutcome> => {
    try {
      const { data: kept, error } = await api.POST('/v1/custom-exercises', { body });
      if (kept === undefined) {
        report({ name: error?.code ?? 'Unknown' }); // the limit or a rule: the code only, never the name typed
        return 'refused';
      }
      await training.saved(kept);
      const mine = await training.own(api);
      setOwn(mine.some((m) => m.id === kept.id) ? mine : [...mine, ownMove(kept)]);
      addMove(kept.id);
      return 'saved';
    } catch (error) {
      named(error);
      return 'offline';
    }
  };
  const found = adding === null ? [] : findMoves(adding, [...moves.values()], new Set(entries.map((e) => e.exerciseId)));
  const addNote =
    adding !== null && adding.trim() !== '' && found.length === 0 ? (
      <Text style={[styles.small, { color: color.muted }]}>{t('workout.add.none')}</Text>
    ) : null;
  const inSession = new Set(entries.map((e) => e.exerciseId));
  const typedName = adding?.trim() ?? '';
  const createButton =
    typedName === '' ? null : <Button label={t('workout.add.create', { name: typedName })} variant="ghost" size="sm" onPress={() => setCreating(typedName)} />;
  const addPanel =
    day === null ? null : creating !== null ? (
      <OwnMoveForm
        name={creating}
        catalog={[...moves.values()].filter((m) => !inSession.has(m.id))}
        onPick={addMove}
        onSave={saveOwn}
        onBack={() => setCreating(null)}
      />
    ) : adding === null ? (
      <Button label={t('workout.add.open')} variant="ghost" size="sm" onPress={() => setAdding('')} />
    ) : (
      <View style={styles.list}>
        <TextField label={t('workout.add.search')} value={adding} onChangeText={setAdding} onSearch={() => undefined} /* live search: the key only closes the keyboard */ />
        {found.map((m) => (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={t('workout.add.pick', { name: exerciseName(m.id, moves) })}
            onPress={() => addMove(m.id)}
            style={styles.move}>
            <Text style={[styles.text, { color: color.text }]}>{exerciseName(m.id, moves)}</Text>
          </Pressable>
        ))}
        {addNote}
        {createButton}
        <Button label={t('workout.add.close')} variant="ghost" size="sm" onPress={() => setAdding(null)} />
      </View>
    );

  const list = (
    <View style={styles.list}>
      {entries.map((p, index) => {
        const status = plans[index];
        const on = index === selected;
        return (
          <Pressable
            key={`${p.exerciseId}-${index}`}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => setPicked(p.exerciseId)}
            style={[styles.move, on && { backgroundColor: color.surface }]}>
            <Text style={[styles.text, styles.grow, { color: status?.current === null ? color.muted : color.text }]}>
              {exerciseName(p.exerciseId, moves)}
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
  const linkWith = (partner: string) => {
    if (moveId !== undefined) setFormed((before) => new Map([...before, [newClientId(), [moveId, partner]]]));
  };
  const unlink = () => {
    if (group !== undefined) setUnlinked((before) => [...before, group[0]]);
  };
  const supersetBlock =
    moveId === undefined ? null : (
      <SupersetLink
        partners={(group?.[1] ?? []).filter((id) => id !== moveId).map((id) => exerciseName(id, moves))}
        candidates={entries.filter((e) => e.exerciseId !== moveId && groupOf(e.exerciseId) === undefined).map((e) => ({ id: e.exerciseId, name: exerciseName(e.exerciseId, moves) }))}
        onLink={linkWith}
        onUnlink={unlink}
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
  // A move outside the plan has no target RIR line: there is no plan to aim at.
  const targetLine =
    planned === undefined ? null : <Text style={[styles.small, { color: color.muted }]}>{t('workout.targetRir', { max: planned.targetRir })}</Text>;
  const card =
    moveId === undefined ? null : move === undefined || plan === null ? (
      <Card>
        <Text style={[styles.heading, { color: color.text }]}>{exerciseName(moveId, moves)}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('workout.unknownMove')}</Text>
      </Card>
    ) : (
      <Card>
        <View style={styles.cardHead}>
          <Text style={[styles.heading, styles.grow, { color: color.text }]}>{exerciseName(moveId, moves)}</Text>
          {targetLine}
        </View>
        <View style={styles.links}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('history.openLabel', { exercise: exerciseName(moveId, moves) })}
            onPress={() => router.push({ pathname: '/exercise-history', params: { exercise: moveId } })}>
            <Text style={[styles.small, { color: color.accent }]}>{t('history.open')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('demo.openLabel', { exercise: exerciseName(moveId, moves) })}
            onPress={() => router.push({ pathname: '/exercise', params: { exercise: moveId } })}>
            <Text style={[styles.small, { color: color.accent }]}>{t('demo.open')}</Text>
          </Pressable>
        </View>
        {supersetBlock}
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
        named={moves}
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
      {addPanel}
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
  links: { flexDirection: 'row', gap: tokens.space.lg },
  move: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.button },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.sm },
  grow: { flex: 1 },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
