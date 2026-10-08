import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { type Changed, type Undone, applySuggestion, rebuild, undoChange } from '@/train/changes';
import { dayName, exerciseName } from '@/train/program';
import { repCount } from '@/train/reps';
import { suggestionWords } from '@/train/review';
import { movesOf } from '@/train/trainData';
import { splitName } from '@/train/week';

type Schemas = components['schemas'];
type Part = 'days' | 'moves' | 'changes' | 'split' | 'rebuild';
const PARTS: readonly Part[] = ['days', 'moves', 'changes', 'split', 'rebuild'];

const plural = (key: string, count: number, vars: Record<string, string | number> = {}) =>
  t(`${key}.${count === 1 ? 'one' : 'other'}`, { count, ...vars });
const weekdayOf = (day: Schemas['ProgramDay']) =>
  day.weekday === undefined ? t('editProgram.anyDay') : t(`programEditor.weekdayShort.${day.weekday}`);
const SAID = { conflict: 'editProgram.stale', offline: 'editProgram.offline', failed: 'editProgram.failed' } as const;

/**
 * Edit program (K-970, ADR-073 #3-#4; prototype sheet `#editprog`), route `/edit-program`, each part its own page
 * (`?part=`): the training days; the moves with the review's flags, each suggestion applied from here (ADR-073 #3); the
 * changes from the review in force, each undone with the later ones that needed it said ("N changes applied · Undo");
 * the split as it really is; "Rebuild for me", a new program from the user's training days after a confirmation. Days
 * and moves are only read here: the one way the server takes an edited program (PUT /v1/program) replaces it whole and
 * wipes its targets, so no such edit is offered until the server keeps them (K-995). Every number is the server's.
 */
export default function EditProgramScreen() {
  const { api, training } = useAppServices();
  const { color } = useTheme();
  const params = useLocalSearchParams<{ part?: string }>();
  const part = PARTS.find((p) => p === params.part) ?? null;
  const { data, reload } = useReadOnFocus(
    useCallback(async () => {
      const [read, own] = await Promise.all([training.read(api), training.own(api)]);
      return { ...read, own };
    }, [api, training]),
  );
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

  const program = data?.program.state === 'ready' ? data.program.value : null;
  const moves = movesOf(data, data?.own ?? []);
  const review = program?.review;

  /** One request at a time; its answer said here, and the program read again. */
  const send = async (request: () => Promise<Changed | Undone>, then: (answer: Changed | Undone) => void, said: Record<keyof typeof SAID, string> = SAID) => {
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
      then(answer);
    } else setProblem(t(said[answer.kind]));
    reload();
  };
  const apply = (s: Schemas['ReviewSuggestion']) => {
    if (review !== undefined) void send(() => applySuggestion(api, review.id, s.id), () => undefined);
  };
  // An undo refused is not a stale review: the program changed another way since its last change.
  const undo = (change: Schemas['AppliedReviewChange']) =>
    void send(
      () => undoChange(api, change.id),
      (answer) => {
        const also = 'alsoUndone' in answer ? answer.alsoUndone.length : 0;
        setDone(also === 0 ? t('editProgram.undone') : plural('editProgram.undoneWith', also));
      },
      { ...SAID, conflict: 'editProgram.undoConflict' },
    );
  const rebuildNow = async () => {
    if (sending.current) return;
    const profile = await load(() => api.GET('/v1/profile'));
    if (!shown.current) return;
    if (profile.state !== 'ready') return setProblem(t(profile.state === 'failed' && profile.problem === 'NoConnection' ? 'editProgram.offline' : 'editProgram.noDays'));
    void send(
      () => rebuild(api, profile.value.schedule.trainingDays),
      () => router.dismissTo('/train'),
    );
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
        <Row title={t('editProgram.days')} detail={program.days.map(weekdayOf).join(t('editProgram.dayList'))} onPress={() => open('days')} />
        <Row title={t('editProgram.moves')} detail={flags === 0 ? movesLine : plural('editProgram.flags', flags, { moves: movesLine })} onPress={() => open('moves')} />
        <Row title={t('editProgram.split')} detail={splitName(program)} onPress={() => open('split')} />
        <Row title={t('editProgram.rebuild')} detail={t('editProgram.rebuildRow')} onPress={() => open('rebuild')} />
      </View>
    );
  } else if (program !== null && part === 'days') {
    title = t('editProgram.days');
    body = (
      <View style={styles.rows}>
        {program.days.map((day) => (
          <Text key={day.id} style={[styles.text, { color: color.text }]}>
            {t('train.weekRow', { weekday: weekdayOf(day), day: dayName(day) })}
          </Text>
        ))}
        <Text style={[styles.small, { color: color.textSecondary }]}>{t('editProgram.readOnly')}</Text>
      </View>
    );
  } else if (program !== null && part === 'moves') {
    title = t('editProgram.moves');
    body = (
      <View style={styles.rows}>
        {program.days.map((day) => (
          <View key={day.id} style={styles.day}>
            <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
              {dayName(day)}
            </Text>
            {day.exercises.map((m) => (
              <View key={m.exerciseId} style={styles.move}>
                <Text style={[styles.text, styles.grow, { color: color.text }]}>{exerciseName(m.exerciseId, moves)}</Text>
                <Text style={[styles.small, { color: color.textSecondary }]}>{t('train.setsReps', { sets: m.baseSets, reps: repCount(m.reps) })}</Text>
              </View>
            ))}
          </View>
        ))}
        <Text style={[styles.small, { color: color.textSecondary }]}>{t('editProgram.readOnly')}</Text>
        <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
          {t('editProgram.reviewTitle')}
        </Text>
        {review?.suggestions.length === 0 && <Text style={[styles.text, { color: color.text }]}>{t('editProgram.reviewNone')}</Text>}
        {review?.suggestions.map((s) => (
          <Flag key={s.id} suggestion={s} action={t('editProgram.apply')} busy={busy} onPress={() => apply(s)} />
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
    body = (
      <View style={styles.rows}>
        <Text style={[styles.text, { color: color.text }]}>{t('editProgram.rebuildBody')}</Text>
        <Button label={t('editProgram.rebuildConfirm')} variant="warn" disabled={busy} onPress={() => void rebuildNow()} />
      </View>
    );
  }
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: color.background }]}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{title}</ScreenTitle>
        {body}
        {done !== null && <ProblemText style={[styles.text, { color: color.text }]}>{done}</ProblemText>}
        {problem !== null && (
          <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
            {problem}
          </ProblemText>
        )}
        <Button label={t('editProgram.back')} variant="ghost" onPress={() => router.back()} />
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
      <Button label={action} accessibilityLabel={`${action}: ${title}`} variant="ghost" size="sm" disabled={busy} onPress={onPress} />
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
});
