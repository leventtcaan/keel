import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { DecisionBlock } from '@/components/DecisionBlock';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { ask, chipAnswer, isChip, type Said } from '@/coach/conversation';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { CoachChips } from '@/today/CoachChips';
import { chips, labelKey, load, localDay, weekdayDate, type TodayData } from '@/today/today';

type Schemas = components['schemas'];

type Message =
  | { from: 'user'; text: string }
  | { from: 'coach'; said: Said; standard: boolean }
  | { from: 'coach'; problem: 'consent' | 'failed'; text: string };

/**
 * The coach (K-509, prototype 2.1; ADR-043 #76): chips from the day's data, answered on the phone; a message goes to the
 * server and comes back as what it is about and the call's rule, said in the app's copy, with the call's card. The engine's
 * own words are marked as such. The plan never changes from here: the card leads to why, and applying a call is Today's.
 * Opened as a sheet over any tab; a chip on Today opens it on that chip.
 */
export default function CoachScreen() {
  const { chip } = useLocalSearchParams<{ chip?: string }>();
  const { api } = useAppServices();
  const { color } = useTheme();
  const [day] = useState(() => localDay(new Date()));
  const [today, setToday] = useState<TodayData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [waiting, setWaiting] = useState(false);
  const opened = useRef(false);

  // The day's parts the chips are made of: the call, the program, today's weigh-ins.
  useEffect(() => {
    let live = true;
    void Promise.all([
      load(() => api.GET('/v1/decisions/current')),
      load(() => api.GET('/v1/program')),
      load(() => api.GET('/v1/weigh-ins', { params: { query: { from: day, to: day } } })),
    ]).then(([decision, program, weighIns]) => {
      if (live) setToday({ decision, program, weighIns, consistency: { state: 'none' }, targets: { state: 'none' }, budget: { state: 'none' } });
    });
    return () => {
      live = false;
    };
  }, [api, day]);

  const answerChip = useCallback(
    (key: string) => {
      const decision = today?.decision.state === 'ready' ? today.decision.value : null;
      setMessages((said) => [...said, { from: 'user', text: t(key) }, { from: 'coach', said: chipAnswer(key, decision, weekdayDate), standard: false }]);
    },
    [today],
  );

  // A chip Today opened the coach with is answered once the day is read — only one of the day's own.
  useEffect(() => {
    if (today === null || opened.current || chip === undefined || !isChip(chip)) return;
    opened.current = true;
    answerChip(chip);
  }, [today, chip, answerChip]);

  // Shown at once; one message at a time (a ref: two presses in one frame see the same state). A retry sends the same words
  // again in place of its problem, without saying them twice.
  const busy = useRef(false);
  const send = async (words: string, again = false) => {
    if (words.trim() === '' || busy.current) return;
    busy.current = true;
    setWaiting(true);
    setMessages((said) => (again ? said.filter((message) => !('problem' in message && message.text === words)) : [...said, { from: 'user', text: words }]));
    const asked = await ask(api, words, weekdayDate);
    busy.current = false;
    setWaiting(false);
    setMessages((said) => [
      ...said,
      asked.state === 'ready' ? { from: 'coach', said: asked.said, standard: asked.standard } : { from: 'coach', problem: asked.state, text: words },
    ]);
  };

  const submit = () => {
    if (text.trim() === '' || busy.current) return;
    const words = text;
    setText('');
    void send(words);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <ScreenTitle>{t('screens.coach.title')}</ScreenTitle>
        {today !== null && <CoachChips keys={chips(today, day)} onChip={answerChip} />}
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {messages.map((message, i) => (
          <Bubble key={i} message={message} onRetry={(words) => void send(words, true)} />
        ))}
        {waiting && <Text style={[styles.small, { color: color.muted }]}>{t('coach.thinking')}</Text>}
      </ScrollView>
      <View style={styles.input}>
        <TextField label={t('coach.input')} value={text} onChangeText={setText} multiline />
        <Button label={t('coach.send')} size="sm" disabled={waiting || text.trim() === ''} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

const PROBLEMS = {
  consent: { words: 'coach.consent', way: 'today.consent.open' },
  failed: { words: 'coach.failed', way: 'coach.retry' },
} as const;

function Bubble({ message, onRetry }: { message: Message; onRetry: (text: string) => void }) {
  const { color } = useTheme();
  if (message.from === 'user') {
    return (
      <View style={[styles.user, { backgroundColor: color.surface }]}>
        <Text style={[styles.text, { color: color.text }]}>{message.text}</Text>
      </View>
    );
  }
  if ('problem' in message) {
    // Without the consent, the way to Settings; with no answer, the same words again.
    const problem = PROBLEMS[message.problem];
    const go = message.problem === 'failed' ? () => onRetry(message.text) : () => router.push('/settings');
    return (
      <View style={styles.coach}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t(problem.words)}</Text>
        <Button label={t(problem.way)} variant="ghost" size="sm" onPress={go} />
      </View>
    );
  }
  const { said, standard } = message;
  return (
    <View style={styles.coach}>
      {said.lines.map((line) => (
        <Text key={line.key} style={[styles.text, { color: color.text }]}>
          {t(line.key, line.values)}
        </Text>
      ))}
      {standard && <Text style={[styles.small, { color: color.muted }]}>{t('coach.standard')}</Text>}
      {said.call !== undefined && <CallSaid call={said.call} />}
      <WayOn open={said.open} />
    </View>
  );
}

/** A way on from an answer: the session, for a swap. */
function WayOn({ open }: { open: Said['open'] }) {
  if (open === undefined) return null;
  return <Button label={t(open.key)} variant="ghost" size="sm" onPress={() => router.push(open.path)} />;
}

/** The call as it stands: its words and when new data looks at it again; on to why. No apply here (Today's). */
function CallSaid({ call }: { call: Schemas['CoachCall'] }) {
  const { color } = useTheme();
  return (
    <DecisionBlock eyebrow={t(labelKey(call.copyKey))} title={t(`${call.copyKey}.title`)}>
      <Text style={[styles.small, { color: color.decisionMuted }]}>{t('coach.call.nextReview', { date: weekdayDate(call.nextReview) })}</Text>
      <Button label={t('today.call.data')} variant="ghost" size="sm" onPress={() => router.push({ pathname: '/why', params: { id: call.decisionId } })} />
    </DecisionBlock>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  head: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.sm, gap: tokens.space.sm },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  input: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm, gap: tokens.space.sm },
  user: { alignSelf: 'flex-end', maxWidth: '85%', padding: tokens.space.md, borderRadius: tokens.radius.card },
  coach: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
