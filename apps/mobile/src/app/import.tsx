import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { type Built, buildImport, sessionIds } from '@/import/build';
import { type ExportRead, readExport } from '@/import/formats';
import { type Matched, matchNames } from '@/import/match';
import { MoveRow } from '@/import/MoveRow';
import { sendImport } from '@/import/send';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Move, ownMove } from '@/train/trainData';

type Read = Extract<ExportRead, { kind: 'read' }>;
type Stage =
  | { kind: 'checking' }
  | { kind: 'consent' }
  | { kind: 'start' }
  | { kind: 'unknown' }
  | { kind: 'empty' }
  | { kind: 'map'; read: Read; matched: Matched[]; ids: string[] }
  | { kind: 'done'; imported: number; alreadyThere: number; built: Built };

const FAILURES = ['NoConnection', 'ConsentRequired', 'ImportRefused'];
const digest = (text: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);

/**
 * Bring in workouts from Strong or Hevy (K-609, ADR-053): the file is picked and read on this phone (H13: only the
 * verified forms), each move name matched to the catalog — a sure match shown and changeable, anything less offered in
 * one tap or left out (U5) — the unit and the dumbbell count asked, never guessed; only the matched sets are sent,
 * marked as brought in. They show in the history and never change a call. Needs the health data consent.
 */
export default function ImportScreen() {
  const { api, consents, importFile, training, report } = useAppServices();
  const { color } = useTheme();
  const [stage, setStage] = useState<Stage>({ kind: 'checking' });
  // null while the catalog is read: a file chosen before it would match against nothing (K-609 review).
  const [moves, setMoves] = useState<Move[] | 'failed' | null>(null);
  const [choices, setChoices] = useState<Map<string, string | null>>(new Map());
  // Strong's unit is the user's answer, never preset from their own setting: the file was made in Strong's (H13 B2).
  const [unit, setUnit] = useState<'kg' | 'lb' | null>(null);
  const [dumbbells, setDumbbells] = useState<'one' | 'both'>('one');
  const [progress, setProgress] = useState<{ done: number; of: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const sending = useRef(false);

  useEffect(() => {
    // Not known is not given: nothing health is sent on a guess (ADR-030 #25).
    void consents.granted('HEALTH_DATA').then(
      (granted) => setStage(granted ? { kind: 'start' } : { kind: 'consent' }),
      () => setStage({ kind: 'consent' }),
    );
    // The catalog and the user's own moves, from the server or the copy kept on the phone (K-405, K-416).
    void Promise.all([training.read(api), training.own(api)]).then(
      ([data, own]) => setMoves(data.exercises.state === 'ready' ? [...data.exercises.value, ...own] : 'failed'),
      () => setMoves('failed'),
    );
  }, [api, consents, training]);

  const known = useMemo(() => (Array.isArray(moves) ? moves : []), [moves]);
  const byId = useMemo(() => new Map(known.map((m) => [m.id, m])), [known]);
  const fileUnit = stage.kind === 'map' ? (stage.read.unit ?? unit) : null;
  // What would go, from the choices on the screen now: the button's count and the send are the same thing.
  const built =
    stage.kind !== 'map' || fileUnit === null
      ? null
      : buildImport({ source: stage.read.source, sessions: stage.read.sessions, ids: stage.ids, choices, moves: byId, unit: fileUnit, dumbbells });

  const choose = async () => {
    setProblem(null);
    const text = await importFile.pick();
    if (text === null) return; // nothing chosen: nothing changes
    const next = readExport(text);
    if (next.kind !== 'read') {
      setStage(next);
      return;
    }
    const counts = new Map<string, number>();
    for (const set of next.sessions.flatMap((s) => s.sets)) counts.set(set.name, (counts.get(set.name) ?? 0) + 1);
    const matched = matchNames(counts, known);
    const ids = await sessionIds(next.source, next.sessions, digest);
    setChoices(new Map(matched.map((m) => [m.name, m.sure])));
    setUnit(null);
    setStage({ kind: 'map', read: next, matched, ids });
  };

  const send = async () => {
    if (sending.current || built === null) return;
    sending.current = true;
    setProblem(null);
    setProgress({ done: 0, of: built.chunks.length });
    try {
      const sent = await sendImport({ api, chunks: built.chunks, onProgress: (done, of) => setProgress({ done, of }) });
      setStage({ kind: 'done', ...sent, built });
    } catch (error) {
      const name = error instanceof Error ? error.name : 'Unknown';
      report({ name });
      setProblem(t(`import.failed.${FAILURES.includes(name) ? name : 'other'}`));
    } finally {
      sending.current = false;
      setProgress(null);
    }
  };

  const pick = (file: string, id: string | null) => setChoices((before) => new Map(before).set(file, id));
  const savedOwn = (file: string, own: components['schemas']['CustomExercise']) => {
    setMoves((before) => [...(Array.isArray(before) ? before : []).filter((m) => m.id !== own.id), ownMove(own)]);
    pick(file, own.id);
  };
  const anyDumbbell = [...choices.values()].some((id) => {
    const m = id === null ? undefined : byId.get(id);
    return m?.equipment === 'DUMBBELL' && !m.unilateral;
  });

  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const moveState = moves === null ? 'loading' : moves === 'failed' ? 'failed' : 'ready';
  let body: ReactNode = null;
  if (stage.kind === 'consent') body = <Note text={t('import.needsConsent')} />;
  else if (stage.kind === 'start' || stage.kind === 'unknown' || stage.kind === 'empty') {
    body = <Start stage={stage.kind} moves={moveState} onChoose={() => void choose()} />;
  } else if (stage.kind === 'map') {
    const unitQuestion = stage.read.unit === null ? <Question kind="unit" value={unit ?? ''} onChange={(v) => setUnit(v as 'kg' | 'lb')} /> : null;
    const dumbbellQuestion = anyDumbbell ? <Question kind="dumbbells" value={dumbbells} onChange={(v) => setDumbbells(v as 'one' | 'both')} /> : null;
    const rowsLeftOut = stage.read.leftOut > 0 ? <Note text={t('import.rowsLeftOut', { count: stage.read.leftOut })} /> : null;
    body = (
      <View style={styles.part}>
        <Text style={[styles.heading, { color: color.text }]}>
          {t('import.summary', { sessions: stage.read.sessions.length, sets: setsIn(stage.read), app: t(`import.apps.${stage.read.source}`) })}
        </Text>
        {rowsLeftOut}
        {unitQuestion}
        {dumbbellQuestion}
        <Text style={[styles.label, { color: color.muted }]}>{t('import.moves')}</Text>
        {stage.matched.map((m) => (
          <MoveRow
            key={m.name}
            matched={m}
            chosen={choices.get(m.name) ?? null}
            moves={known}
            byId={byId}
            onPick={(id) => pick(m.name, id)}
            onSavedOwn={(own) => savedOwn(m.name, own)}
          />
        ))}
        <SendPart built={built} progress={progress} problem={problem} onSend={() => void send()} />
      </View>
    );
  } else if (stage.kind === 'done') body = <Done imported={stage.imported} alreadyThere={stage.alreadyThere} built={stage.built} />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{t('import.title')}</ScreenTitle>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const setsIn = (read: Read) => read.sessions.reduce((n, s) => n + s.sets.length, 0);

function Note({ text }: { text: string }) {
  const { color } = useTheme();
  return <Text style={[styles.text, { color: color.textSecondary }]}>{text}</Text>;
}

/** A send that failed: as a note, and said to VoiceOver (K-815). */
function ProblemNote({ text }: { text: string }) {
  const { color } = useTheme();
  return <ProblemText style={[styles.text, { color: color.textSecondary }]}>{text}</ProblemText>;
}

const INTRO = { start: 'import.intro', unknown: 'import.unknown', empty: 'import.empty' } as const;

function Start({ stage, moves, onChoose }: { stage: 'start' | 'unknown' | 'empty'; moves: 'loading' | 'failed' | 'ready'; onChoose: () => void }) {
  const status = moves === 'loading' ? <Note text={t('import.loadingMoves')} /> : moves === 'failed' ? <Note text={t('import.noMoves')} /> : null;
  const label = t(stage === 'start' ? 'import.choose' : 'import.chooseAnother');
  return (
    <View style={styles.part}>
      <Note text={t(INTRO[stage])} />
      <Note text={t('import.privacy')} />
      {status}
      <Button label={label} disabled={moves !== 'ready'} onPress={onChoose} />
    </View>
  );
}

/** The two things a file does not say and the app does not guess (H13 B2, B4): its weight unit, how it counted dumbbells. */
function Question({ kind, value, onChange }: { kind: 'unit' | 'dumbbells'; value: string; onChange: (value: string) => void }) {
  const { color } = useTheme();
  const options = kind === 'unit' ? ['kg', 'lb'] : ['one', 'both'];
  return (
    <View style={styles.part}>
      <Text style={[styles.label, { color: color.text }]}>{t(`import.${kind}.title`)}</Text>
      <Note text={t(`import.${kind}.note`)} />
      <View style={styles.row}>
        {options.map((option) => (
          <Chip key={option} label={t(`import.${kind}.${option}`)} selected={value === option} onPress={() => onChange(option)} />
        ))}
      </View>
    </View>
  );
}

function SendPart({
  built,
  progress,
  problem,
  onSend,
}: {
  built: Built | null;
  progress: { done: number; of: number } | null;
  problem: string | null;
  onSend: () => void;
}) {
  const count = built?.sessions ?? 0;
  return (
    <View style={styles.part}>
      {problem !== null && <ProblemNote text={problem} />}
      {progress !== null && <Note text={t('import.sending', { done: progress.done, of: progress.of })} />}
      {built === null ? (
        <Note text={t('import.unitFirst')} />
      ) : count === 0 ? (
        <Note text={t('import.nothing')} />
      ) : (
        <Button label={count === 1 ? t('import.sendOne') : t('import.send', { count })} disabled={progress !== null} onPress={onSend} />
      )}
    </View>
  );
}

function Done({ imported, alreadyThere, built }: { imported: number; alreadyThere: number; built: Built }) {
  return (
    <View style={styles.part}>
      <Note text={imported === 1 ? t('import.doneOne') : t('import.done', { count: imported })} />
      {alreadyThere > 0 && <Note text={t('import.already', { count: alreadyThere })} />}
      {built.skipped > 0 && <Note text={t('import.skipped', { count: built.skipped })} />}
      {built.leftOut > 0 && <Note text={t('import.leftOut', { count: built.leftOut })} />}
      <Button label={t('import.close')} onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
});
