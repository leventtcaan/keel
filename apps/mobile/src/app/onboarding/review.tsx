import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { DecisionBlock } from '@/components/DecisionBlock';
import { ProblemText, useProblem } from '@/components/ProblemText';
import { t } from '@/copy';
import { applyReview, readReview } from '@/onboarding/bringProgram';
import { broughtProgram } from '@/onboarding/draft';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame, useChoose } from '@/onboarding/StepFrame';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { exerciseName } from '@/train/program';

type Schemas = components['schemas'];
type Suggestion = Schemas['ReviewSuggestion'];

/** A suggestion's words are the app's (copyKey), with the server's numbers and the muscle's or the move's name. */
function words(suggestion: Suggestion, part: 'title' | 'body'): string {
  const { copyKey, numbers, muscle, exerciseId } = suggestion;
  return t(`${copyKey}.${part}`, {
    ...numbers,
    ...(muscle === undefined ? {} : { muscle: t(`demo.muscle.${muscle}`) }),
    ...(exerciseId === undefined ? {} : { exercise: exerciseName(exerciseId) }),
  });
}

/** "Use mine with N changes" counts the suggestions still on; with none on, keeping the program is the one way on. */
function buttonLabel(on: number): string {
  if (on === 0) return t('onboarding.review.keep');
  return on === 1 ? t('onboarding.review.useOne') : t('onboarding.review.use', { count: on });
}

/**
 * #ob-review (ADR-073 #2-#3): the program the user brought, reviewed by the engine on the server (the review rides on the
 * program kept, or is read). Each suggestion is a concrete change with its coaching rule one tap away, and the user's to
 * take or leave: all on at first, each turned off with its switch. "Use mine with N changes" applies the ones on, by the
 * review they came from; a review gone stale (409) is read again and shown again. "Keep mine as is" sends nothing.
 * Either way the walk goes on, and Monday's calls work either way.
 */
export default function ReviewStep() {
  const { draft } = useDraft();
  const { api, report } = useAppServices();
  const { color } = useTheme();
  const choose = useChoose('review');
  const program = draft.ownProgram;
  const [review, setReview] = useState<Schemas['ProgramReview'] | null>(program?.review ?? null);
  const [off, setOff] = useState<ReadonlySet<string>>(new Set());
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
  // A ref, not state: two taps in one frame both see the state from before either ran.
  const working = useRef(false);

  /** The review read again, every suggestion on; false (and said) when it could not be read. */
  const read = useCallback(async (): Promise<boolean> => {
    setProblem(null);
    try {
      setReview(await readReview(api));
      setOff(new Set());
      return true;
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('onboarding.review.loadFailed'));
      return false;
    }
  }, [api, report, setProblem]);
  // Read once on opening when the program came without its review; a failed read is tried again by the user.
  const unread = useRef(review === null);
  useEffect(() => {
    if (!unread.current) return;
    unread.current = false;
    void read();
  }, [read]);

  const picked = review?.suggestions.filter((s) => !off.has(s.id)) ?? [];
  const keep = () => choose({ reviewed: true });
  const use = async () => {
    if (review === null || picked.length === 0 || working.current) return;
    working.current = true;
    setBusy(true);
    setProblem(null);
    try {
      choose({ ...broughtProgram(await applyReview(api, review.id, picked.map((s) => s.id))), reviewed: true });
    } catch (error) {
      const name = error instanceof Error ? error.name : 'Unknown';
      report({ name });
      if (name === 'ReviewStale') {
        if (await read()) setProblem(t('onboarding.review.changed'));
      } else {
        setProblem(t(`onboarding.review.failed.${name === 'NoConnection' ? 'NoConnection' : 'other'}`));
      }
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const toggle = (id: string, on: boolean) =>
    setOff((before) => {
      const next = new Set(before);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });
  const open = (id: string) => setOpened((before) => new Set([...before, id]));

  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const note = (text: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{text}</Text>;
  const moves = program?.days.reduce((n, day) => n + day.exercises.length, 0) ?? 0;
  const count = review?.suggestions.length ?? 0;
  const headline = count === 0 ? t('onboarding.review.headline.none') : count === 1 ? t('onboarding.review.headline.one') : t('onboarding.review.headline.other', { count });
  const notReviewed = review?.notReviewedMoves ?? 0;
  const block =
    review === null ? null : (
      <DecisionBlock eyebrow={t('onboarding.review.size', { days: program?.days.length ?? 0, moves })} title={headline} />
    );
  const loading = review === null && problem === null ? note(t('onboarding.review.loading')) : null;
  const shown = problem === null ? null : (
    <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
      {problem}
    </ProblemText>
  );
  const retry = review === null && problem !== null ? <Button label={t('onboarding.tryAgain')} variant="ghost" size="sm" onPress={() => void read()} /> : null;
  const keepToo = picked.length === 0 ? null : <Button label={t('onboarding.review.keep')} variant="ghost" disabled={busy} onPress={keep} />;
  const actions =
    review === null ? undefined : (
      <View style={styles.actions}>
        {busy && note(t('onboarding.review.applying'))}
        <Button label={buttonLabel(picked.length)} disabled={busy} onPress={picked.length === 0 ? keep : () => void use()} />
        {keepToo}
      </View>
    );

  return (
    <StepFrame step="review" title={t('onboarding.review.title')} chosen actions={actions} backDisabled={busy}>
      {block}
      {loading}
      {shown}
      {retry}
      {review?.suggestions.map((s) => (
        <Card key={s.id} suggestion={s} on={!off.has(s.id)} opened={opened.has(s.id)} disabled={busy} onToggle={(on) => toggle(s.id, on)} onOpen={() => open(s.id)} />
      ))}
      {notReviewed > 0 && note(t('onboarding.review.notReviewed', { count: notReviewed }))}
      {review !== null && note(t('onboarding.review.note'))}
    </StepFrame>
  );
}

type CardProps = { suggestion: Suggestion; on: boolean; opened: boolean; disabled: boolean; onToggle: (on: boolean) => void; onOpen: () => void };

/** One suggestion (prototype `.revc`): the change, its switch, and "Coaching rule" that opens into the rule's words. */
function Card({ suggestion, on, opened, disabled, onToggle, onOpen }: CardProps) {
  const { color } = useTheme();
  const title = words(suggestion, 'title');
  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const rule = opened ? (
    <Text style={[styles.small, { color: color.text }]}>{words(suggestion, 'body')}</Text>
  ) : (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: false }} onPress={onOpen} hitSlop={tokens.space.sm} style={styles.rule}>
      <Text style={[styles.label, { color: color.textSecondary }]}>{t('onboarding.review.rule')}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.card, { backgroundColor: color.surface }, !on && styles.off]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: color.text }]}>{title}</Text>
        <View style={styles.apply}>
          <Text style={[styles.small, { color: color.textSecondary }]}>{t('onboarding.review.apply')}</Text>
          <Switch accessibilityLabel={title} value={on} disabled={disabled} onValueChange={onToggle} />
        </View>
      </View>
      {rule}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.space.sm },
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  off: { opacity: tokens.opacity.dim },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  apply: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  rule: { alignSelf: 'flex-start', minHeight: tokens.size.touch, justifyContent: 'center' },
  title: { flexShrink: 1, fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
