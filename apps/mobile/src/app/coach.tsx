import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { DecisionBlock } from '@/components/DecisionBlock';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { MEAL_CHIP, ask, chipAnswer, coachChips, isChip, readMeal, type Said } from '@/coach/conversation';
import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { weeklyNote } from '@/coach/note';
import { handOffMeal } from '@/food/handoff';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { CoachChips } from '@/today/CoachChips';
import { labelKey, load, localDay, programToday, weekdayDate, type TodayData } from '@/today/today';

type Schemas = components['schemas'];

/** What the box sends to: the coach, or the meal reader (after the meal chip, for one message). */
type Mode = 'ask' | 'meal';

type Message =
  | { from: 'user'; text: string }
  | { from: 'coach'; said: Said; standard: boolean }
  | { from: 'coach'; meal: Schemas['MealDraft'] }
  | { from: 'coach'; problem: 'consent' | 'failed'; text: string; mode: Mode };

/** A message with its own id: a retry removes one, and a draft's picks must stay with their draft (K-509 review). */
type Kept = Message & { id: number };

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
  const [messages, setKept] = useState<Kept[]>([]);
  const ids = useRef(0);
  const setMessages = useCallback(
    (change: (said: Message[]) => Message[]) =>
      setKept((kept) => change(kept).map((message) => ('id' in message ? (message as Kept) : { ...message, id: ++ids.current }))),
    [],
  );
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
      // The week's note opens the conversation (K-517): the call, its leading rule, the one focus — no model, no quota.
      if (live && decision.state === 'ready') {
        const { value } = decision;
        const note: Message = {
          from: 'coach',
          said: { heading: 'coach.note.title', lines: weeklyNote(value), call: { decisionId: value.id, copyKey: value.copyKey, nextReview: value.nextReview } },
          standard: false,
        };
        setMessages((said) => [note, ...said]);
      }
      if (live)
        setToday({
          decision,
          program,
          weighIns,
          consistency: { state: 'none' },
          targets: { state: 'none' },
          budget: { state: 'none' },
        });
    });
    return () => {
      live = false;
    };
  }, [api, day]);

  const answerChip = useCallback(
    (key: string) => {
      if (today === null) return;
      const planned = today.program.state === 'ready' ? programToday(today.program.value, day) : null;
      const session = planned?.kind === 'session' ? planned.day.id : undefined;
      setMessages((said) => [
        ...said,
        { from: 'user', text: t(key) },
        {
          from: 'coach',
          said: chipAnswer(key, today.decision, weekdayDate, session),
          standard: false,
        },
      ]);
    },
    [today, day, setMessages],
  );

  // A chip Today opened the coach with is answered once the day is read — only one of the day's own.
  useEffect(() => {
    if (today === null || opened.current || chip === undefined || !isChip(chip)) return;
    opened.current = true;
    answerChip(chip);
  }, [today, chip, answerChip]);

  const [mode, setMode] = useState<Mode>('ask');

  const onChip = (key: string) => {
    if (key !== MEAL_CHIP) return answerChip(key);
    setMode('meal');
    setMessages((said) => [...said, { from: 'user', text: t(key) }, { from: 'coach', said: { lines: [{ key: 'coach.meal.prompt' }] }, standard: false }]);
  };

  // Shown at once; one message at a time (a ref: two presses in one frame see the same state). A retry sends the same words
  // again, to where they went first, in place of its problem, without saying them twice.
  const busy = useRef(false);
  const send = async (words: string, to: Mode, again = false) => {
    if (words.trim() === '' || busy.current) return;
    busy.current = true;
    setWaiting(true);
    setMode('ask');
    setMessages((said) => (again ? said.filter((message) => !('problem' in message && message.text === words)) : [...said, { from: 'user', text: words }]));
    const answer: Message =
      to === 'meal'
        ? await readMeal(api, words).then((read): Message => (read.state === 'ready' ? { from: 'coach', meal: read.draft } : { from: 'coach', problem: read.state, text: words, mode: to }))
        : await ask(api, words, weekdayDate).then((asked): Message =>
            asked.state === 'ready' ? { from: 'coach', said: asked.said, standard: asked.standard } : { from: 'coach', problem: asked.state, text: words, mode: to },
          );
    busy.current = false;
    setWaiting(false);
    setMessages((said) => [...said, answer]);
  };

  const submit = () => {
    if (text.trim() === '') return;
    const words = text;
    setText('');
    void send(words, mode);
  };

  // The newest message in sight; the box above the keyboard (iOS lifts the view, Android resizes the window).
  const scroll = useRef<ScrollView>(null);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.head}>
          <ScreenTitle>{t('screens.coach.title')}</ScreenTitle>
          {today !== null && <CoachChips keys={coachChips(today, day)} onChip={onChip} />}
        </View>
        <ScrollView ref={scroll} contentContainerStyle={styles.body} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {messages.map((message) => (
            <Bubble key={message.id} message={message} onRetry={(words, to) => void send(words, to, true)} />
          ))}
          {waiting && <Text style={[styles.small, { color: color.muted }]}>{t('coach.thinking')}</Text>}
        </ScrollView>
        <View style={styles.input}>
          <TextField label={t(mode === 'meal' ? 'coach.meal.input' : 'coach.input')} value={text} onChangeText={setText} multiline />
          <Button label={t('coach.send')} size="sm" disabled={waiting || text.trim() === ''} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PROBLEMS = {
  consent: { words: 'coach.consent', way: 'today.consent.open' },
  failed: { words: 'coach.failed', way: 'coach.retry' },
} as const;

function Bubble({ message, onRetry }: { message: Message; onRetry: (text: string, to: Mode) => void }) {
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
    const go = message.problem === 'failed' ? () => onRetry(message.text, message.mode) : () => router.push('/settings');
    return (
      <View style={styles.coach}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t(problem.words)}</Text>
        <Button label={t(problem.way)} variant="ghost" size="sm" onPress={go} />
      </View>
    );
  }
  if ('meal' in message) return <MealSaid draft={message.meal} />;
  const { said, standard } = message;
  return (
    <View style={styles.coach}>
      <Heading words={said.heading} />
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

/**
 * A meal read into a draft (K-504): each food in the user's words and measure with the database's foods for it — a sure
 * match picked, an unsure one asks — and nothing of what they hold (U1: the meal screen estimates from the database).
 * One tap each, then the meal screen takes the picks (in memory, not a link — V3). Unread: the meal screen by name.
 */
function MealSaid({ draft }: { draft: Schemas['MealDraft'] }) {
  const { color } = useTheme();
  const [picks, setPicks] = useState<(string | null)[]>(() => draft.items.map((item) => (item.confident ? (item.candidates[0]?.id ?? null) : null)));
  const line = (words: string) => <Text style={[styles.text, { color: color.text }]}>{words}</Text>;
  if (draft.items.length === 0) {
    return (
      <View style={styles.coach}>
        {line(t('coach.meal.unread'))}
        <Button label={t('coach.meal.byName')} variant="ghost" size="sm" onPress={() => router.push('/meal')} />
      </View>
    );
  }
  // A food the database has nothing for is left to the meal screen (by name); the rest go over once each is picked.
  const matched = draft.items.flatMap((item, i) => (item.candidates.length > 0 ? [{ item, pick: item.candidates.find((food) => food.id === picks[i]) }] : []));
  const ready = matched.length > 0 && matched.every(({ pick }) => pick !== undefined);
  const log = () => {
    if (!ready) return;
    handOffMeal(matched.flatMap(({ item, pick }) => (pick === undefined ? [] : [{ foodId: pick.id, name: pick.name, quantity: item.amount.quantity, unit: item.amount.unit }])));
    router.push('/meal');
  };
  return (
    <View style={styles.coach}>
      {draft.items.map((item, i) => (
        <View key={i} style={styles.coach}>
          {line(t('coach.meal.item', { food: item.food, quantity: String(item.amount.quantity), unit: item.amount.unit }))}
          <MealPick item={item} picked={picks[i]} onPick={(id) => setPicks((before) => before.map((p, j) => (j === i ? id : p)))} />
        </View>
      ))}
      <Button label={t('coach.meal.log')} size="sm" disabled={!ready} onPress={log} />
      <ByName shown={matched.length === 0} />
    </View>
  );
}

/** Nothing to hand over: the meal screen, by name. */
function ByName({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return <Button label={t('coach.meal.byName')} variant="ghost" size="sm" onPress={() => router.push('/meal')} />;
}

/** The database's foods for one item: nothing found says so; an unsure match asks which. */
function MealPick({ item, picked, onPick }: { item: Schemas['MealDraftItem']; picked: string | null; onPick: (id: string) => void }) {
  const { color } = useTheme();
  if (item.candidates.length === 0) return <Text style={[styles.small, { color: color.muted }]}>{t('coach.meal.noMatch', { food: item.food })}</Text>;
  return (
    <>
      {!item.confident && <Text style={[styles.small, { color: color.muted }]}>{t('coach.meal.pick')}</Text>}
      <View style={styles.picks}>
        {item.candidates.map((food) => (
          <Chip key={food.id} label={food.name} selected={picked === food.id} onPress={() => onPick(food.id)} />
        ))}
      </View>
    </>
  );
}

/** A message's small heading (the week's note). */
function Heading({ words }: { words: string | undefined }) {
  const { color } = useTheme();
  if (words === undefined) return null;
  return <Text style={[styles.small, { color: color.muted }]}>{t(words)}</Text>;
}

/** A way on from an answer: today's session, on its program day (as Train opens it). */
function WayOn({ open }: { open: Said['open'] }) {
  if (open === undefined) return null;
  return <Button label={t(open.key)} variant="ghost" size="sm" onPress={() => router.push({ pathname: '/workout', params: { day: open.day } })} />;
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
  head: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.sm,
    gap: tokens.space.sm,
  },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  input: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.sm,
    gap: tokens.space.sm,
  },
  user: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    padding: tokens.space.md,
    borderRadius: tokens.radius.card,
  },
  coach: { gap: tokens.space.sm },
  picks: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
