import { Stack, router, useLocalSearchParams } from 'expo-router';
// Not exported from the package root: the header's native Back pops the route by itself unless it is registered as prevented.
import { usePreventRemove } from 'expo-router/build/react-navigation/core/usePreventRemove';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { ProblemText, announce, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { type Undone as SavedUndone, useSaved } from '@/saved/saved';
import { askFirst } from '@/settings/askFirst';
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
import { exerciseName } from '@/train/program';
import { type EditedDay, draftFits, editedDays, programEditOf, targetsLost } from '@/train/programEdit';
import { BuildProgramPrompt } from '@/train/BuildProgramPrompt';
import { ProgramEditor } from '@/train/ProgramEditor';
import { suggestionWords } from '@/train/review';
import { type Move, movesOf, ownMove } from '@/train/trainData';
import { cardioLine, daysLine } from '@/train/programLines';
import { splitName } from '@/train/week';
import { activeWorkout } from '@/train/workout';

type Schemas = components['schemas'];
type Part = 'days' | 'moves' | 'changes' | 'cardio' | 'rebuild';
const PARTS: readonly Part[] = ['days', 'moves', 'changes', 'cardio', 'rebuild'];

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
  const saved = useSaved();
  const params = useLocalSearchParams<{ part?: string }>();
  // Set when the page is left on purpose ("Leave without saving", a rebuild that moves on). It is state, not a ref: the stop on
  // unsaved edits is registered with the navigator on render, so it is lifted first and the way out is taken after (the effect below).
  const [exit, setExit] = useState<'back' | 'train' | null>(null);
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
  // Back with edits not saved asks first (they would be gone).
  const [leaving, setLeaving] = useState(false);
  const base = useMemo(() => (program === null ? [] : editedDays(program)), [program]);
  const days = draft ?? base;
  const edit = program === null ? null : programEditOf(days, program);
  // Dirty is the edit that would be sent against the one the program is: a day moved to Tuesday and back to Monday, a space
  // after a name, are no edit (the server saves nothing then, and the page must not say it did).
  const baseEdit = useMemo(() => (program === null ? null : programEditOf(base, program)), [base, program]);
  const dirty = draft !== null && (edit === null || JSON.stringify(edit) !== JSON.stringify(baseEdit));
  // "Add a day" is the one flow (ADR-090 Ek 1): the sheet, the server fills the day. Not over edits not saved (the add reads the
  // program as saved, and a draft would be lost): they are saved first. Whatever `canAddDay` says (absent on an older server and
  // on the copy kept offline) the sheet asks the server and says why not: the editor never makes an empty day (Evre 7 B1).
  const addDayHere = program === null ? undefined : () => (dirty ? setProblem(t('editProgram.saveFirst')) : router.push('/add-day'));
  const onEdit = useCallback(
    (next: (all: EditedDay[]) => EditedDay[]) => {
      setDraft((before) => next(before ?? base));
      setWarned(null);
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
    // 'saved': the banner was published, and a save makes the page read again (`afterSaves` above): one read, not two.
    then: (answer: Answer) => void | 'saved',
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
    let readsAfterSave = false;
    if (answer.kind === 'done') {
      setProblem(null);
      setAnswered({ program: answer.program, over: data });
      readsAfterSave = then(answer) === 'saved';
    } else {
      const word = said[answer.kind];
      setProblem(typeof word === 'function' ? word() : (word ?? t(SAID.failed)));
      otherwise?.(answer.kind);
    }
    if (!readsAfterSave) reload();
  };
  const words = (keys: Record<string, string>) => Object.fromEntries(Object.entries(keys).map(([k, key]) => [k, t(key)]));
  const apply = (s: Schemas['ReviewSuggestion']) => {
    if (review === undefined) return;
    // The change this apply made is the one in the answer's list that the review did not have: Undo takes that one back.
    const known = new Set(review.applied.map((a) => a.id));
    void send(
      () => applySuggestion(api, review.id, s.id),
      (answer) => {
        setDraft(null);
        const made = 'program' in answer ? answer.program.review?.applied.find((a) => a.suggestion.id === s.id && !known.has(a.id)) : undefined;
        saved({ lead: t('editProgram.appliedLead'), detail: suggestionWords(s, 'title'), ...(made === undefined ? {} : { undo: () => takeBack(made.id) }) });
        return 'saved';
      },
      words(SAID),
    );
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
        // The app's one confirmation (the banner), with Undo for this edit: it is a change of the log.
        const editId = edits.filter((e) => !known.has(e.id)).at(-1)?.id;
        saved({ lead: t('editProgram.savedLead'), detail: t('editProgram.savedDetail'), ...(editId === undefined ? {} : { undo: () => takeBack(editId) }) });
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
  /** Taking a saved edit back from the banner: its own call, closed over the services (the page may be gone by then). */
  const takeBack = async (changeId: string): Promise<SavedUndone> => {
    const answer = await undoChange(api, changeId);
    if (answer.kind === 'done') return { done: true, said: t('editProgram.undone') };
    return { done: false, message: t(answer.kind === 'conflict' ? 'editProgram.undoConflict' : answer.kind === 'offline' ? 'editProgram.offline' : 'editProgram.failed'), again: answer.kind !== 'conflict' };
  };
  // An undo refused is not a stale review: the program changed another way since its last change.
  const undoOf = (changeId: string) =>
    void send(
      () => undoChange(api, changeId),
      (answer) => {
        const also = 'alsoUndone' in answer ? answer.alsoUndone.length : 0;
        setDone(also === 0 ? t('editProgram.undone') : plural('editProgram.undoneWith', also));
        setDraft(null);
      },
      words({ ...SAID, conflict: 'editProgram.undoConflict' }),
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
      (answer) => {
        rebuilt = true;
        setExit('train');
        // The result is said where the user lands: what the new program is (the server has no snapshot of the old one, so no Undo).
        if ('program' in answer) {
          const made = answer.program;
          saved({
            lead: t('editProgram.rebuilt'),
            detail: t('editProgram.rebuiltDetail', { days: plural('programEditor.days', made.days.length), moves: plural('editProgram.moveCount', made.days.reduce((n, d) => n + d.exercises.length, 0)) }),
          });
        }
      },
      // Which days the server builds for is its rule: the phone only says how many it was asked for.
      { ...words(SAID), refused: t('editProgram.rebuildRefused', { count: days.length }) },
    );
    // Rebuilt, the page is on its way out: no second rebuild from it. Not rebuilt, another try is the user's.
    rebuilding.current = rebuilt;
    if (!rebuilt && shown.current) setWorking(false);
  };

  // The one question before it goes, as the system's own alert (ADR-087 #1): the red choice is the rebuild.
  const askRebuild = () =>
    askFirst({
      title: t('editProgram.rebuildAsk'),
      body: t('editProgram.rebuildBody'),
      confirmLabel: t('editProgram.rebuildGo'),
      keepLabel: t('editProgram.rebuildKeep'),
      onConfirm: () => void rebuildNow(),
    });

  let title = t('editProgram.title');
  let body = null;
  let dockEditor: ReactNode = null;
  if (program !== null && part === null) {
    const count = program.days.reduce((n, d) => n + d.exercises.length, 0);
    const movesLine = plural('editProgram.moveCount', count);
    const flags = review?.suggestions.length ?? 0;
    const applied = review?.applied.length ?? 0;
    // The same grouped list as Settings (ADR-070 Ek 2 #2): icon, name, value, chevron. Days and moves are one page (they were two
    // rows of one editor); the split is no row (it follows the days: the line under the title says it); a rebuild stands apart.
    // Built outside the JSX children (the raw-text guard reads them).
    const appliedRow =
      applied === 0 ? null : (
        <ListGroup>
          <ListRow icon="checkmark.circle" label={plural('editProgram.applied', applied)} value={t('editProgram.reviewChanges')} navigates onPress={() => open('changes')} />
        </ListGroup>
      );
    const programValue = flags === 0 ? movesLine : plural('editProgram.flags', flags, { moves: movesLine });
    body = (
      <View style={styles.rows}>
        <Text style={[styles.small, { color: color.textSecondary }]}>{t('editProgram.programLine', { split: splitName(program), days: plural('programEditor.days', program.days.length) })}</Text>
        {appliedRow}
        <ListGroup>
          <ListRow icon="calendar" label={t('editProgram.program')} detail={daysLine(program)} value={programValue} navigates onPress={() => open('moves')} />
          <ListRow icon="figure.run" label={t('editProgram.cardio.title')} value={cardioLine(program)} navigates onPress={() => open('cardio')} />
        </ListGroup>
        <ListGroup>
          <ListRow icon="arrow.triangle.2.circlepath" label={t('editProgram.rebuild')} detail={t('editProgram.rebuildRow')} navigates onPress={() => open('rebuild')} />
        </ListGroup>
      </View>
    );
  } else if (program !== null && (part === 'days' || part === 'moves')) {
    title = t(part === 'days' ? 'editProgram.days' : 'editProgram.program');
    const warning =
      warned === null ? null : (
        <View style={[styles.flag, { backgroundColor: color.accentSoft }]}>
          <Text style={[styles.text, { color: color.text }]}>{t('editProgram.targetsLost', { moves: names(warned) })}</Text>
          <Button label={t('editProgram.saveAnyway')} variant="warn" disabled={busy} onPress={() => save(true)} />
          <Button label={t('editProgram.keepEditing')} variant="ghost" onPress={() => setWarned(null)} />
        </View>
      );
    const notReady = dirty && edit === null ? <Text style={[styles.small, { color: color.textSecondary }]}>{t('editProgram.notReady')}</Text> : null;
    // The warning about targets, the reason a day is not ready and Save are in the dock under the page (always on the screen).
    const editor = (
      <View style={styles.rows}>
        <ProgramEditor days={days} onChange={onEdit} moves={catalog} makeOwn={makeOwn} onAddDay={addDayHere} />
      </View>
    );
    dockEditor = (
      <>
        {warning}
        {notReady}
        <Button label={t('editProgram.save')} disabled={busy || !dirty || edit === null} onPress={() => save(false)} />
      </>
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
    const said = (detail: string) => () => saved({ lead: t('editProgram.savedLead'), detail });
    body = (
      <CardioEditor
        program={program}
        lifts={liftDays(program, data?.profileDays ?? null)}
        busy={busy}
        onSave={(plan) => void send(() => putCardio(api, plan), said(plan.sessions.length === 0 ? t('editProgram.cardio.savedOff') : t('editProgram.cardio.savedOn')), words(SAID))}
        onCoach={() => void send(() => coachCardio(api), said(t('editProgram.cardio.coachBack')), words(SAID))}
      />
    );
  } else if (program !== null && part === 'rebuild') {
    title = t('editProgram.rebuild');
    // A workout under way is on one of the days a rebuild replaces: its targets would have nowhere to go.
    const underWay = data?.active != null;
    const confirm = underWay ? null : (
      <Button
        label={t(working ? 'buildProgram.building' : 'editProgram.rebuildConfirm')}
        busy={working}
        disabled={busy || working}
        onPress={askRebuild}
      />
    );
    const progress = !working ? null : (
      <View style={styles.progress}>
        <ActivityIndicator color={color.muted} />
      </View>
    );
    // What goes, as counts the user can weigh (not a paragraph): their own moves, the review's changes in force.
    const goes = [
      ...((review?.notReviewedMoves ?? 0) > 0 ? [plural('editProgram.goesOwnMoves', review?.notReviewedMoves ?? 0)] : []),
      ...((review?.applied.length ?? 0) > 0 ? [plural('editProgram.goesChanges', review?.applied.length ?? 0)] : []),
    ];
    const chips =
      underWay || goes.length === 0 ? null : (
        <View style={styles.chips}>
          {goes.map((what) => (
            <View key={what} style={[styles.chip, { backgroundColor: color.surface }]}>
              <Text style={[styles.small, styles.bold, { color: color.text }]}>{what}</Text>
            </View>
          ))}
        </View>
      );
    body = (
      <View style={styles.rows}>
        <Text style={[styles.text, { color: color.text }]}>{t(underWay ? 'editProgram.rebuildUnderWay' : 'editProgram.rebuildBody')}</Text>
        {chips}
        {confirm}
        {progress}
      </View>
    );
  } else if (data?.program.state === 'none') {
    // No program (K-1037, ADR-084): nothing to edit, and the way to build one.
    body = <BuildProgramPrompt />;
  }
  // The question is asked in the dock at the foot of the screen, which is always on it: nothing is inserted above the page, so it
  // never jumps (simulator walk, Evre 7).
  const announceLeaving = useCallback(() => {
    setLeaving(true);
    announce(t('editProgram.leaveWarn'));
  }, []);
  // The way back is the system's (the header's button, the edge swipe, ADR-070 Ek 2 #4). With edits not saved it is stopped
  // and the question is asked instead; "Leave without saving" is the one way out that lets it through. Registered with React
  // Navigation's `usePreventRemove`: a bare `beforeRemove` listener does not stop the native header Back, which pops by itself.
  usePreventRemove(dirty && exit === null, announceLeaving);
  useEffect(() => {
    if (exit === 'back') router.back();
    if (exit === 'train') router.dismissTo('/train');
  }, [exit]);
  const leave =
    leaving && dirty ? (
      <View style={[styles.flag, { backgroundColor: color.accentSoft }]}>
        <Text style={[styles.text, { color: color.text }]}>{t('editProgram.leaveWarn')}</Text>
        <Button
          label={t('editProgram.leave')}
          variant="warn"
          onPress={() => {
            setExit('back');
          }}
        />
        <Button label={t('editProgram.keepEditing')} variant="ghost" onPress={() => setLeaving(false)} />
      </View>
    ) : null;
  // Edits not saved are said in the dock, where they are seen: the iOS edge swipe back is off meanwhile (it would drop them
  // without a question), and a swipe that does nothing, with the reason below the fold, looked broken (K-1013).
  const unsaved =
    !dirty || leave !== null ? null : (
      <View testID="unsaved-note" style={[styles.flag, { backgroundColor: color.accentSoft }]}>
        <Text style={[styles.small, { color: color.text }]}>{t('editProgram.unsavedNote')}</Text>
      </View>
    );
  // The dock under the page: what was answered or went wrong, the question on leaving, the unsaved note and Save. It is outside
  // the scroll, so each is on the screen when it comes and nothing above it moves.
  const answered_ = done === null ? null : <ProblemText style={[styles.text, { color: color.text }]}>{done}</ProblemText>;
  const problem_ =
    problem === null ? null : (
      <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
        {problem}
      </ProblemText>
    );
  const dock =
    answered_ === null && problem_ === null && leave === null && unsaved === null && dockEditor === null ? null : (
      <View testID="edit-dock" style={[styles.dock, { backgroundColor: color.background, borderColor: color.line }]}>
        {answered_}
        {problem_}
        {leave}
        {unsaved}
        {dockEditor}
      </View>
    );
  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: color.background }]}>
      {/* The iOS edge swipe back would drop unsaved edits without the question Back asks. */}
      <Stack.Screen options={{ gestureEnabled: !dirty && !working, headerBackVisible: !working }} />
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{title}</ScreenTitle>
        {body}
      </ScrollView>
      {dock}
    </SafeAreaView>
  );
}

const open = (part: Part) => router.push({ pathname: '/edit-program', params: { part } });

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
  dock: { gap: tokens.space.sm, padding: tokens.space.lg, borderTopWidth: tokens.border.hairline },
  rows: { gap: tokens.space.sm },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  chip: { borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.xs },
});
