import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ProblemText, announce, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { trainedWeekdays } from '@/train/addDay';
import { liftDays } from '@/train/cardio';
import { CardioEditor } from '@/train/CardioEditor';
import { type Changed, type Undone, applySuggestion, coachCardio, editProgram, putCardio, rebuild, undoChange } from '@/train/changes';
import type { SaveOutcome } from '@/train/OwnMoveForm';
import { dayName, exerciseName } from '@/train/program';
import { type EditedDay, WEEKDAYS, draftFits, editedDays, newDay, programEditOf, targetsLost, weekdayTaken, withWeekday } from '@/train/programEdit';
import { BuildProgramPrompt } from '@/train/BuildProgramPrompt';
import { ProgramEditor } from '@/train/ProgramEditor';
import { suggestionWords } from '@/train/review';
import { type Move, movesOf, ownMove } from '@/train/trainData';
import { cardioLine, daysLine } from '@/train/programLines';
import { splitName } from '@/train/week';
import { activeWorkout } from '@/train/workout';

type Schemas = components['schemas'];
type Part = 'days' | 'moves' | 'changes' | 'cardio' | 'split' | 'rebuild';
const PARTS: readonly Part[] = ['days', 'moves', 'changes', 'cardio', 'split', 'rebuild'];

const plural = (key: string, count: number, vars: Record<string, string | number> = {}) =>
  t(`${key}.${count === 1 ? 'one' : 'other'}`, { count, ...vars });
/** Why a 409 came: the workout's day (edits kept), the program changed under the edit (cleared), or not known. */
type Fit = 'kept' | 'cleared' | 'unknown';
const CONFLICT: Record<Fit, string> = {
  kept: 'editProgram.editConflictKept',
  cleared: 'editProgram.editConflictCleared',
  unknown: 'editProgram.editConflictUnknown',
};
const SAID = { conflict: 'editProgram.stale', offline: 'editProgram.offline', failed: 'editProgram.failed' } as const;

/**
 * Edit program (K-970, ADR-073 #3-#4; prototype sheet `#editprog`), route `/edit-program`, each part its own page
 * (`?part=`): the training days; the moves with the review's flags, each suggestion applied from here (ADR-073 #3); the
 * changes from the review in force, each undone with the later ones that needed it said ("N changes applied · Undo");
 * the split as it really is; "Rebuild for me", a new program from the user's training days after a confirmation. Days
 * and moves are edited in the program editor (ADR-073 #4, shared with "Type it in"): sent by their ids (PATCH
 * /v1/program, K-995) so a move kept keeps its target; the moves whose target the edit takes are said before saving;
 * what the server answers is shown, with "Saved" and Undo (the edit is a change of the log). Every number is the server's.
 */
export default function EditProgramScreen() {
  const { api, training, workoutRecords, report } = useAppServices();
  const { color } = useTheme();
  const params = useLocalSearchParams<{ part?: string; adding?: string }>();
  const navigation = useNavigation();
  // Set when the page is left on purpose ("Leave without saving", a rebuild that moves on), so the stop on unsaved edits lets it through.
  const leaveFreely = useRef(false);
  const part = PARTS.find((p) => p === params.part) ?? null;
  const { data, reload } = useReadOnFocus(
    useCallback(async () => {
      // The cardio page places a day after the weights or on a rest day: on days with no weekday, the profile's training
      // days say which are which.
      const [read, own, records, profile] = await Promise.all([
        training.read(api),
        training.own(api),
        workoutRecords(),
        part === 'cardio' ? load(() => api.GET('/v1/profile')) : Promise.resolve(null),
      ]);
      const profileDays = profile?.state === 'ready' ? profile.value.schedule.trainingDays : null;
      return { ...read, own, active: activeWorkout(records, Date.now()), profileDays };
    }, [api, training, workoutRecords, part]),
    // The "Add a day" sheet closes over this page without its focus (ADR-090 Ek 1): a program changed is read again.
    { afterSaves: true },
  );
  // The program the server just answered, shown until the page reads again: a second tap names the review it holds
  // now (not the one read before), an undo's later changes leave the list at once (K-970 review).
  const [answered, setAnswered] = useState<{ program: Schemas['Program']; over: typeof data } | null>(null);
  const [problem, setProblem, occurrence] = useProblem();
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A ref, not state: two taps in the same moment both see state from before either ran.
  const sending = useRef(false);
  // An answer that comes once the page has gone changes nothing on screen, and leads nowhere.
  const shown = useRef(true);
  useEffect(() => {
    shown.current = true;
    return () => {
      shown.current = false;
    };
  }, []);

  const read = data?.program.state === 'ready' ? data.program.value : null;
  // Once the page has read again (another `data`), the read is the newer word.
  const program = answered !== null && answered.over === data ? answered.program : read;
  // The user's own moves made from the editor: in the catalog the editor finds among, before the page reads them again.
  const [madeOwn, setMadeOwn] = useState<Move[]>([]);
  const moves = useMemo(() => movesOf(data, [...(data?.own ?? []), ...madeOwn]), [data, madeOwn]);
  const catalog = useMemo(() => [...moves.values()], [moves]);
  const review = program?.review;

  // The edit under way: the days as the user left them, null while untouched (the program's own). It outlives a failed
  // save (the user's work) and goes with a saved one, an apply, an undo, or a program that changed under it.
  const [draft, setDraft] = useState<EditedDay[] | null>(null);
  const [warned, setWarned] = useState<string[] | null>(null);
  const [savedEdit, setSavedEdit] = useState<string | null>(null);
  // Back with edits not saved asks first (they would be gone).
  const [leaving, setLeaving] = useState(false);
  const base = useMemo(() => (program === null ? [] : editedDays(program)), [program]);
  const days = draft ?? base;
  // Opened from the first week's "add a day" call, which could not add the day itself (K-1013): the weekday the user chose
  // comes marked on a new day, once; the page says why the day is added here.
  const adding = WEEKDAYS.find((weekday) => weekday === params.adding);
  const [marked, setMarked] = useState(false);
  // State adjusted while rendering (React's way for a value that follows what was read), once the program is there.
  if (!marked && part === 'days' && adding !== undefined && program !== null) {
    setMarked(true);
    const more = newDay(base);
    if (more.length > base.length && !weekdayTaken(more, more.length - 1, adding)) setDraft(withWeekday(more, more.length - 1, adding));
  }
  const markedDay = part === 'days' && adding !== undefined && draft?.some((d) => d.weekday === adding && !base.some((b) => b.weekday === adding)) === true;
  const edit = program === null ? null : programEditOf(days, program);
  // Dirty is the edit that would be sent against the one the program is: a day moved to Tuesday and back to Monday, a space
  // after a name, are no edit (the server saves nothing then, and the page must not say it did).
  const baseEdit = useMemo(() => (program === null ? null : programEditOf(base, program)), [base, program]);
  const dirty = draft !== null && (edit === null || JSON.stringify(edit) !== JSON.stringify(baseEdit));
  // "Add a day" is the one flow (ADR-090 Ek 1): the sheet, the server fills the day. Not over edits not saved (the add reads the
  // program as saved, and a draft would be lost): they are saved first. A program the server cannot add to (a day on no weekday)
  // keeps the editor's own empty day.
  const addDayHere =
    program?.canAddDay === true
      ? () => (dirty ? setProblem(t('editProgram.saveFirst')) : router.push('/add-day'))
      : undefined;
  const onEdit = useCallback(
    (next: (all: EditedDay[]) => EditedDay[]) => {
      setDraft((before) => next(before ?? base));
      setWarned(null);
      setSavedEdit(null);
      // "Saved." was about the edit before this one: it must not stand beside "not saved yet".
      setDone(null);
      // The warning was about the edit as it was; this is another.
      setLeaving(false);
    },
    [base],
  );

  type Answer = Changed | Undone | { kind: 'refused' };
  /** One request at a time; its answer shown and said here, and the program read again. */
  const send = async (
    request: () => Promise<Answer>,
    then: (answer: Answer) => void,
    said: Record<string, string | (() => string)> = SAID,
    otherwise?: (kind: string) => void,
  ) => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setDone(null);
    const answer = await request();
    sending.current = false;
    if (!shown.current) return;
    setBusy(false);
    if (answer.kind === 'done') {
      setProblem(null);
      setAnswered({ program: answer.program, over: data });
      then(answer);
    } else {
      const word = said[answer.kind];
      setProblem(typeof word === 'function' ? word() : (word ?? t(SAID.failed)));
      otherwise?.(answer.kind);
    }
    reload();
  };
  const words = (keys: Record<string, string>) => Object.fromEntries(Object.entries(keys).map(([k, key]) => [k, t(key)]));
  const apply = (s: Schemas['ReviewSuggestion']) => {
    if (review !== undefined) void send(() => applySuggestion(api, review.id, s.id), () => setDraft(null), words(SAID));
  };
  const names = (ids: string[]) => ids.map((id) => exerciseName(id, moves)).join(t('editProgram.listJoin'));
  // Saving the edit: the moves whose target it takes are said first, once; saved, the program answered is shown and the
  // edit's own id (the last of the log) is what Undo takes back.
  const save = (confirmed: boolean) => {
    if (program === null || edit === null || !dirty) return;
    // Saving is the answer to "Back with edits not saved"; if it fails, the edits stay and the warning would be stale.
    setLeaving(false);
    const lost = targetsLost(days, program);
    if (lost.length > 0 && !confirmed) {
      setWarned(lost);
      announce(t('editProgram.targetsLost', { moves: names(lost) }));
      return;
    }
    setWarned(null);
    // A 409 is the program changing under the edit, or today's workout on a day the edit moves or removes (the program is
    // the same then): the program as it is now says which, by the ids the draft kept. Not read (offline, or only the phone's
    // copy), the cause is not guessed: the edits stay and the page says only that it did not save.
    let fits: Fit = 'unknown';
    const request = async () => {
      const answer = await editProgram(api, edit);
      if (answer.kind === 'conflict') fits = await stillFits(days, program);
      return answer;
    };
    // The edit's own id is the one the answer has and the program saved from did not: none when the server saved nothing.
    const known = new Set((program.review?.edits ?? []).map((e) => e.id));
    void send(
      request,
      (answer) => {
        const edits = 'program' in answer ? answer.program.review?.edits ?? [] : [];
        setDraft(null);
        setSavedEdit(edits.filter((e) => !known.has(e.id)).at(-1)?.id ?? null);
        setDone(t('editProgram.saved'));
      },
      { ...words(SAID), conflict: () => t(CONFLICT[fits]), refused: t('editProgram.editRefused') },
      // The rows the draft names are gone: the program as the server has it now is what to edit again.
      (kind) => kind === 'conflict' && fits === 'cleared' && setDraft(null),
    );
  };
  const stillFits = async (edited: EditedDay[], before: Schemas['Program']): Promise<Fit> => {
    try {
      const now = await training.read(api);
      // The phone's copy (or no program) is not the server's word on what changed.
      if (now.kept || now.program.state !== 'ready') return 'unknown';
      return draftFits(edited, before, now.program.value) ? 'kept' : 'cleared';
    } catch {
      return 'unknown';
    }
  };
  // An own move made at once (POST /v1/custom-exercises, as in a workout): kept on the phone from the answer, then a move
  // of the editor. The code only is reported, never the name typed.
  const makeOwn = async (body: Schemas['NewCustomExercise']): Promise<Move | Exclude<SaveOutcome, 'saved'>> => {
    try {
      const { data: kept, error } = await api.POST('/v1/custom-exercises', { body });
      if (kept === undefined) {
        report({ name: error?.code ?? 'Unknown' });
        return 'refused';
      }
      await training.saved(kept);
      const made = ownMove(kept);
      setMadeOwn((before) => [...before, made]);
      return made;
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      return 'offline';
    }
  };
  // An undo refused is not a stale review: the program changed another way since its last change.
  const undoOf = (changeId: string) =>
    void send(
      () => undoChange(api, changeId),
      (answer) => {
        const also = 'alsoUndone' in answer ? answer.alsoUndone.length : 0;
        setDone(also === 0 ? t('editProgram.undone') : plural('editProgram.undoneWith', also));
        setDraft(null);
        setSavedEdit(null);
      },
      words({ ...SAID, conflict: 'editProgram.undoConflict' }),
      // Not allowed any more: the button would say the same again.
      (kind) => kind === 'conflict' && setSavedEdit(null),
    );
  const undo = (applied: Schemas['AppliedReviewChange']) => undoOf(applied.id);
  // A tap waits for the training days too: a second one before they come must not rebuild twice.
  const rebuilding = useRef(false);
  // Shown while it does (Evre 7, issue 684): the button says so, and the way back is shut, as the days question's is: the answer of a
  // page that was left leads nowhere, and a button that only dims looked like a press that did nothing.
  const [working, setWorking] = useState(false);
  const rebuildNow = async () => {
    if (sending.current || rebuilding.current) return;
    rebuilding.current = true;
    setWorking(true);
    // The days to build for are the PROGRAM's, as it is now (ADR-090 Ek 1: the program is where the days are made, so a rebuild keeps the
    // days the user has). Only a program with a day on no weekday has fewer weekdays than days; then the profile's, which the server
    // keeps as the program's last weekdays.
    const own = program === null ? [] : trainedWeekdays(program);
    let days: Schemas['Weekday'][] = program !== null && own.length === program.days.length ? own : [];
    if (days.length === 0) {
      const profile = await load(() => api.GET('/v1/profile'));
      if (!shown.current) return;
      if (profile.state !== 'ready') {
        rebuilding.current = false;
        setWorking(false);
        return setProblem(t(profile.state === 'failed' && profile.problem === 'NoConnection' ? 'editProgram.offline' : 'editProgram.noDays'));
      }
      days = profile.value.schedule.trainingDays;
    }
    // No days anywhere (a program of "any day" days that the profile keeps none for): the server has nothing to build for, and a request
    // for none came back as a sentence with no way on. The days question is the way: the count is the one answer, the app places the days.
    if (days.length === 0) {
      rebuilding.current = false;
      setWorking(false);
      return router.push('/build-program');
    }
    let rebuilt = false;
    await send(
      () => rebuild(api, days),
      () => {
        rebuilt = true;
        leaveFreely.current = true;
        router.dismissTo('/train');
      },
      // Which days the server builds for is its rule: the phone only says how many it was asked for.
      { ...words(SAID), refused: t('editProgram.rebuildRefused', { count: days.length }) },
    );
    // Rebuilt, the page is on its way out: no second rebuild from it. Not rebuilt, another try is the user's.
    rebuilding.current = rebuilt;
    if (!rebuilt && shown.current) setWorking(false);
  };

  let title = t('editProgram.title');
  let body = null;
  if (program !== null && part === null) {
    const count = program.days.reduce((n, d) => n + d.exercises.length, 0);
    const movesLine = plural('editProgram.moveCount', count);
    const flags = review?.suggestions.length ?? 0;
    const applied = review?.applied.length ?? 0;
    body = (
      <View style={styles.rows}>
        {applied > 0 && <Row title={plural('editProgram.applied', applied)} detail={t('editProgram.appliedUndo')} onPress={() => open('changes')} />}
        <Row title={t('editProgram.days')} detail={daysLine(program)} onPress={() => open('days')} />
        <Row title={t('editProgram.moves')} detail={flags === 0 ? movesLine : plural('editProgram.flags', flags, { moves: movesLine })} onPress={() => open('moves')} />
        <Row title={t('editProgram.cardio.title')} detail={cardioLine(program)} onPress={() => open('cardio')} />
        <Row title={t('editProgram.split')} detail={splitName(program)} onPress={() => open('split')} />
        <Row title={t('editProgram.rebuild')} detail={t('editProgram.rebuildRow')} onPress={() => open('rebuild')} />
      </View>
    );
  } else if (program !== null && (part === 'days' || part === 'moves')) {
    title = t(part === 'days' ? 'editProgram.days' : 'editProgram.moves');
    const warning =
      warned === null ? null : (
        <View style={[styles.flag, { backgroundColor: color.accentSoft }]}>
          <Text style={[styles.text, { color: color.text }]}>{t('editProgram.targetsLost', { moves: names(warned) })}</Text>
          <Button label={t('editProgram.saveAnyway')} variant="warn" disabled={busy} onPress={() => save(true)} />
          <Button label={t('editProgram.keepEditing')} variant="ghost" onPress={() => setWarned(null)} />
        </View>
      );
    const notReady = dirty && edit === null ? <Text style={[styles.small, { color: color.textSecondary }]}>{t('editProgram.notReady')}</Text> : null;
    const editor = (
      <View style={styles.rows}>
        {markedDay && adding !== undefined && (
          <Text style={[styles.text, { color: color.textSecondary }]}>{t('editProgram.addingDay', { day: t(`programEditor.weekdayName.${adding}`) })}</Text>
        )}
        <ProgramEditor days={days} onChange={onEdit} moves={catalog} makeOwn={makeOwn} onAddDay={addDayHere} />
        {warning}
        {notReady}
        <Button label={t('editProgram.save')} disabled={busy || !dirty || edit === null} onPress={() => save(false)} />
      </View>
    );
    body =
      part === 'days' ? (
        editor
      ) : (
        <View style={styles.rows}>
          {editor}
          <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
            {t('editProgram.reviewTitle')}
          </Text>
          {review?.suggestions.length === 0 && <Text style={[styles.text, { color: color.text }]}>{t('editProgram.reviewNone')}</Text>}
          {dirty && (review?.suggestions.length ?? 0) > 0 && <Text style={[styles.small, { color: color.textSecondary }]}>{t('editProgram.applyAfterSave')}</Text>}
          {review?.suggestions.map((s) => (
            <Flag key={s.id} suggestion={s} action={t('editProgram.apply')} busy={busy || dirty} onPress={() => apply(s)} />
          ))}
          {(review?.notReviewedMoves ?? 0) > 0 && (
            <Text style={[styles.small, { color: color.textSecondary }]}>{t('editProgram.notReviewed', { count: review?.notReviewedMoves ?? 0 })}</Text>
          )}
        </View>
      );
  } else if (program !== null && part === 'changes') {
    title = t('editProgram.changesTitle');
    body = (
      <View style={styles.rows}>
        {review?.applied.length === 0 && <Text style={[styles.text, { color: color.text }]}>{t('editProgram.changesNone')}</Text>}
        {review?.applied.map((change) => (
          <Flag key={change.id} suggestion={change.suggestion} action={t('editProgram.undo')} busy={busy} onPress={() => undo(change)} />
        ))}
      </View>
    );
  } else if (program !== null && part === 'cardio') {
    title = t('editProgram.cardio.title');
    const saved = () => setDone(t('editProgram.cardio.saved'));
    body = (
      <CardioEditor
        program={program}
        lifts={liftDays(program, data?.profileDays ?? null)}
        busy={busy}
        onSave={(plan) => void send(() => putCardio(api, plan), saved, words(SAID))}
        onCoach={() => void send(() => coachCardio(api), () => setDone(t('editProgram.cardio.coachBack')), words(SAID))}
      />
    );
  } else if (program !== null && part === 'split') {
    title = t('editProgram.split');
    body = (
      <View style={styles.rows}>
        <Text style={[styles.heading, { color: color.text }]}>{splitName(program)}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{program.days.map(dayName).join(t('editProgram.dayList'))}</Text>
        <Text style={[styles.text, { color: color.text }]}>{t('editProgram.splitBody')}</Text>
      </View>
    );
  } else if (program !== null && part === 'rebuild') {
    title = t('editProgram.rebuild');
    // A workout under way is on one of the days a rebuild replaces: its targets would have nowhere to go.
    const underWay = data?.active != null;
    const confirm = underWay ? null : (
      <Button
        label={t(working ? 'buildProgram.building' : 'editProgram.rebuildConfirm')}
        variant="warn"
        busy={working}
        disabled={busy || working}
        onPress={() => void rebuildNow()}
      />
    );
    const progress = !working ? null : (
      <View style={styles.progress}>
        <ActivityIndicator color={color.muted} />
      </View>
    );
    body = (
      <View style={styles.rows}>
        <Text style={[styles.text, { color: color.text }]}>{t(underWay ? 'editProgram.rebuildUnderWay' : 'editProgram.rebuildBody')}</Text>
        {confirm}
        {progress}
      </View>
    );
  } else if (data?.program.state === 'none') {
    // No program (K-1037, ADR-084): nothing to edit, and the way to build one.
    body = <BuildProgramPrompt />;
  }
  // The page is long and Back is at its foot: the question is asked at the top, so the page goes up to it, without
  // motion (Reduce Motion, accessibility.test.ts).
  const scroller = useRef<ScrollView>(null);
  const announceLeaving = useCallback(() => {
    setLeaving(true);
    announce(t('editProgram.leaveWarn'));
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, []);
  // The way back is the system's (the header's button, the edge swipe, ADR-070 Ek 2 #4). With edits not saved it is stopped
  // and the question is asked instead; "Leave without saving" is the one way out that lets it through.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (leaveFreely.current || !dirty) return;
        event.preventDefault();
        announceLeaving();
      }),
    [navigation, dirty, announceLeaving],
  );
  const leave =
    leaving && dirty ? (
      <View style={[styles.flag, { backgroundColor: color.accentSoft }]}>
        <Text style={[styles.text, { color: color.text }]}>{t('editProgram.leaveWarn')}</Text>
        <Button
          label={t('editProgram.leave')}
          variant="warn"
          onPress={() => {
            leaveFreely.current = true;
            router.back();
          }}
        />
        <Button label={t('editProgram.keepEditing')} variant="ghost" onPress={() => setLeaving(false)} />
      </View>
    ) : null;
  // Edits not saved are said at the top, where they are seen: the iOS edge swipe back is off meanwhile (it would drop them
  // without a question), and a swipe that does nothing, with the reason below the fold, looked broken (K-1013).
  const unsaved =
    !dirty || leave !== null ? null : (
      <View testID="unsaved-note" style={[styles.flag, { backgroundColor: color.accentSoft }]}>
        <Text style={[styles.small, { color: color.text }]}>{t('editProgram.unsavedNote')}</Text>
      </View>
    );
  const undoEdit =
    savedEdit === null ? null : (
      <Button label={t('editProgram.undo')} accessibilityLabel={t('editProgram.undoEditLabel')} variant="ghost" disabled={busy} onPress={() => undoOf(savedEdit)} />
    );
  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: color.background }]}>
      {/* The iOS edge swipe back would drop unsaved edits without the question Back asks. */}
      <Stack.Screen options={{ gestureEnabled: !dirty && !working, headerBackVisible: !working }} />
      <ScrollView ref={scroller} contentContainerStyle={styles.body}>
        <ScreenTitle>{title}</ScreenTitle>
        {leave}
        {unsaved}
        {body}
        {done !== null && <ProblemText style={[styles.text, { color: color.text }]}>{done}</ProblemText>}
        {undoEdit}
        {problem !== null && (
          <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
            {problem}
          </ProblemText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const open = (part: Part) => router.push({ pathname: '/edit-program', params: { part } });

/** A part of the program: what it is, what it holds now. */
function Row({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, pressed && styles.dim]}>
      <Text style={[styles.text, styles.bold, { color: color.text }]}>{title}</Text>
      <Text style={[styles.small, { color: color.textSecondary }]}>{detail}</Text>
    </Pressable>
  );
}

/** A review suggestion in its words, with what can be done to it (Apply, or Undo once applied). */
function Flag({ suggestion, action, busy, onPress }: { suggestion: Schemas['ReviewSuggestion']; action: string; busy: boolean; onPress: () => void }) {
  const { color } = useTheme();
  const title = suggestionWords(suggestion, 'title');
  return (
    <View style={[styles.flag, { backgroundColor: color.accentSoft }]}>
      <Text style={[styles.text, styles.bold, { color: color.text }]}>{title}</Text>
      <Text style={[styles.small, { color: color.text }]}>{suggestionWords(suggestion, 'body')}</Text>
      <Button label={action} accessibilityLabel={`${action}: ${title}`} variant="ghost" size="touch" disabled={busy} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  rows: { gap: tokens.space.sm },
  row: { minHeight: tokens.size.touch, borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.xs },
  day: { gap: tokens.space.xs },
  move: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  flag: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  grow: { flex: 1 },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
  progress: { alignItems: 'center' },
});
