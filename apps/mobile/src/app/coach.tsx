import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { announce } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { MEAL_CHIP, ask, chipAnswer, isChip, loadHistory, modelOn, readMeal, readyQuestions, remember, type Remembered, type Said } from '@/coach/conversation';
import { t } from '@/copy';
import { MealCard, WalkCard, type WalkToday } from '@/coach/ActionCards';
import { weeklyNote } from '@/coach/note';
import { amountLine } from '@/food/amountText';
import { DraftPicks, anyMatched } from '@/food/DraftPicks';
import { handOffMeal, type HandedMeal } from '@/food/handoff';
import { notificationParams } from '@/notifications/params';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { useReduceMotion } from '@/theme/useReduceMotion';
import { tokens } from '@/theme/tokens';
import { CoachChips } from '@/today/CoachChips';
import { labelKey, load, localDay, programToday, readCall, weekdayDate, type TodayData } from '@/today/today';

type Schemas = components['schemas'];

/** What the box sends to: the coach, or the meal reader (after the meal chip, for one message). */
type Mode = 'ask' | 'meal';

type Message =
  // `typed`: the user's own words (not a chip's), which they may ask the coach to remember (ADR-092 #3).
  | { from: 'user'; text: string; typed?: boolean }
  | { from: 'coach'; said: Said; standard: boolean }
  | { from: 'coach'; meal: Schemas['MealDraft'] }
  | { from: 'coach'; problem: 'consent' | 'subscription' | 'failed'; text: string; mode: Mode }
  // The engine's suggested actions (K-1236, ADR-092 Ek 2 #2): today's walk for the steps left, a food that fits what is left.
  | { from: 'coach'; action: 'walk'; walk: WalkToday }
  | { from: 'coach'; action: 'meal'; suggestion: Schemas['Suggestion'] };

/** A message with its own id: a retry removes one, and a draft's picks must stay with their draft (K-509 review). */
type Kept = Message & { id: number };

/**
 * The coach (K-509, prototype 2.1; ADR-043 #76, ADR-092): chips from the day's data, answered on the phone; a message goes to
 * the server and comes back as the model's words, which the server checked, or as what it is about and the call's rule, said
 * in the app's copy, with the call's card. The engine's own words are marked as such. The conversation so far is read back from
 * the server; a message the user typed can be kept in the coach's memory when they say so, and the keyboard's own microphone
 * dictates. The plan never changes from here: the card leads to why, and applying a call is Today's.
 * Opened as a sheet over any tab; a chip on Today opens it on that chip, and the call's "Ask about this call" opens it about that
 * call (`decisionId`). Its first suggestions are the starter questions ("Explain this call" only with the model on, ADR-092 Ek 2).
 */
export default function CoachScreen() {
  // `write`: opened from This week's line, which looks like the box (ADR-092 Ek 2 #1): the box takes the keyboard at once.
  const { chip, decisionId, write } = useLocalSearchParams<{ chip?: string; decisionId?: string; write?: string }>();
  const { api, reminders } = useAppServices();
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
  const [remembered, setRemembered] = useState<Record<number, Remembered>>({});
  const opened = useRef(false);
  // Whether "Explain this call" is on offer (ADR-092 Ek 2 #3): only when the server says the model is there and paid for. Until it has
  // answered (null) the starters wait, so none is put in front of the others under a finger.
  const [explains, setExplains] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void modelOn(api).then((on) => {
      if (live) setExplains(on);
    });
    return () => {
      live = false;
    };
  }, [api]);

  const [mode, setMode] = useState<Mode>('ask');
  const [focused, setFocused] = useState(false);

  // A meal in words (K-504): the box sends the next message to the meal reader. Reached by a link (`chip=coach.meal.chip`), no
  // longer by a ready question: it is a feature, not a question (ADR-092 Ek 2 #4).
  const startMeal = useCallback(() => {
    setMode('meal');
    setMessages((said) => [...said, { from: 'user', text: t(MEAL_CHIP) }, { from: 'coach', said: { lines: [{ key: 'coach.meal.prompt' }] }, standard: false }]);
  }, [setMessages]);

  // The day's parts the chips are made of: the call, the program, today's weigh-ins.
  useEffect(() => {
    let live = true;
    void Promise.all([
      load(() => api.GET('/v1/decisions/current')).then(readCall),
      load(() => api.GET('/v1/program')),
      load(() => api.GET('/v1/weigh-ins', { params: { query: { from: day, to: day } } })),
      loadHistory(api),
      // The engine's suggestions for the action cards: none is no card, and a read that fails is none (the coach goes on).
      Promise.resolve()
        .then(() => reminders.walkToday())
        .catch(() => null),
      load(() => api.GET('/v1/days/{day}/suggestions', { params: { path: { day } } })),
    ]).then(([decision, program, weighIns, past, walk, suggested]) => {
      // The week's note opens the conversation (K-517): the call, its leading rule, the one focus — no model, no quota. Then where the
      // conversation was left (ADR-092 #3), and anything said now after it.
      const start: Message[] = [];
      if (live && decision.state === 'ready') {
        // Its first sentence is the call's own words: no card to say them twice.
        start.push({ from: 'coach', said: { heading: 'coach.note.title', lines: weeklyNote(decision.value) }, standard: false });
      }
      if (live) {
        start.push(...past.map((message): Message => (message.from === 'user' ? { from: 'user', text: message.text, typed: true } : { from: 'coach', said: message.said, standard: message.standard })));
        // Then what the engine suggests today, after where the conversation was left, so it is in sight on opening: a walk only for
        // enough steps left to be worth a ring (the nudge's own floor), one food that fits.
        if (walk !== null && walk.remaining >= notificationParams.walkNudgeMinRemaining) start.push({ from: 'coach', action: 'walk', walk });
        const fits = suggested.state === 'ready' ? suggested.value[0] : undefined;
        if (fits !== undefined) start.push({ from: 'coach', action: 'meal', suggestion: fits });
        if (start.length > 0) setMessages((said) => [...start, ...said]);
      }
      // Opened for a meal in words: after the opening, the box asks for the meal.
      if (live && chip === MEAL_CHIP && !opened.current) {
        opened.current = true;
        startMeal();
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
  }, [api, reminders, day, chip, setMessages, startMeal]);

  const answerChip = useCallback(
    (key: string) => {
      if (today === null) return;
      const planned = today.program.state === 'ready' ? programToday(today.program.value, day) : null;
      const session = planned?.kind === 'session' ? planned.day.id : undefined;
      const answer: Message = { from: 'coach', said: chipAnswer(key, today.decision, weekdayDate, session), standard: false };
      setMessages((said) => [...said, { from: 'user', text: t(key) }, answer]);
      announce(spokenOf(answer));
    },
    [today, day, setMessages],
  );


  // A chip a link opened the coach with is answered once the day is read — only one of the day's own (the meal in words: below).
  useEffect(() => {
    if (today === null || opened.current || chip === undefined || !isChip(chip)) return;
    opened.current = true;
    answerChip(chip);
  }, [today, chip, answerChip]);

  const onChip = (key: string) => (key === MEAL_CHIP ? startMeal() : answerChip(key));

  // Shown at once; one message at a time (a ref: two presses in one frame see the same state). A retry sends the same words
  // again, to where they went first, in place of its problem, without saying them twice.
  const busy = useRef(false);
  const send = async (words: string, to: Mode, again = false) => {
    if (words.trim() === '' || busy.current) return;
    busy.current = true;
    setWaiting(true);
    announce(t('coach.thinking'));
    setMode('ask');
    setMessages((said) => (again ? said.filter((message) => !('problem' in message && message.text === words)) : [...said, { from: 'user', text: words, typed: true }]));
    const answer: Message =
      to === 'meal'
        ? await readMeal(api, words).then((read): Message => (read.state === 'ready' ? { from: 'coach', meal: read.draft } : { from: 'coach', problem: read.state, text: words, mode: to }))
        : await ask(api, words, weekdayDate, decisionId).then((asked): Message =>
            asked.state === 'ready' ? { from: 'coach', said: asked.said, standard: asked.standard } : { from: 'coach', problem: asked.state, text: words, mode: to },
          );
    busy.current = false;
    setWaiting(false);
    setMessages((said) => [...said, answer]);
    announce(spokenOf(answer));
  };

  // The model's starter questions (ADR-092 #7): "This week" is sent as it is, about the call the coach was opened on; "What if…" puts
  // the start of the user's own question in the box.
  const onStarter = (key: string) => {
    if (key === 'coach.starter.whatif') setText(t('coach.starter.whatifStart'));
    else void send(t(key), 'ask');
  };

  const submit = () => {
    if (text.trim() === '') return;
    const words = text;
    setText('');
    void send(words, mode);
  };

  // "Remember this" (ADR-092 #3): asked of the server once per message; the answer says whether it was kept.
  const keep = async (id: number, words: string) => {
    if (remembered[id] === 'saved') return;
    const result = await remember(api, words);
    setRemembered((now) => ({ ...now, [id]: result }));
    announce(t(REMEMBER_WORDS[result]));
  };

  // The newest message in sight; the box above the keyboard (iOS lifts the view, Android resizes the window). The coach opens as
  // a sheet, so the view does not start at the top of the screen: KeyboardAvoidingView reads its own frame in the sheet against
  // the keyboard's place on the screen, so it is told how far down the screen it starts, or the box stays under the keyboard.
  // The sheet stands on the screen's foot, so that is the window's height less the sheet's, plus where the view sits in the
  // sheet (the safe area's top). Measured from layout: inside a sheet, measuring in the window answers from the sheet's top.
  const scroll = useRef<ScrollView>(null);
  const reduceMotion = useReduceMotion();
  const display = useWindowDimensions();
  const [sheet, setSheet] = useState<number | null>(null);
  const [inset, setInset] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const top = sheet === null ? 0 : Math.max(0, display.height - sheet + inset);
  return (
    <SafeAreaView
      testID="coach-sheet"
      style={[styles.safe, { backgroundColor: color.background }]}
      edges={['top', 'bottom']}
      onLayout={(event) => setSheet(event.nativeEvent.layout.height)}>
      <View testID="coach-frame" style={styles.safe} onLayout={(event) => setInset(event.nativeEvent.layout.y)}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={top}>
          {/* Once the conversation is scrolled under it, a quiet line sets the title apart (no hard cut of a bubble under it). */}
          <View testID="coach-head" style={[styles.head, { borderBottomColor: scrolled ? color.line : 'transparent' }]}>
            <ScreenTitle>{t('screens.coach.title')}</ScreenTitle>
          </View>
          <ScrollView
            testID="coach-list"
            ref={scroll}
            scrollEventThrottle={16}
            onScroll={(event) => setScrolled(event.nativeEvent.contentOffset.y > 0)}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: !reduceMotion })}
            // The keyboard shrinks the list, not its content: the newest message is brought back into sight.
            onLayout={() => scroll.current?.scrollToEnd({ animated: false })}>
            {messages.map((message) => (
              <Bubble
                key={message.id}
                message={message}
                kept={remembered[message.id]}
                onRemember={() => void keep(message.id, 'text' in message && message.from === 'user' ? message.text : '')}
                onRetry={(words, to) => void send(words, to, true)}
              />
            ))}
            {waiting && <Text style={[styles.small, { color: color.muted }]}>{t('coach.thinking')}</Text>}
          </ScrollView>
          <Bar
            // While words are being written the ready questions step aside: the messages keep the room above the keyboard.
            // The ready questions only while the box is in use, and not once words are being written (ADR-092 Ek 2 #4: the coach opens
            // calm, the engine's cards first): one row, the day's own questions, a starter only with the model on and paid for.
            ready={
              !focused || text !== '' || today === null || explains === null
                ? []
                : [{ keys: readyQuestions(today, day, explains), onChip: (key: string) => (key.startsWith('coach.starter.') ? onStarter(key) : onChip(key)) }]
            }
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            label={t(mode === 'meal' ? 'coach.meal.input' : 'coach.input')}
            focus={write === '1'}
            text={text}
            onChangeText={setText}
            canSend={!waiting && text.trim() !== ''}
            onSend={submit}
          />
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const PROBLEMS = {
  consent: { words: 'coach.consent', way: 'today.consent.open' },
  subscription: { words: 'coach.subscription', way: 'subscription.seePlans' },
  failed: { words: 'coach.failed', way: 'coach.retry' },
} as const;

/** A meal in words without a subscription says its own line: logging the meal by name still works (ADR-057 D5). */
const wordsOf = (kind: keyof typeof PROBLEMS, mode: Mode, words: string) => (kind === 'subscription' && mode === 'meal' ? 'coach.mealSubscription' : words);

/** Where a problem's button goes: Settings for the consent, the plans for the subscription (K-702, opened only on a tap). */
const WAYS = { consent: '/settings', subscription: '/paywall' } as const;

/** A food the meal reader found, in the user's words and measure. */
const mealItem = (item: Schemas['MealDraft']['items'][number]) =>
  amountLine(item.food, item.amount);

/**
 * What VoiceOver says when a coach message arrives (K-815): the words its bubble shows, in order — the answer appears below
 * where VoiceOver is, so it would go unheard. The call's card and the buttons are there to be found; they are not read out.
 */
function spokenOf(message: Message): string {
  if (message.from === 'user') return message.text;
  if ('action' in message) return message.action === 'walk' ? `${t('coach.action.walk.title')} ${message.walk.body}` : `${t('coach.action.meal.title')} ${amountLine(message.suggestion.name, message.suggestion.amount)}`;
  if ('problem' in message) return t(wordsOf(message.problem, message.mode, PROBLEMS[message.problem].words));
  if ('meal' in message) {
    const { items } = message.meal;
    if (items.length === 0) return t('coach.meal.unread');
    return items.map(mealItem).join(' ');
  }
  const { said, standard } = message;
  const words = [...(said.heading === undefined ? [] : [t(said.heading)]), ...(said.text === undefined ? [] : [said.text]), ...said.lines.map((line) => t(line.key, line.values))];
  return [...words, ...(standard ? [t('coach.standard')] : [])].join(' ');
}

/** What "Remember this" said back (coach.remember*). */
const REMEMBER_WORDS: Record<Remembered, string> = {
  saved: 'coach.remembered',
  full: 'coach.rememberFull',
  refused: 'coach.rememberRefused',
  failed: 'coach.rememberFailed',
};

function Bubble({
  message,
  kept,
  onRemember,
  onRetry,
}: {
  message: Message;
  kept: Remembered | undefined;
  onRemember: () => void;
  onRetry: (text: string, to: Mode) => void;
}) {
  const { color } = useTheme();
  if (message.from === 'user') {
    // The user's own words may be kept by the coach, only when they say so (ADR-092 #3); a chip's words are the app's, not theirs.
    const said = kept === undefined ? null : <Text style={[styles.small, { color: color.muted }]}>{t(REMEMBER_WORDS[kept])}</Text>;
    const way = message.typed !== true || kept === 'saved' ? null : <Button label={t('coach.remember')} variant="ghost" size="sm" onPress={onRemember} />;
    return (
      <View style={styles.userSide}>
        <View testID="user-bubble" style={[styles.user, { backgroundColor: color.accent }]}>
          <Text style={[styles.text, { color: color.onAccent }]}>{message.text}</Text>
        </View>
        {way}
        {said}
      </View>
    );
  }
  if ('problem' in message) {
    // Without the consent, the way to Settings; without a subscription, the way to the plans; with no answer, the same words again.
    const problem = PROBLEMS[message.problem];
    const kind = message.problem;
    const go = kind === 'failed' ? () => onRetry(message.text, message.mode) : () => router.push(WAYS[kind]);
    return (
      <View style={styles.coachSide}>
        <CoachWords>
          <Text style={[styles.text, { color: color.textSecondary }]}>{t(wordsOf(message.problem, message.mode, problem.words))}</Text>
        </CoachWords>
        <Button label={t(problem.way)} variant="ghost" size="sm" onPress={go} />
      </View>
    );
  }
  if ('action' in message) return message.action === 'walk' ? <WalkCard walk={message.walk} /> : <MealCard suggestion={message.suggestion} />;
  if ('meal' in message) return <MealSaid draft={message.meal} />;
  const { said, standard } = message;
  // The model's words, checked on the server (ADR-092 #2), first; then the app's own lines. Built outside the JSX children (the raw-text guard).
  const words = said.text === undefined ? null : <Text style={[styles.text, { color: color.text }]}>{said.text}</Text>;
  // The words in the coach's sand bubble; the call's card and the way on after it, on the page (ADR-094 §3, y5-e3).
  return (
    <View style={styles.coachSide}>
      <CoachWords>
        <Heading words={said.heading} />
        {words}
        {said.lines.map((line) => (
          <Text key={line.key} style={[styles.text, { color: color.text }]}>
            {t(line.key, line.values)}
          </Text>
        ))}
        {standard && <Text style={[styles.small, { color: color.muted }]}>{t('coach.standard')}</Text>}
      </CoachWords>
      {said.call !== undefined && <CallSaid call={said.call} />}
      <WayOn open={said.open} />
    </View>
  );
}

/**
 * A meal read into a draft (K-504): each food in the user's words and measure, picked among the database's foods
 * (DraftPicks); then the meal screen takes the picks (in memory, not a link — V3). Unread: the meal screen by name.
 */
function MealSaid({ draft }: { draft: Schemas['MealDraft'] }) {
  const { color } = useTheme();
  if (draft.items.length === 0) {
    return (
      <View style={styles.coachSide}>
        <CoachWords>
          <Text style={[styles.text, { color: color.text }]}>{t('coach.meal.unread')}</Text>
        </CoachWords>
        <Button label={t('coach.meal.byName')} variant="ghost" size="sm" onPress={() => router.push('/meal')} />
      </View>
    );
  }
  const log = (items: HandedMeal) => {
    handOffMeal(items);
    router.push('/meal');
  };
  return (
    <View style={styles.coachSide}>
      <DraftPicks
        draft={draft}
        describe={mealItem}
        onLog={log}
      />
      <ByName shown={!anyMatched(draft)} />
    </View>
  );
}

/** Nothing to hand over: the meal screen, by name. */
function ByName({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return <Button label={t('coach.meal.byName')} variant="ghost" size="sm" onPress={() => router.push('/meal')} />;
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

/**
 * The call as it stands: its words and when new data looks at it again; on to why. No apply here (Today's). A card inside the
 * answer, on the sage ground of time (ADR-094 §3), its title in the serif voice as the call speaks everywhere.
 */
function CallSaid({ call }: { call: Schemas['CoachCall'] }) {
  const { color } = useTheme();
  return (
    <View testID="coach-call" style={[styles.card, { backgroundColor: color.tintTime }]}>
      <Text style={[styles.small, { color: color.muted }]}>{t(labelKey(call.copyKey))}</Text>
      <Text accessibilityRole="header" style={[styles.callTitle, { color: color.text }]}>
        {t(`${call.copyKey}.title`)}
      </Text>
      <Text style={[styles.small, { color: color.textSecondary }]}>{t('coach.call.nextReview', { date: weekdayDate(call.nextReview) })}</Text>
      <Button label={t('today.call.data')} variant="text" size="sm" onPress={() => router.push({ pathname: '/why', params: { id: call.decisionId } })} />
    </View>
  );
}

/** The coach's words: a sand bubble on the left (ADR-094 §3, y5-e3). */
function CoachWords({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View testID="coach-bubble" style={[styles.said, { backgroundColor: color.tintDay }]}>
      {children}
    </View>
  );
}

type Ready = { keys: string[]; onChip: (key: string) => void };

/** How many lines the box shows before it scrolls. */
const BOX_LINES = 3;

/**
 * The foot of the screen (ADR-094 §3, y5-e3), above the keyboard: the ready questions as sand pills, then one line to write in
 * and the petrol send, the screen's one fill. The field's name and the dictation hint (the keyboard's own microphone) are read
 * by VoiceOver; the name is also the words inside the empty box.
 */
function Bar({ ready, label, focus, onFocus, onBlur, text, onChangeText, canSend, onSend }: { ready: Ready[]; label: string; focus: boolean; onFocus: () => void; onBlur: () => void; text: string; onChangeText: (text: string) => void; canSend: boolean; onSend: () => void }) {
  const { color } = useTheme();
  // The box grows to three lines at the reader's text size (Dynamic Type), then scrolls.
  const { fontScale } = useWindowDimensions();
  return (
    <View testID="coach-bar" style={styles.bar}>
      {ready.map((row) => (
        <CoachChips key={row.keys.join()} keys={row.keys} onChip={row.onChip} />
      ))}
      <View style={styles.line}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={t('coach.dictate')}
          placeholder={label}
          autoFocus={focus}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholderTextColor={color.muted}
          value={text}
          onChangeText={onChangeText}
          multiline
          // The box's edge in the control edge (3:1, WCAG 1.4.11, K-816): its words are only a placeholder.
          style={[styles.box, { backgroundColor: color.tintDay, borderColor: color.edge, color: color.text, maxHeight: tokens.size.touch * BOX_LINES * fontScale }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('coach.send')}
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          style={({ pressed }) => [styles.send, { backgroundColor: color.cta }, (!canSend || pressed) && styles.dim]}>
          <Icon name="arrow.up" tone="onCta" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  head: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xs,
    borderBottomWidth: tokens.border.hairline,
    gap: tokens.space.sm,
  },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  bar: { paddingBottom: tokens.space.sm, gap: tokens.space.sm },
  line: { flexDirection: 'row', alignItems: 'flex-end', gap: tokens.space.sm, paddingHorizontal: tokens.space.lg },
  box: {
    flex: 1,
    minHeight: tokens.size.touch,
    borderWidth: tokens.border.hairline,
    borderRadius: tokens.radius.button,
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.sm + tokens.space.xs,
    paddingBottom: tokens.space.sm + tokens.space.xs,
    fontSize: tokens.type.body,
  },
  send: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.size.touch / 2, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.xs },
  callTitle: { ...tokens.face.display, fontSize: tokens.type.heading },
  said: { alignSelf: 'flex-start', maxWidth: '92%', padding: tokens.space.md, borderRadius: tokens.radius.card, gap: tokens.space.sm },
  userSide: { alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '85%', gap: tokens.space.xs },
  user: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    padding: tokens.space.md,
    borderRadius: tokens.radius.card,
  },
  coachSide: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
