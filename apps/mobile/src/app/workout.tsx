import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProblemText, announce } from '@/components/ProblemText';
import type { components } from '@/api/schema';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import type { LocalRecord } from '@/sync/store';
import { FocusMode, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { DoneSets } from '@/train/DoneSets';
import { FinishForm } from '@/train/FinishForm';
import { GoalLine } from '@/train/GoalLine';
import { MoveDots } from '@/train/MoveDots';
import { MoveThumb } from '@/train/MoveThumb';
import { OwnMoveForm, type SaveOutcome } from '@/train/OwnMoveForm';
import { SupersetLink } from '@/train/SupersetLink';
import { nextInGroup, supersetsInForce } from '@/train/superset';
import { RestTimer } from '@/train/RestTimer';
import { SessionHeader } from '@/train/SessionHeader';
import { ActiveSet, type Entry } from '@/train/ActiveSet';
import { UpNext } from '@/train/UpNext';
import { Warmups } from '@/train/Warmups';
import { dayName, exerciseName } from '@/train/program';
import { findMoves } from '@/train/moves';
import { NOT_PAUSED, type Pause, toggle } from '@/train/pause';
import type { Skips } from '@/train/skips';
import { workoutParams } from '@/train/params';
import { repsText } from '@/train/reps';
import { buildSet, exerciseStatus, loadText, parseEntry, parseLoad, platesLine } from '@/train/session';
import { type Move, type TrainData, movesOf, ownMove } from '@/train/trainData';
import { localDay } from '@/today/today';
import { todayFor } from '@/train/week';
import { warmupSets, warmups, warmupsDone } from '@/train/warmup';
import { type ExercisePlan, NONE_SKIPPED, activeWorkout, extraPlan, finishRecord, lastTime, planExercise, sessionMoves } from '@/train/workout';

/**
 * The session (K-405, prototype 2.4, B §6.5): the day's moves; the move under way with its rows — the server's next
 * target faint (K-217), last time beside it — and one tap logs the row as suggested, with the RIR picked. A rest timer
 * after each set (G1 K-49). Finishing asks whether each move's form was clean (G6 K-31). Every set and the finish are
 * records on the phone first (K-304): the session runs offline and is found again after a restart. Opened on a day, the
 * workout is kept only with its first set, and finishing before any set sends nothing: an empty workout is no session
 * (the server counts each workout as a session done, K-220). Before a move's first work set, its warm-ups (K-417): three
 * before the day's first move, one before the others, each one tap; with the gym in use known, the plates a side.
 *
 * Laid out as a focus mode (K-971, ADR-075 #1, ADR-070 #4): always dark; End and the session's real time at the top, the
 * rest right under them, above the page so it covers nothing; the moves as dots, the move's target, its sets done and the
 * one set under way with its steppers; the button that logs it in a dock that never moves. After a move's last set no rest
 * comes up: Next names the next move, and after the last one, Finish.
 */
export default function WorkoutScreen() {
  // Light status bar text only while the session is in front: a screen opened from it (how to, history) is the
  // person's own theme and sets its own.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const statusBar = focused ? <StatusBar style="light" /> : null;
  return (
    <FocusMode>
      {statusBar}
      <Session />
    </FocusMode>
  );
}

function Session() {
  const { api, training, workoutRecords, queue, report, restAlert, healthWriting, sessionPause, sessionSkips } = useAppServices();
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
  const endRest = () => {
    setRest(null);
    void restAlert.stop();
  };
  // The session's start while nothing is kept yet: the moment it was opened, which its first set keeps as its start.
  const [openedAt] = useState(() => Date.now());
  // Pause and Resume (K-972): kept with the open workout, so it is still paused when opened again. The ref is the pause
  // as it is now, for what a save does once its awaits are over (a Pause pressed meanwhile counts).
  const [pause, setPauseState] = useState<Pause>(NOT_PAUSED);
  const pauseRef = useRef<Pause>(NOT_PAUSED);
  // What was skipped (K-972), by move: never sent, kept with the workout. `undo` puts back the last skip.
  const [skips, setSkips] = useState<Skips>({});
  const [undo, setUndo] = useState<{ said: string; skips: Skips; picked: string | null } | null>(null);
  // A session open longer than the server keeps one open (unfinished_session_close_hours, K-961) shows no time: a day-old
  // clock tells nothing. Closing or filling it in from here is K-972.
  const closeMs = workoutParams.unfinishedSessionCloseHours * 60 * 60 * 1000;
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
      .then(async ([read, mine, kept]) => {
        const open = activeWorkout(kept);
        const paused = open === null ? NOT_PAUSED : await sessionPause.read(open.clientId);
        const skipped = open === null ? {} : await sessionSkips.read(open.clientId);
        setSkips(skipped);
        setData(read);
        setOwn(mine);
        pauseRef.current = paused;
        setPauseState(paused);
        setRecords(kept);
      })
      .catch((error: unknown) => {
        named(error);
        setFailed(true);
      });
  }, [api, training, workoutRecords, named, sessionPause, sessionSkips]);

  const active = records === null ? null : activeWorkout(records);
  const startedAt = active === null ? null : Date.parse(active.startedAt);
  const stale = startedAt !== null && startedAt < openedAt - closeMs;
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
  // The session's moves (K-416): the day's plan as the week has it today (the short version, today's swaps: the server's
  // list, K-964), then the moves done in this session outside it (a swap, an extra; read back from the sets), then the
  // ones added on this screen in the order they were added — a first set does not move one ahead of the others.
  const [added, setAdded] = useState<string[]>([]);
  // The session's own day: its start's when begun on an earlier day (one begun at 23:30 stays that day's after midnight,
  // K-961); else today as the Train card reads it (the server's Program.today, the phone's day for a kept copy: todayFor),
  // so the short version and today's swaps the card shows are the session's too, travelling as well (K-995).
  const startDay = startedAt === null ? null : localDay(new Date(startedAt));
  const sessionDay = startDay !== null && startDay !== localDay(new Date(openedAt)) ? startDay : todayFor(program, data?.kept === true, new Date(openedAt));
  const today = day === null ? [] : sessionMoves(day, program?.week, sessionDay);
  const planIds = today.map((p) => p.exerciseId);
  const extraIds = [...new Set([...done.map((s) => s.exerciseId).filter((id) => !added.includes(id)), ...added])].filter(
    (id) => !planIds.includes(id) && moves.has(id),
  );
  const entries: { exerciseId: string; planned?: components['schemas']['PlannedExercise'] }[] =
    day === null ? [] : [...today.map((p) => ({ exerciseId: p.exerciseId, planned: p })), ...extraIds.map((exerciseId) => ({ exerciseId }))];
  const plans: (ExercisePlan | null)[] =
    records === null
      ? []
      : entries.map(({ exerciseId, planned }) => {
          const move = moves.get(exerciseId);
          const last = lastTime(records, exerciseId, active?.clientId ?? '');
          return move === undefined
            ? null
            : planned === undefined
              ? extraPlan(move, last, done)
              : planExercise(planned, move, last, done, skips[exerciseId] ?? NONE_SKIPPED);
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
  // After the set under way: whether a move still has sets left (the one under way, unless this is its last).
  const leftAfterThis = (id: string) =>
    id === moveId
      ? plan !== null && (plan.open === true || (plan.current ?? 0) < plan.rows.length - 1)
      : (plans[entries.findIndex((e) => e.exerciseId === id)]?.current ?? null) !== null;
  // Warm-ups come before the move's first work set; the day's first move is the one picked before any work set at all.
  const worked = [...new Set(done.filter((s) => s.setType === 'WORKING').map((s) => s.exerciseId))];
  const warming =
    move === undefined || plan === null || worked.includes(move.id)
      ? []
      : warmups(plan.rows[0]?.suggested.loadKg ?? null, move, worked.length === 0, data?.gym ?? null, units);

  // The fields hold the row under way: its suggestion until the user changes it. What was typed belongs to its row, so a
  // new row starts from its own suggestion, and a problem said about one row is gone at the next.
  const rowKey = `${moveId ?? ''}-${plan?.current ?? 'done'}`;
  const [typed, setTyped] = useState<({ row: string } & Entry) | null>(null);
  const entry =
    typed !== null && typed.row === rowKey
      ? typed
      : {
          row: rowKey,
          load: row === null || row.suggested.loadKg === null ? '' : loadText(row.suggested.loadKg, units),
          loadKg: row?.suggested.loadKg ?? null,
          reps: row === null || row.suggested.reps === null ? '' : String(row.suggested.reps),
          // A move outside the plan has no target of its own: the work sets' aim (G1 K-5, target_rir_max).
          rir: planned?.targetRir ?? workoutParams.targetRirMax,
          note: null,
        };
  const setEntry = (change: Partial<typeof entry>) => setTyped({ ...entry, ...change });
  const said = problem !== null && problem.row === rowKey ? problem.text : null;

  /** Keeps the workout on the phone with its first set, started when the session was opened (its time runs on). */
  const start = async (programDayId: string): Promise<string> => {
    const clientId = newClientId();
    await queue.record({ kind: 'workout', body: { clientId, startedAt: new Date(openedAt).toISOString(), programDayId } });
    // A pause before the first set is the session's too.
    const before = pauseRef.current;
    if (before.pausedAt !== null || before.pausedMs > 0) await sessionPause.keep(clientId, before);
    // So are the skips before it.
    if (Object.keys(skips).length > 0) await sessionSkips.keep(clientId, skips);
    return clientId;
  };

  /** Pause, or Resume: paused, the rest is over and its alert with it. Kept with the workout once there is one. */
  const keepPause = (next: Pause, workoutClientId: string | null) => {
    pauseRef.current = next;
    setPauseState(next);
    if (workoutClientId !== null) void sessionPause.keep(workoutClientId, next).catch(named);
    // Said, not only shown (K-815): the time stopping or going on is no change VoiceOver would notice.
    announce(t(next.pausedAt === null ? 'workout.resumed' : 'workout.paused'));
  };
  const togglePause = () => {
    const next = toggle(pauseRef.current, new Date().getTime());
    if (next.pausedAt !== null) endRest();
    keepPause(next, active?.clientId ?? null);
  };
  /** A set or a warm-up logged while paused: the session goes on, from the tap. */
  const goOn = () => {
    if (pauseRef.current.pausedAt !== null) keepPause(toggle(pauseRef.current, new Date().getTime()), active?.clientId ?? null);
  };

  const log = async () => {
    if (saving.current || day === null || move === undefined || row === null || plan === null) return;
    const parsed = parseEntry(entry.load, entry.reps, move, units, entry.loadKg);
    if (parsed === null) {
      setProblem({ row: rowKey, text: t('workout.invalid') });
      return;
    }
    saving.current = true;
    setBusy(true);
    goOn();
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
      // A set logged: the last skip is no longer the thing to undo.
      setUndo(null);
      // Paused while the set was being kept: no rest starts inside the pause (nor its alert).
      const resting = pauseRef.current.pausedAt === null;
      if (group === undefined) {
        // The move's last set (C4, ADR-075 #1): no rest, the move stays with Next. A move outside the plan is never done.
        if (planned !== undefined && plan.current === plan.rows.length - 1) {
          endRest();
          setPicked(move.id);
        } else if (resting) setRest(new Date().getTime());
      } else {
        // In a superset the partner comes next (a one-sided move's right side first); the rest comes after the round,
        // unless the round was the group's last.
        let roundDone = false;
        let groupDone = false;
        if (row.side !== 'LEFT') {
          const found = nextInGroup(group[1], move.id, leftAfterThis);
          roundDone = found.roundDone;
          groupDone = found.next === null;
          setPicked(found.next ?? move.id);
        }
        if (roundDone && !groupDone && resting) setRest(new Date().getTime());
        // A set inside a round ends the last round's rest: its timer goes, and its alert must not sound mid-round (K-411).
        else endRest();
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
    goOn();
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
      const end = new Date();
      await queue.record(finishRecord(active.clientId, newClientId(), end, [...unclean], sessionNote));
      // Finished, its pause is done with (the time paused goes with the finish once the contract takes it, K-998).
      void sessionPause.forget().catch(named);
      void sessionSkips.forget().catch(named);
      // What was done, against last time (K-406); a workout without a work set has nothing to show.
      if (worked.length > 0) {
        // To Apple Health too, if that switch is on (K-412); not waited for — it reports its own failure.
        void healthWriting.workoutFinished({ id: active.clientId, start: new Date(active.startedAt), end });
        router.replace({ pathname: '/workout-end', params: { workout: active.clientId } });
      } else router.back();
    } catch (error) {
      named(error);
      setProblem({ row: FINISH, text: t('workout.finishFailed') });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const finishProblem = problem !== null && problem.row === FINISH ? <ProblemText style={[styles.text, { color: color.text }]} occurrence={problem}>{problem.text}</ProblemText> : null;

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


  const name = (id: string) => exerciseName(id, moves);
  /** Skips kept with the workout once there is one; the last one can be undone. No rest goes on through a skip. */
  const keepSkips = (next: Skips) => {
    setSkips(next);
    if (active !== null) void sessionSkips.keep(active.clientId, next).catch(named);
  };
  const changeSkips = (next: Skips, said: string) => {
    setUndo({ said, skips, picked: moveId ?? null });
    keepSkips(next);
    endRest();
    // Said, not only shown (K-815).
    announce(said);
  };
  const skipThisSet = (current: number) => {
    if (moveId === undefined || row === null || plan === null) return;
    const before = skips[moveId] ?? NONE_SKIPPED;
    const set = Math.floor(current / sides);
    // The set's sides not done yet: a one-sided set skipped is both sides of it (the left kept if done).
    const sidesLeft = plan.rows.slice(set * sides, set * sides + sides).filter((r) => r.done === null && r.skipped !== true);
    changeSkips({ ...skips, [moveId]: { ...before, sets: [...before.sets, ...sidesLeft.map((r) => ({ side: r.side, set }))] } }, t('workout.setSkipped'));
    // As after a set logged: in a superset the partner comes next; else the move stays picked, and its
    // last set skipped, Next names the next one (C4).
    setPicked(group === undefined ? moveId : (nextInGroup(group[1], moveId, leftAfterThis).next ?? moveId));
  };
  const skipThisMove = () => {
    if (moveId === undefined) return;
    changeSkips({ ...skips, [moveId]: { ...(skips[moveId] ?? NONE_SKIPPED), move: true } }, t('workout.moveSkipped'));
    setPicked(nextId ?? moveId);
  };
  const bringBack = () => {
    if (moveId === undefined) return;
    keepSkips({ ...skips, [moveId]: { ...(skips[moveId] ?? NONE_SKIPPED), move: false } });
    setUndo(null);
  };
  /** The last skip taken back, and the move it was on picked again; a rest it ended does not come back. */
  const undoSkip = () => {
    if (undo === null) return;
    keepSkips(undo.skips);
    if (undo.picked !== null) setPicked(undo.picked);
    setUndo(null);
  };
  // The next move with sets left after `from`, in the session's order and round again to one left undone; -1 for none.
  const openAfter = (from: number) => {
    for (let step = 1; step < entries.length; step++) {
      const at = (from + step) % entries.length;
      if ((plans[at]?.current ?? null) !== null) return at;
    }
    return -1;
  };
  const nextAt = openAfter(selected);
  const nextId = entries[nextAt]?.exerciseId;
  const dots = (
    <MoveDots
      dots={entries.map((e, index) => {
        const status = plans[index] ?? null;
        return { id: e.exerciseId, name: name(e.exerciseId), status: status === null ? '' : exerciseStatus(status), done: status?.current === null };
      })}
      selected={selected}
      onPick={setPicked}
    />
  );

  const sides = move?.unilateral === true ? 2 : 1;
  const heading =
    plan === null || plan.current === null
      ? ''
      : plan.open === true
        ? t('workout.setNumber', { number: Math.floor(plan.current / sides) + 1 })
        : t('workout.setOf', { number: Math.floor(plan.current / sides) + 1, count: plan.rows.length / sides });
  const typedKg = row === null ? null : parseLoad(entry.load, units, entry.loadKg);
  // The one set under way (ADR-075 #1): the button that logs it is the dock's, so it never moves.
  const entryBlock =
    move === undefined || row === null ? null : (
      <ActiveSet
        move={move}
        heading={heading}
        range={planned === undefined ? null : repsText(planned.reps)}
        // A move outside the plan has no aim for reps left: there is no plan to aim at.
        aim={planned?.targetRir ?? null}
        gym={data?.gym}
        plates={typedKg === null ? null : platesLine(move, typedKg, data?.gym)}
        entry={entry}
        onChange={setEntry}
        problem={said}
        problemOccurrence={problem}
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
        partners={(group?.[1] ?? []).filter((id) => id !== moveId).map(name)}
        candidates={entries.filter((e) => e.exerciseId !== moveId && groupOf(e.exerciseId) === undefined).map((e) => ({ id: e.exerciseId, name: name(e.exerciseId) }))}
        onLink={linkWith}
        onUnlink={unlink}
      />
    );
  const warmBlock =
    move === undefined || warming.length === 0 ? null : (
      <Warmups
        move={move}
        warmups={warming}
        done={warmupsDone(warmedUp, move)}
        gym={data?.gym}
        onLog={() => void logWarmup()}
        problem={problem !== null && problem.row === warmupKey ? problem.text : null}
        problemOccurrence={problem}
        busy={busy}
      />
    );
  // The move's head (prototype `.mhead`): its picture opens how it is done, as the How to link does (one for VoiceOver).
  // Skip move (K-972): with the move's links at the top, far from Skip set in the dock. A move outside the plan has no count.
  const skipMoveLink =
    planned === undefined || moveId === undefined || plan === null || plan.current === null ? null : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('workout.skipMoveLabel', { name: name(moveId) })}
        onPress={skipThisMove}
        disabled={busy}
        style={styles.link}>
        <Text style={[styles.small, { color: color.muted }]}>{t('workout.skipMove')}</Text>
      </Pressable>
    );
  // A move skipped, opened again: it says so, and it can be brought back.
  const skippedMove = (
    <View style={[styles.undo, { backgroundColor: color.surface }]}>
      <Text style={[styles.text, styles.grow, { color: color.textSecondary }]}>{t('workout.moveIsSkipped')}</Text>
      <Button label={t('workout.bringBack')} variant="ghost" size="sm" onPress={bringBack} />
    </View>
  );
  const head =
    moveId === undefined ? null : (
      <View testID="move-head" style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('demo.openLabel', { exercise: name(moveId) })}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => router.push({ pathname: '/exercise', params: { exercise: moveId } })}>
          <MoveThumb equipment={move?.equipment} />
        </Pressable>
        <View style={styles.grow}>
          <Text style={[styles.name, { color: color.text }]}>{name(moveId)}</Text>
          <View style={styles.links}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('demo.openLabel', { exercise: name(moveId) })}
              onPress={() => router.push({ pathname: '/exercise', params: { exercise: moveId } })}
              style={styles.link}>
              <Text style={[styles.small, { color: color.accent }]}>{t('demo.open')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('history.openLabel', { exercise: name(moveId) })}
              onPress={() => router.push({ pathname: '/exercise-history', params: { exercise: moveId } })}
              style={styles.link}>
              <Text style={[styles.small, { color: color.accent }]}>{t('history.open')}</Text>
            </Pressable>
            {/* With the move's other links, not between the target and the set (K-971). */}
            {supersetBlock}
            {skipMoveLink}
          </View>
        </View>
      </View>
    );
  const card =
    moveId === undefined ? null : move === undefined || plan === null ? (
      <Card>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('workout.unknownMove')}</Text>
      </Card>
    ) : (
      <>
        {/* The prototype's order (K-971): the target, the sets done, then the one under way, its warm-ups folded above it. */}
        {planned !== undefined && <GoalLine planned={planned} move={move} />}
        <DoneSets plan={plan} move={move} />
        {plan.skippedMove === true ? skippedMove : null}
        {warmBlock}
        {entryBlock}
      </>
    );
  // In a superset the move after this set is its partner (the round's order), else the next move of the day with sets left.
  const partner = group === undefined || moveId === undefined ? null : nextInGroup(group[1], moveId, leftAfterThis).next;
  const upNextId = partner !== null && partner !== moveId ? partner : nextId;
  const upNext =
    upNextId === undefined || row === null ? null : <UpNext name={name(upNextId)} equipment={moves.get(upNextId)?.equipment} />;

  // The dock (ADR-075 #1): one place for the one thing to do now, so the button never moves. The set under way; the
  // move done, the next one with sets left; nothing left, the finish.
  const logLabel =
    row === null
      ? ''
      : row.side === 'BOTH'
        ? t('workout.log', { number: Math.floor((plan?.current ?? 0) / sides) + 1 })
        : t('workout.logSide', { number: Math.floor((plan?.current ?? 0) / sides) + 1, side: t(`workout.sideName.${row.side}`) });
  // Skip set (K-972): under Log set in the dock, far from Skip move at the top; a move outside the plan has no count.
  const skipSetLink =
    planned === undefined || row === null || plan === null || plan.current === null ? null : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('workout.skipSetLabel')}
        onPress={() => skipThisSet(plan.current ?? 0)}
        disabled={busy}
        style={styles.link}>
        <Text style={[styles.small, { color: color.muted }]}>{t('workout.skipSet')}</Text>
      </Pressable>
    );
  const dockButton =
    finishing ? null : move !== undefined && row !== null ? (
      <>
        <Button label={logLabel} onPress={() => void log()} disabled={busy} />
        {skipSetLink}
      </>
    ) : nextId !== undefined ? (
      <Button label={t('workout.next', { name: name(nextId) })} onPress={() => setPicked(nextId)} />
    ) : day === null && active === null ? null : (
      <Button label={t('workout.finish')} onPress={onFinish} />
    );
  // The last skip, said, with its Undo (K-972): in the page, so nothing in the dock moves.
  const undoBar =
    undo === null ? null : (
      <View style={[styles.undo, { backgroundColor: color.surface }]}>
        <Text style={[styles.text, styles.grow, { color: color.text }]}>{undo.said}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('workout.undoLabel')} onPress={undoSkip} style={styles.link}>
          <Text style={[styles.text, { color: color.accent }]}>{t('workout.undo')}</Text>
        </Pressable>
      </View>
    );
  // The day and how far into it, under the time: off the page, so the set under way has its room (K-971).
  const dayLine = (
    <View style={styles.dayLine}>
      <Text style={[styles.small, { color: color.textSecondary }]}>{day === null ? t('workout.title') : dayName(day)}</Text>
      {day !== null && (
        <Text style={[styles.small, { color: color.muted }]}>
          {today.length === 1 ? t('workout.progressOne', { done: movesDone }) : t('workout.progress', { done: movesDone, count: today.length })}
        </Text>
      )}
    </View>
  );
  // Paused (K-972, prototype `.pausebar`): said in the rest's place, with the way back.
  // Only what it is: the one Resume is the header's (a full touch target, one label).
  const pausedBar = (
    <View style={[styles.pausedBar, { backgroundColor: color.surface }]}>
      <Text style={[styles.text, styles.grow, { color: color.text }]}>{t('workout.paused')}</Text>
    </View>
  );
  const dock =
    dockButton === null ? null : (
      <View testID="dock" style={[styles.dock, { borderTopColor: color.line }]}>
        {dockButton}
      </View>
    );
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
      {entries.length > 0 && dots}
      {undoBar}
      {head}
      {card}
      {upNext}
      {addPanel}
      {dayGone}
      {finishProblem}
    </>
  );

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      {/* The page and the dock rise above the keyboard (a number pad has no return key): Log set stays in reach. */}
      <KeyboardAvoidingView testID="keyboard-avoiding" style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <SessionHeader since={stale ? null : (startedAt ?? openedAt)} onEnd={onFinish} pause={pause} onPause={togglePause} subtitle={dayLine} />
          {/* Its place is kept with no rest in it, so the page under it does not move when one starts. */}
          <View testID="rest-slot" style={styles.restSlot}>
            {pause.pausedAt !== null ? pausedBar : rest !== null && <RestTimer since={rest} onEnd={endRest} />}
          </View>
        </View>
        <ScrollView testID="session-scroll" contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {data?.kept === true && <Text style={[styles.small, { color: color.muted }]}>{t('workout.kept')}</Text>}
          {loadFailed}
          {finishing ? form : session}
        </ScrollView>
        {dock}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The finish's own key for a problem: not a row of any move. */
const FINISH = 'finish';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: { paddingHorizontal: tokens.space.lg, gap: tokens.space.xs },
  pausedBar: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  restSlot: { minHeight: tokens.size.touch + tokens.space.sm * 2, justifyContent: 'center' },
  body: { padding: tokens.space.lg, gap: tokens.space.sm },
  dock: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, borderTopWidth: tokens.border.hairline, alignItems: 'stretch' },
  undo: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  list: { gap: tokens.space.xs },
  dayLine: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: tokens.space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: tokens.space.lg },
  link: { minHeight: tokens.size.touch, justifyContent: 'center' },
  move: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.button },
  grow: { flex: 1 },
  name: { fontFamily: tokens.font.display, fontSize: tokens.type.heading },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
