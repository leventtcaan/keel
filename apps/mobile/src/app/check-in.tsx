import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProblemText } from '@/components/ProblemText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import {
  answersOf,
  type CheckIn,
  choiceKey,
  loadCheckIn,
  type Picks,
  type Question,
  SCALE,
  type SendProblem,
  sendAnswers,
} from '@/checkIn/checkIn';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import type { Loaded } from '@/today/today';

const SAID: Record<SendProblem, string> = {
  NoConnection: 'checkIn.screen.sendFailed',
  Moved: 'checkIn.screen.moved',
  Consent: 'today.consent.body',
  ServerError: 'checkIn.screen.serverError',
};

/**
 * This week's check-in (K-501, U9, 04-faz3 §8.5): only the questions the server asks, in its order, each with why it is
 * asked; the answers go once, under one clientId made for this screen, and the engine makes the week's call — then back
 * to Today, which reads it. The answers live on this screen only: no queue, no store, no log (V4 — CYCLE_STOPPED's
 * answer is not kept at all, ADR-020 L-1); a send that fails leaves them here to send again. A 409 is the week having
 * moved or its call already made: the check-in is read again and its answers start over.
 */
export default function CheckInScreen() {
  const { api, report } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const [checkIn, setCheckIn] = useState<Loaded<CheckIn> | null>(null);
  const [picks, setPicks] = useState<Picks>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<SendProblem | null>(null);
  const [clientId] = useState(newClientId);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);
  // Left while the answers were on their way (the system's swipe back): their arrival closes nothing — Today reads the
  // call on its own focus.
  const here = useRef(true);
  useEffect(
    () => () => {
      here.current = false;
    },
    [],
  );

  // Read on arrival and again on asking (a retry, the week moved); an answer landing after the screen left is dropped.
  const [reads, setReads] = useState(0);
  const read = () => setReads((n) => n + 1);
  useEffect(() => {
    let live = true;
    void loadCheckIn(api).then((found) => {
      if (!live) return;
      setCheckIn(found);
      setPicks({});
      // Read again after the week moved: if its call is made, that is all there is to say.
      if (found.state === 'ready' && found.value.answered) setProblem(null);
    });
    return () => {
      live = false;
    };
  }, [api, reads]);

  async function send(current: CheckIn) {
    const answers = answersOf(current, picks, units);
    if (answers === null || sending.current) return;
    sending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const result = await sendAnswers(api, { clientId, weekOf: current.weekOf, answers });
      if ('call' in result) {
        if (here.current) router.back();
        return;
      }
      report({ name: result.problem });
      setProblem(result.problem);
      if (result.problem === 'Moved') read();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const said = problem === null ? null : <ProblemText style={[styles.text, { color: color.text }]}>{t(SAID[problem])}</ProblemText>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel={t('checkIn.screen.back')} onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t('checkIn.screen.back')}`}</Text>
        </Pressable>
        <ScreenTitle>{t('checkIn.screen.title')}</ScreenTitle>
        <Body
          checkIn={checkIn}
          picks={picks}
          onPick={(kind, pick) => setPicks((now) => ({ ...now, [kind]: pick }))}
          onRetry={read}
        />
        {said}
      </ScrollView>
      <Footer checkIn={checkIn} ready={checkIn?.state === 'ready' && answersOf(checkIn.value, picks, units) !== null} busy={busy} onSend={send} />
    </SafeAreaView>
  );
}

type BodyProps = {
  checkIn: Loaded<CheckIn> | null;
  picks: Picks;
  onPick: (kind: Question['kind'], pick: string) => void;
  onRetry: () => void;
};

function Body({ checkIn, picks, onPick, onRetry }: BodyProps) {
  const { color } = useTheme();
  const line = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  if (checkIn === null) return null;
  switch (checkIn.state) {
    case 'consent':
      return (
        <View style={styles.note}>
          {line('today.consent.body')}
          <Button label={t('today.consent.open')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
        </View>
      );
    case 'failed':
    case 'none':
      return (
        <View style={styles.note}>
          {line('checkIn.screen.failed')}
          <Button label={t('checkIn.screen.retry')} variant="ghost" size="sm" onPress={onRetry} />
        </View>
      );
    case 'ready':
      if (checkIn.value.answered) return line('checkIn.screen.answered');
      if (checkIn.value.questions.length === 0) return line('checkIn.screen.none');
      return (
        <>
          {line('checkIn.screen.intro')}
          {checkIn.value.questions.map((question) => (
            <QuestionBlock key={question.kind} question={question} pick={picks[question.kind]} onPick={(pick) => onPick(question.kind, pick)} />
          ))}
        </>
      );
  }
}

function QuestionBlock({ question, pick, onPick }: { question: Question; pick: string | undefined; onPick: (pick: string) => void }) {
  const { color } = useTheme();
  const units = useUnits();
  let answer;
  switch (question.format) {
    case 'CHOICE':
      answer = (question.choices ?? []).map((choice) => (
        <Chip key={choice} label={t(choiceKey(question.kind, choice))} selected={pick === choice} onPress={() => onPick(choice)} />
      ));
      break;
    case 'SCALE_1_10':
      answer = SCALE.map((n) => (
        <Chip
          key={n}
          label={String(n)}
          accessibilityLabel={t('checkIn.screen.scaleSpoken', { n })}
          selected={pick === String(n)}
          onPress={() => onPick(String(n))}
        />
      ));
      break;
    case 'CENTIMETRES':
      answer = (
        <TextField
          label={t(units === 'IMPERIAL' ? 'checkIn.screen.inches' : 'checkIn.screen.centimetres')}
          value={pick ?? ''}
          onChangeText={onPick}
          keyboardType="decimal-pad"
        />
      );
      break;
  }
  return (
    <View style={[styles.question, { borderTopColor: color.line }]}>
      <Text style={[styles.asked, { color: color.text }]}>{t(question.copyKey)}</Text>
      <Text style={[styles.small, { color: color.muted }]}>{t(question.reasonCopyKey)}</Text>
      <View style={styles.answers}>{answer}</View>
    </View>
  );
}

type FooterProps = { checkIn: Loaded<CheckIn> | null; ready: boolean; busy: boolean; onSend: (checkIn: CheckIn) => Promise<void> };

function Footer({ checkIn, ready, busy, onSend }: FooterProps) {
  if (checkIn?.state !== 'ready' || checkIn.value.answered) return null;
  const current = checkIn.value;
  return (
    <View style={styles.footer}>
      <Button label={t('checkIn.screen.send')} onPress={() => void onSend(current)} disabled={!ready || busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  note: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  asked: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  question: { borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.md, gap: tokens.space.sm },
  answers: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  footer: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg },
  back: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
});
