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
import { NoAnswer } from '@/sync/queue';
import { newClientId } from '@/sync/send';
import type { LocalRecord } from '@/sync/store';
import { FocusMode, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { DoneSets } from '@/train/DoneSets';
import { EditSet } from '@/train/EditSet';
import { EndSheet } from '@/train/EndSheet';
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
import { NOT_PAUSED, type Pause, pausedFor, toggle } from '@/train/pause';
import type { Skips } from '@/train/skips';
import { type Swaps, applySwaps, swapChoices } from '@/train/sessionSwaps';
import { SwapSheet } from '@/train/SwapSheet';
import { workoutParams } from '@/train/params';
import { repsText } from '@/train/reps';
import { buildSet, exerciseStatus, loadText, parseEntry, parseLoad, platesLine } from '@/train/session';
import { type Move, type TrainData, movesOf, ownMove } from '@/train/trainData';
import { localDay } from '@/today/today';
import { todayFor } from '@/train/week';
import { warmupSets, warmups, warmupsDone } from '@/train/warmup';
import { type ExercisePlan, NONE_SKIPPED, activeWorkout, extraPlan, finishRecord, lastTime, openTooLong, planExercise, sessionMoves } from '@/train/workout';

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
  const { api, training, workoutRecords, workoutEdits, queue, report, restAlert, healthWriting, sessionPause, sessionSkips, sessionSwaps } = useAppServices();
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
  // The moves swapped in this session (K-972, ADR-073 #6): for this workout only, never sent, kept with it. The sheet is open
  // while `swapping`.
  const [swaps, setSwaps] = useState<Swaps>({});
  const [swapping, setSwapping] = useState(false);
  // The last skip, swap or delete, said, and how to take it back (K-972).
  const [undo, setUndo] = useState<{ said: string; run: () => void } | null>(null);
  // A set done being corrected (K-972): the set and its number as shown.
  const [editing, setEditing] = useState<{ set: components['schemas']['NewSet']; number: string } | null>(null);
  // A session open longer than the server keeps one open (unfinished_session_close_hours, K-961) shows no time: a day-old
  // clock tells nothing. It can only be finished or discarded (K-972): the server closed it, nothing is left to fill in later.
  const [finishing, setFinishing] = useState(false);
  // End's three ways out (K-972); a workout just discarded, kept on the screen for Undo.
  const [ending, setEnding] = useState(false);
  const [discarded, setDiscarded] = useState<{
    startedAt: string;
    programDayId: string | null;
    sets: components['schemas']['NewSet'][];
    pause: Pause;
    skips: Skips;
    swaps: Swaps;
    /** The ids it comes back under, made once: an Undo that failed half way and is tried again adds nothing twice. */
    back: { workout: string; sets: string[] };
  } | null>(null);
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
  // The workout under way. Opened on a day to start it, one left open past the server's close is not under way: it is
  // closed there, and would hold the screen on a day gone (K-972); opened to continue, it is shown so it can be ended.
  const underWay = useCallback((kept: LocalRecord[]) => activeWorkout(kept, opened === undefined ? undefined : openedAt), [opened, openedAt]);
  useEffect(() => {
    void Promise.all([training.read(api), training.own(api), workoutRecords()])
      .then(async ([read, mine, kept]) => {
        const open = underWay(kept);
        const paused = open === null ? NOT_PAUSED : await sessionPause.read(open.clientId);
        const skipped = open === null ? {} : await sessionSkips.read(open.clientId);
        setSkips(skipped);
        setSwaps(open === null ? {} : await sessionSwaps.read(open.clientId));
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
  }, [api, training, workoutRecords, named, sessionPause, sessionSkips, sessionSwaps, underWay]);

  const active = records === null ? null : underWay(records);
  const startedAt = active === null ? null : Date.parse(active.startedAt);
  const stale = active !== null && openTooLong(active.startedAt, openedAt);
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
  // The moves swapped in this session in place (K-972); `today` stays the plan they were swapped from.
  const shown = applySwaps(today, swaps);
  const planIds = shown.map((p) => p.exerciseId);
  const extraIds = [...new Set([...done.map((s) => s.exerciseId).filter((id) => !added.includes(id)), ...added])].filter(
    (id) => !planIds.includes(id) && moves.has(id),
  );
  const entries: { exerciseId: string; planned?: components['schemas']['PlannedExercise']; base?: components['schemas']['PlannedExercise'] }[] =
    day === null ? [] : [...shown.map((p, i) => ({ exerciseId: p.exerciseId, planned: p, base: today[i] })), ...extraIds.map((exerciseId) => ({ exerciseId }))];
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
  const base = entry_?.base;
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
    // And the swaps before it.
    if (Object.keys(swaps).length > 0) await sessionSwaps.keep(clientId, swaps);
    return clientId;
  };

  /** Pause, or Resume: paused, the rest is over and its alert with it. Kept with the workout once there is one. */
  const holdPause = (next: Pause, workoutClientId: string | null) => {
    pauseRef.current = next;
    setPauseState(next);
    if (workoutClientId !== null) void sessionPause.keep(workoutClientId, next).catch(named);
  };
  const keepPause = (next: Pause, workoutClientId: string | null) => {
    holdPause(next, workoutClientId);
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
      const workoutClientId = active?.clientId ?? underWay(await workoutRecords())?.clientId ?? (await start(day.id));
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
      // A set logged: the last skip is no longer the thing to undo, and a set being corrected is left as it was.
      setUndo(null);
      setEditing(null);
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
      const workoutClientId = active?.clientId ?? underWay(await workoutRecords())?.clientId ?? null;
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
      // The time paused (K-998), within the session's length: the summary's minutes and Health's are the active time.
      const lengthMs = Math.max(0, end.getTime() - Date.parse(active.startedAt));
      const pausedMs = Math.min(lengthMs, pausedFor(pauseRef.current, end.getTime()));
      await queue.record(finishRecord(active.clientId, newClientId(), end, [...unclean], sessionNote, Math.floor(pausedMs / 1000)));
      // Finished, its pause, skips and swaps are done with (the time paused went with the finish, K-998).
      void sessionPause.forget().catch(named);
      void sessionSkips.forget().catch(named);
      void sessionSwaps.forget().catch(named);
      // What was done, against last time (K-406); a workout without a work set has nothing to show.
      if (worked.length > 0) {
        // To Apple Health too, if that switch is on (K-412); not waited for — it reports its own failure.
        // Written from its start for its active length: the library's save takes no pauses (installed types). Paused
        // for all of it, there is no workout to write.
        if (lengthMs > pausedMs) {
          void healthWriting.workoutFinished({ id: active.clientId, start: new Date(active.startedAt), end: new Date(end.getTime() - pausedMs) });
        }
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
    setEnding(false);
    if (active === null) router.back();
    else if (worked.length === 0) void finish();
    else setFinishing(true);
  };
  // End (K-972): with nothing kept there is nothing to choose; else the three ways out.
  const onEnd = () => {
    setSwapping(false);
    if (active === null) router.back();
    else setEnding(true);
  };
  /**
   * Left open (ADR-075 #5, K-961): it counts for its week, Continue opens it again, the server closes it after
   * unfinished_session_close_hours. Left, it is paused: the hours away are not training time, whether the next set goes
   * on from where it stopped (goOn) or the finish comes with no set (the pause under way is counted to it).
   */
  const later = () => {
    if (active !== null && pauseRef.current.pausedAt === null) holdPause(toggle(pauseRef.current, new Date().getTime()), active.clientId);
    endRest();
    announce(t('workout.ending.laterSaid', { hours: workoutParams.unfinishedSessionCloseHours }));
    router.back();
  };
  /**
   * Discarded (ADR-075 #5, K-998): nothing is saved. Once the server has it, it is deleted there first (offline then,
   * it says a connection is needed and keeps it); then the phone's records of it go, with its pause, skips and swaps. What it
   * held stays on the screen to bring back with Undo, as a new workout from the same start.
   */
  const discard = async () => {
    if (saving.current || active === null) return;
    saving.current = true;
    setBusy(true);
    const gone = {
      startedAt: active.startedAt,
      programDayId: active.programDayId,
      sets: active.sets,
      pause: pauseRef.current,
      skips,
      swaps,
      back: { workout: newClientId(), sets: active.sets.map(() => newClientId()) },
    };
    try {
      // On the server first once it may be there, with no send meanwhile (setEdits.discard).
      await workoutEdits.discard(active.clientId);
      void sessionPause.forget().catch(named);
      void sessionSkips.forget().catch(named);
      void sessionSwaps.forget().catch(named);
      endRest();
      setHeld([]);
      setEnding(false);
      setDiscarded(gone);
      setProblem(null);
      // Said, not only shown (K-815): the screen changes under VoiceOver's finger.
      announce(t('workout.ending.discarded'));
    } catch (error) {
      named(error);
      const offline = error instanceof TypeError || error instanceof NoAnswer;
      setProblem({ row: DISCARD, text: t(offline ? 'workout.ending.offline' : 'workout.ending.failed') });
    }
    await refresh();
    saving.current = false;
    setBusy(false);
  };
  /**
   * The discarded workout back, as a new one from the same start: its sets, its pause, its skips and its swaps. Under the ids made
   * when it was discarded, so a try that failed half way and is tried again keeps what it had and adds the rest: the
   * queue saves a clientId once. A failure is said, and Undo stays to try again.
   */
  const undoDiscard = async () => {
    if (discarded === null || saving.current) return;
    saving.current = true;
    const { back } = discarded;
    try {
      await queue.record({
        kind: 'workout',
        body: { clientId: back.workout, startedAt: discarded.startedAt, ...(discarded.programDayId === null ? {} : { programDayId: discarded.programDayId }) },
      });
      for (const [index, set] of discarded.sets.entries()) {
        await queue.record({ kind: 'set', workoutClientId: back.workout, body: { ...set, clientId: back.sets[index] } });
      }
      if (discarded.pause.pausedAt !== null || discarded.pause.pausedMs > 0) await sessionPause.keep(back.workout, discarded.pause);
      if (Object.keys(discarded.skips).length > 0) await sessionSkips.keep(back.workout, discarded.skips);
      if (Object.keys(discarded.swaps).length > 0) await sessionSwaps.keep(back.workout, discarded.swaps);
      setDiscarded(null);
      setProblem(null);
    } catch (error) {
      named(error);
      setProblem({ row: UNDO, text: t('workout.undoFailed') });
    }
    await refresh();
    saving.current = false;
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
    const before = skips;
    const picked = moveId ?? null;
    setUndo({
      said,
      run: () => {
        keepSkips(before);
        if (picked !== null) setPicked(picked);
      },
    });
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
  /** The last skip or delete taken back (a skip: the move it was on picked again; a rest it ended does not come back). */
  const undoLast = () => {
    const run = undo?.run;
    setUndo(null);
    run?.();
  };

  /**
   * Swap (K-972, ADR-073 #6, ADR-075 #5): inside the workout it is the workout's own, for today only, and never asked of the
   * server (it refuses a swap for a day whose workout has started, ADR-073 Ek 3). The new move takes the planned one's place
   * with its sets, range and aim and no target of its own (applySwaps); the planned move again undoes it. What was done of
   * the old move stays on it. Kept with the workout once there is one; the last swap can be undone, until a set is logged.
   */
  const keepSwaps = (next: Swaps) => {
    setSwaps(next);
    if (active !== null) void sessionSwaps.keep(active.clientId, next).catch(named);
  };
  const swapOptions =
    base === undefined || moveId === undefined || plan === null || plan.current === null
      ? []
      : swapChoices(base, moveId, inSession, (id) => moves.has(id)).map((id) => ({
          id,
          name: name(id),
          equipment: moves.get(id)?.equipment,
          back: id === base.exerciseId,
        }));
  const swapTo = (to: string) => {
    if (base === undefined || moveId === undefined) return;
    const before = swaps;
    // Swapped by the move the session started with: the planned move again is no swap.
    const next = Object.fromEntries(Object.entries(swaps).filter(([id]) => id !== base.exerciseId));
    const back = to === base.exerciseId;
    const said = t(back ? 'workout.swappedBack' : 'workout.swapped', { name: name(to) });
    setUndo({
      said,
      run: () => {
        keepSwaps(before);
        setPicked(moveId);
      },
    });
    keepSwaps(back ? next : { ...next, [base.exerciseId]: to });
    endRest();
    setPicked(to);
    setSwapping(false);
    // Said, not only shown (K-815).
    announce(said);
  };

  /**
   * A set done corrected (`next`) or deleted (null), K-972: never sent, in its place; else on the server first and
   * then here, in its old place (setEdits.ts). Offline then, it says a connection is needed and nothing changes. A
   * delete is said, and can be undone.
   */
  const changeSet = async (set: components['schemas']['NewSet'], next: { loadKg: number; reps: number } | null) => {
    if (saving.current || active === null) return;
    saving.current = true;
    setBusy(true);
    try {
      const gone = await workoutEdits.change(set.clientId, next === null ? null : { ...set, ...next });
      if (next === null && gone !== null) {
        announce(t('workout.setDeleted'));
        setUndo({ said: t('workout.setDeleted'), run: () => void restoreSet(gone) });
      }
      setEditing(null);
      setProblem((said) => (said?.row === EDIT ? null : said));
    } catch (error) {
      named(error);
      const offline = error instanceof TypeError || error instanceof NoAnswer;
      setProblem({ row: EDIT, text: t(offline ? 'workout.edit.offline' : 'workout.edit.failed') });
    }
    await refresh();
    saving.current = false;
    setBusy(false);
  };
  /** A set deleted, back in its place; a failure is said, and its Undo stays to try again. */
  const restoreSet = async (gone: LocalRecord) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await workoutEdits.restore(gone);
    } catch (error) {
      named(error);
      announce(t('workout.undoFailed'));
      setUndo({ said: t('workout.undoFailed'), run: () => void restoreSet(gone) });
    }
    await refresh();
    saving.current = false;
    setBusy(false);
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
      onPick={(id) => {
        setPicked(id);
        setEditing(null);
      }}
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
  // Swap (K-972): with the move's links; only a move of the plan with sets left, and where the server's list has another to offer.
  const swapLink =
    swapOptions.length === 0 || moveId === undefined ? null : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('swap.label', { move: name(moveId) })}
        onPress={() => setSwapping(true)}
        disabled={busy}
        style={styles.link}>
        <Text style={[styles.small, { color: color.accent }]}>{t('workout.swap')}</Text>
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
            {swapLink}
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
        <DoneSets plan={plan} move={move} onEdit={(set, number) => setEditing({ set, number })} />
        {plan.skippedMove === true ? skippedMove : null}
        {/* Only on its own move, with its own move's load (a dot tapped meanwhile closes it). */}
        {editing === null || editing.set.exerciseId !== move.id ? null : (
          <EditSet
            key={editing.set.clientId}
            move={move}
            set={editing.set}
            number={editing.number}
            gym={data?.gym}
            onSave={(loadKg, reps) => void changeSet(editing.set, { loadKg, reps })}
            onDelete={() => void changeSet(editing.set, null)}
            onClose={() => setEditing(null)}
            problem={problem !== null && problem.row === EDIT ? problem.text : null}
            problemOccurrence={problem}
            busy={busy}
          />
        )}
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
        <Pressable accessibilityRole="button" accessibilityLabel={t('workout.undoLabel')} onPress={undoLast} style={styles.link}>
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
  const endSheet = (
    <EndSheet
      onFinish={onFinish}
      onLater={stale ? null : later}
      onDiscard={() => void discard()}
      onBack={() => setEnding(false)}
      problem={problem !== null && problem.row === DISCARD ? problem.text : null}
      problemOccurrence={problem}
      busy={busy}
    />
  );
  const discardedPanel = (
    <View style={[styles.discarded, { backgroundColor: color.surface }]}>
      <Text style={[styles.text, { color: color.text }]}>{t('workout.ending.discarded')}</Text>
      {problem !== null && problem.row === UNDO && (
        <ProblemText style={[styles.text, { color: color.text }]} occurrence={problem}>
          {problem.text}
        </ProblemText>
      )}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('workout.undoLabel')} onPress={() => void undoDiscard()} style={styles.link}>
          <Text style={[styles.text, { color: color.accent }]}>{t('workout.undo')}</Text>
        </Pressable>
        <Button label={t('workout.ending.close')} variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
  const swapSheet =
    moveId === undefined ? null : <SwapSheet move={name(moveId)} options={swapOptions} onPick={swapTo} onClose={() => setSwapping(false)} />;
  const dock =
    dockButton === null || ending || swapping || discarded !== null ? null : (
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
          <SessionHeader since={stale ? null : (startedAt ?? openedAt)} onEnd={onEnd} pause={pause} onPause={discarded === null ? togglePause : null} subtitle={dayLine} />
          {/* Its place is kept with no rest in it, so the page under it does not move when one starts. */}
          <View testID="rest-slot" style={styles.restSlot}>
            {pause.pausedAt !== null ? pausedBar : rest !== null && <RestTimer since={rest} onEnd={endRest} />}
          </View>
        </View>
        <ScrollView testID="session-scroll" contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {data?.kept === true && <Text style={[styles.small, { color: color.muted }]}>{t('workout.kept')}</Text>}
          {loadFailed}
          {discarded !== null ? discardedPanel : ending ? endSheet : swapping ? swapSheet : finishing ? form : session}
        </ScrollView>
        {dock}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The finish's own key for a problem: not a row of any move. */
const FINISH = 'finish';
/** A correction's own key for a problem. */
const EDIT = 'edit';
/** A discard's own key for a problem. */
const DISCARD = 'discard';
/** An Undo's own key for a problem. */
const UNDO = 'undo';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: { paddingHorizontal: tokens.space.lg, gap: tokens.space.xs },
  pausedBar: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  restSlot: { minHeight: tokens.size.touch + tokens.space.sm * 2, justifyContent: 'center' },
  body: { padding: tokens.space.lg, gap: tokens.space.sm },
  dock: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, borderTopWidth: tokens.border.hairline, alignItems: 'stretch' },
  undo: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  discarded: { gap: tokens.space.sm, padding: tokens.space.md, borderRadius: tokens.radius.card },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.lg },
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
