import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ProblemText, useProblem } from '@/components/ProblemText';
import { t } from '@/copy';
import { type DraftDay, type DraftMove, draftProgram, namesFor, ownProgram } from '@/import/draft';
import { type ExportRead, readExport } from '@/import/formats';
import { type Matched, matchNames } from '@/import/match';
import { MoveRow } from '@/import/MoveRow';
import { sendOwnMoves, sendOwnProgram } from '@/onboarding/bringProgram';
import { broughtProgram } from '@/onboarding/draft';
import { StepFrame, useChoose } from '@/onboarding/StepFrame';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { exerciseName } from '@/train/program';
import { type Move, ownMove } from '@/train/trainData';

type Schemas = components['schemas'];
type Read = Extract<ExportRead, { kind: 'read' }>;
type Stage = { kind: 'start' | 'unknown' | 'empty' } | { kind: 'read'; read: Read; matched: Matched[] };

/**
 * #ob-own's import (K-968, ADR-073 #1, Ek 2): the file is picked and read on this phone, its names matched to the catalog
 * as the history import matches them (K-609), and the routines the user kept doing drafted into a program (draft.ts).
 * The user sees the draft; a name no move was matched to is picked, made their own move or left out, and the program
 * waits for it: no move goes in under a guess. Nothing leaves the phone until "Use this program": then the own moves the
 * draft still names are made (their answers kept on the phone till then, one clientId each), and the program naming them
 * is sent (PUT /v1/program). A draft turned down leaves nothing behind (ADR-073 Ek 2). Then the walk goes on.
 */
export default function ProgramImportStep() {
  const { api, importFile, training, report } = useAppServices();
  const { color } = useTheme();
  const choose = useChoose('ownProgram');
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  // null while the catalog is read: a file chosen before it would match against nothing.
  const [moves, setMoves] = useState<Move[] | 'failed' | null>(null);
  const [choices, setChoices] = useState<ReadonlyMap<string, string | null>>(new Map());
  const [leftOut, setLeftOut] = useState<ReadonlySet<string>>(new Set());
  // The own moves answered, by the draft's name, waiting for the program: made only with it.
  const [pending, setPending] = useState<ReadonlyMap<string, Schemas['NewCustomExercise']>>(new Map());
  const [saving, setSaving] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
  // A ref, not state: two taps in one frame both see the state from before either ran.
  const sending = useRef(false);

  useEffect(() => {
    void Promise.all([training.read(api), training.own(api)]).then(
      ([data, own]) => setMoves(data.exercises.state === 'ready' ? [...data.exercises.value, ...own] : 'failed'),
      () => setMoves('failed'),
    );
  }, [api, training]);

  const known = useMemo(() => (Array.isArray(moves) ? moves : []), [moves]);
  const byId = useMemo(() => new Map(known.map((m) => [m.id, m])), [known]);
  // The draft from the choices on the screen now: what is shown and what is sent are the same thing.
  const draft = stage.kind === 'read' ? draftProgram(stage.read.sessions, choices, leftOut) : null;
  const ownNames = draft?.kind === 'draft' ? [...new Set(draft.days.flatMap((day) => day.moves.flatMap((m) => ('ownName' in m ? [m.ownName] : []))))] : [];
  const ready = draft?.kind === 'draft' && ownNames.every((name) => pending.has(name));
  // Every move left out: the file has routines, the user took every move out of them.
  const allLeftOut = stage.kind === 'read' && draft?.kind === 'noRoutine' && leftOut.size > 0 && draftProgram(stage.read.sessions, choices, new Set()).kind === 'draft';

  const pickFile = async () => {
    setProblem(null);
    const text = await importFile.pick();
    if (text === null) return; // nothing chosen: nothing changes
    const read = readExport(text, { routines: true });
    if (read.kind !== 'read') {
      setStage({ kind: read.kind });
      return;
    }
    const counts = new Map<string, number>();
    for (const set of read.sessions.flatMap((s) => s.sets)) counts.set(set.name, (counts.get(set.name) ?? 0) + 1);
    const matched = matchNames(counts, known);
    setChoices(new Map(matched.map((m) => [m.name, m.sure])));
    setLeftOut(new Set());
    setPending(new Map());
    setStage({ kind: 'read', read, matched });
  };

  const fileNames = stage.kind === 'read' ? stage.matched.map((m) => m.name) : [];
  const pickFor = (ownName: string, id: string) =>
    setChoices((before) => new Map([...before, ...namesFor(ownName, fileNames).map((name) => [name, id] as const)]));
  const leaveOut = (ownName: string) => setLeftOut((before) => new Set([...before, ...namesFor(ownName, fileNames)]));
  const savedOwn = (ownName: string, own: Schemas['CustomExercise']) => {
    setMoves((before) => [...(Array.isArray(before) ? before : []).filter((m) => m.id !== own.id), ownMove(own)]);
    pickFor(ownName, own.id);
  };
  // Answered again, the name keeps the clientId it was first answered with: one move, however often it is sent.
  const answeredOwn = (ownName: string, body: Schemas['NewCustomExercise']) =>
    setPending((before) => new Map(before).set(ownName, { ...body, clientId: before.get(ownName)?.clientId ?? body.clientId }));

  const confirm = async () => {
    if (draft?.kind !== 'draft' || !ready || sending.current) return;
    sending.current = true;
    setSaving(true);
    setProblem(null);
    try {
      const kept = await sendOwnMoves(api, ownNames.map((name) => pending.get(name)!));
      await Promise.all(kept.map((own) => training.saved(own)));
      const program = ownProgram(draft.days, new Map(ownNames.map((name, i) => [name, kept[i].id])));
      if (program === null) throw Object.assign(new Error('own program: a move without its id'), { name: 'ProgramIncomplete' });
      choose(broughtProgram(await sendOwnProgram(api, program)));
    } catch (error) {
      const name = error instanceof Error ? error.name : 'Unknown';
      report({ name });
      setProblem(t(`onboarding.programImport.failed.${name === 'NoConnection' ? 'NoConnection' : 'other'}`));
    } finally {
      sending.current = false;
      setSaving(false);
    }
  };

  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const note = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  const catalogNote = moves === null ? note('import.loadingMoves') : moves === 'failed' ? note('import.noMoves') : null;
  const outcome: Record<Stage['kind'], ReactNode> = {
    start: note('onboarding.programImport.intro'),
    unknown: note('import.unknown'),
    empty: note('import.empty'),
    read: draft?.kind === 'noRoutine' ? note(allLeftOut ? 'onboarding.programImport.allLeftOut' : 'onboarding.programImport.noRoutine') : null,
  };
  let days: ReactNode = null;
  if (stage.kind === 'read' && draft?.kind === 'draft') {
    const moveCount = draft.days.reduce((n, day) => n + day.moves.length, 0);
    const summary = t('onboarding.programImport.summary', { app: t(`import.apps.${stage.read.source}`), days: draft.days.length, moves: moveCount });
    days = (
      <View style={styles.part}>
        <Text style={[styles.label, { color: color.text }]}>{summary}</Text>
        {draft.days.map((day, i) => (
          <Day
            key={`${day.name}-${i}`}
            day={day}
            matched={stage.matched}
            moves={known}
            byId={byId}
            pending={pending}
            onPick={pickFor}
            onLeaveOut={leaveOut}
            onSavedOwn={savedOwn}
            onOwnAnswered={answeredOwn}
          />
        ))}
      </View>
    );
  }
  const actions =
    draft?.kind !== 'draft' ? undefined : (
      <View style={styles.part}>
        {problem !== null && (
          <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
            {problem}
          </ProblemText>
        )}
        {saving && note('onboarding.programImport.saving')}
        {!ready && note('onboarding.programImport.waiting')}
        <Button label={t('onboarding.programImport.confirm')} disabled={!ready || saving} onPress={() => void confirm()} />
      </View>
    );

  return (
    <StepFrame step="ownProgram" title={t('onboarding.programImport.title')} chosen actions={actions} backDisabled={saving}>
      {outcome[stage.kind]}
      {note('onboarding.programImport.privacy')}
      {catalogNote}
      <Button
        label={t(stage.kind === 'start' ? 'onboarding.programImport.choose' : 'onboarding.programImport.chooseAnother')}
        variant={draft?.kind === 'draft' ? 'ghost' : 'primary'}
        disabled={moves === null || moves === 'failed' || saving}
        onPress={() => void pickFile()}
      />
      {days}
    </StepFrame>
  );
}

type DayProps = {
  day: DraftDay;
  matched: Matched[];
  moves: Move[];
  byId: ReadonlyMap<string, Move>;
  pending: ReadonlyMap<string, Schemas['NewCustomExercise']>;
  onPick: (ownName: string, id: string) => void;
  onLeaveOut: (ownName: string) => void;
  onSavedOwn: (ownName: string, own: Schemas['CustomExercise']) => void;
  onOwnAnswered: (ownName: string, body: Schemas['NewCustomExercise']) => void;
};

/** A day of the draft: its name and weekday, each move with its sets and reps; a name not yet a move, with the ways to make it one. */
function Day({ day, matched, moves, byId, pending, onPick, onLeaveOut, onSavedOwn, onOwnAnswered }: DayProps) {
  const { color } = useTheme();
  const weekday = day.weekday === undefined ? t('onboarding.programImport.anyDay') : t(`onboarding.schedule.dayName.${day.weekday}`);
  const line = (move: DraftMove) => t('onboarding.programImport.move', { sets: move.sets, min: move.reps.min, max: move.reps.max });
  return (
    <View style={[styles.day, { borderColor: color.line }]}>
      <View style={styles.dayHead}>
        <Text style={[styles.heading, { color: color.text }]}>{day.name}</Text>
        <Text style={[styles.small, { color: color.muted }]}>{weekday}</Text>
      </View>
      {day.moves.map((move, i) => {
        if ('exerciseId' in move) {
          return (
            <View key={`${move.exerciseId}-${i}`} style={styles.move}>
              <Text style={[styles.text, { color: color.text }]}>{exerciseName(move.exerciseId, byId)}</Text>
              <Text style={[styles.small, { color: color.textSecondary }]}>{line(move)}</Text>
            </View>
          );
        }
        const leave = (
          <Button
            label={t('onboarding.programImport.leaveOut')}
            accessibilityLabel={t('onboarding.programImport.leaveOutLabel', { name: move.ownName })}
            variant="ghost"
            size="sm"
            onPress={() => onLeaveOut(move.ownName)}
          />
        );
        if (pending.has(move.ownName)) {
          return (
            <View key={`${move.ownName}-${i}`} style={styles.move}>
              <Text style={[styles.text, { color: color.text }]}>{pending.get(move.ownName)?.name}</Text>
              <Text style={[styles.small, { color: color.textSecondary }]}>{line(move)}</Text>
              <Text style={[styles.small, { color: color.muted }]}>{t('onboarding.programImport.ownWaiting')}</Text>
              {leave}
            </View>
          );
        }
        const found = matched.find((m) => namesFor(move.ownName, [m.name]).length > 0);
        if (found === undefined) return null; // every name of the draft is the file's, so matched; never reached
        return (
          <View key={`${move.ownName}-${i}`} style={styles.move}>
            <MoveRow
              matched={found}
              chosen={null}
              moves={moves}
              byId={byId}
              detail={line(move)}
              unmatched={t('onboarding.programImport.unmatched')}
              onPick={(id) => id !== null && onPick(move.ownName, id)}
              onSavedOwn={(own) => onSavedOwn(move.ownName, own)}
              onOwnAnswered={(body) => onOwnAnswered(move.ownName, body)}
            />
            {leave}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  part: { gap: tokens.space.sm },
  day: { gap: tokens.space.sm, paddingVertical: tokens.space.sm, borderTopWidth: tokens.border.hairline },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  move: { gap: tokens.space.xs },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
