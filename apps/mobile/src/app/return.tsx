import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { ProblemText } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { easeExamples } from '@/return/examples';
import { type ReturnChoice, type ReturnSummary, answerReturn, readReturn } from '@/return/returnApi';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { movesOf } from '@/train/trainData';
import { weekdayDate } from '@/today/today';

/** What the screen has: the summary and the weights "Ease back in" names (null: it names none). */
type Read = { state: 'loading' } | { state: 'failed'; words: string } | { state: 'ready'; summary: ReturnSummary; examples: string | null };

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

/**
 * Coming back after a gap in the log (K-981, ADR-077 #5 and Ek 6, prototype #return): three ways to go on, the one the
 * server suggests first marked and chosen to begin with, and the day of the next call. Opened over the tabs when the
 * server says to ask (useReturnPrompt); the gap, the question and the suggestion are all the server's (GET /v1/return) —
 * the phone shows them and counts nothing. The answer is kept by the server (POST /v1/return), which asks no more for this
 * gap. Honest words: what is kept is said (the plan, the logs, the goals), nothing about a streak, nothing held against
 * anyone (U7). "Rebuild my plan" goes on to the program's own rebuild page, which asks before it replaces anything.
 * Suggested, never insisted on (ADR-077 #5): "Not now" is always there, loading, ready or failed, and leaves with nothing sent;
 * the server asks again next time. Not by a swipe (the root layout), and by itself if the server no longer asks.
 */
export default function ReturnScreen() {
  const { api, training, report } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const [read, setRead] = useState<Read>({ state: 'loading' });
  const [choice, setChoice] = useState<ReturnChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);

  /** The summary and the program behind "Ease back in"; the server no longer asking leaves the screen. */
  const readAll = useCallback(async (): Promise<Read | null> => {
    const [summary, train] = await Promise.all([readReturn(api), training.read(api).catch(() => null)]);
    if (summary.state !== 'ready') {
      return { state: 'failed', words: summary.state === 'failed' && summary.problem === 'NoConnection' ? 'return.noConnection' : 'return.refused' };
    }
    if (!summary.value.shouldPrompt) return null; // answered since (another phone), or no gap: nothing to ask
    const program = train?.program.state === 'ready' ? train.program.value : null;
    return { state: 'ready', summary: summary.value, examples: program === null ? null : easeExamples(program, movesOf(train, []), units) };
  }, [api, training, units]);

  const show = useCallback((next: Read | null) => {
    if (next === null) return router.back();
    // The suggested one is chosen to begin with; a choice already made stays through a read again.
    if (next.state === 'ready') setChoice((now) => now ?? next.summary.suggested);
    setRead(next);
  }, []);

  useEffect(() => {
    let current = true;
    void readAll().then((next) => current && show(next));
    return () => {
      current = false;
    };
  }, [readAll, show]);

  function retry() {
    setRead({ state: 'loading' });
    void readAll().then(show);
  }

  async function answer() {
    if (choice === null || sending.current) return;
    sending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      await answerReturn(api, choice);
      // The result is the screen it leaves for: This week (today's targets, a step lighter after a long break), or the
      // program's rebuild page, which asks before it replaces the program.
      if (choice === 'REBUILD') router.replace({ pathname: '/edit-program', params: { part: 'rebuild' } });
      else router.back();
    } catch (error) {
      report({ name: nameOf(error) });
      setProblem(nameOf(error) === 'NoConnection' ? 'return.noConnection' : 'return.refused');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const notNow = <Button label={t('return.later')} variant="ghost" onPress={() => router.back()} disabled={busy} />;
  if (read.state === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
        <View style={[styles.body, styles.fill]}>
          <ScreenTitle>{t('return.title')}</ScreenTitle>
          <ActivityIndicator accessible accessibilityLabel={t('return.loading')} color={color.muted} />
        </View>
        <View style={styles.footer}>{notNow}</View>
      </SafeAreaView>
    );
  }
  if (read.state === 'failed') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <ScreenTitle>{t('return.title')}</ScreenTitle>
          <ProblemText style={[styles.text, { color: color.text }]}>{t(read.words)}</ProblemText>
          <Button label={t('return.retry')} onPress={retry} />
          {notNow}
        </View>
      </SafeAreaView>
    );
  }

  const { summary, examples } = read;
  const options: { choice: ReturnChoice; title: string; body: string }[] = [
    {
      choice: 'EASE_BACK',
      title: t('return.ease.title'),
      body: examples === null ? t('return.ease.plain') : t('return.ease.body', { moves: examples }),
    },
    { choice: 'PICK_UP', title: t('return.pickUp.title'), body: t('return.pickUp.body') },
    { choice: 'REBUILD', title: t('return.rebuild.title'), body: t('return.rebuild.body') },
  ];
  const away = t(summary.awayDays === 1 ? 'return.away.one' : 'return.away.other', { days: summary.awayDays });
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('return.title')}</ScreenTitle>
        <Text style={[styles.text, { color: color.textSecondary }]}>{away}</Text>
        {options.map((option) => {
          const suggested = option.choice === summary.suggested;
          return (
            <OptionCard
              key={option.choice}
              title={option.title}
              body={option.body}
              {...(suggested ? { tag: t('return.suggested'), hero: true } : {})}
              selected={choice === option.choice}
              disabled={busy}
              onPress={() => setChoice(option.choice)}
            />
          );
        })}
        {summary.nextCallOn !== undefined && (
          <Text style={[styles.next, { color: color.text }]}>{t('return.nextCall', { date: weekdayDate(summary.nextCallOn) })}</Text>
        )}
        {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{t(problem)}</ProblemText>}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t('return.continue')} onPress={() => void answer()} disabled={busy || choice === null} />
        {notNow}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  text: { fontSize: tokens.type.body },
  next: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  fill: { flex: 1 },
  footer: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
});
