import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { SCOFF_QUESTIONS, type ProjectionAccess, scoffResult } from '@/projection/scoff';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The SCOFF gate before the shape projection (K-607, ADR-050). Five yes-or-no questions; the answers live in this screen's
 * state only and are dropped with it — nothing is sent, only the result is kept on the phone. Two or more yes: the
 * projection stays off here, with a neutral sentence and, by the phone's region, a checked organisation (no score, no
 * condition named — U6). After "off" the questions are not shown again.
 */
export default function ScoffScreen() {
  const { projection } = useAppServices();
  const { color } = useTheme();
  const [off, setOff] = useState(projection.current() === 'unavailable');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('why.back')} onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t('why.back')}`}</Text>
        </Pressable>
        <ScreenTitle>{t(off ? 'projection.unavailable.title' : 'projection.scoff.title')}</ScreenTitle>
      </View>
      {off ? <Unavailable projection={projection} /> : <Questions projection={projection} onOff={() => setOff(true)} />}
    </SafeAreaView>
  );
}

function Questions({ projection, onOff }: { projection: ProjectionAccess; onOff: () => void }) {
  const { report } = useAppServices();
  const { color } = useTheme();
  const [answers, setAnswers] = useState<(boolean | null)[]>(SCOFF_QUESTIONS.map(() => null));
  const [failed, setFailed] = useState(false);
  // A ref, not state: a second tap in the same frame must see the first one (review finding: two closes).
  const busy = useRef(false);
  const complete = answers.every((answer) => answer !== null);

  const choose = (index: number, yes: boolean) => setAnswers((now) => now.map((answer, i) => (i === index ? yes : answer)));

  const carryOn = async () => {
    if (!complete || busy.current) return;
    busy.current = true;
    setFailed(false);
    const result = scoffResult(answers as boolean[]);
    try {
      await projection.record(result);
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' }); // by name only (V3)
      busy.current = false;
      // Two or more yes: the projection is not offered on this screen even if the phone could not keep it.
      if (result === 'unavailable') onOff();
      else setFailed(true);
      return;
    }
    if (result === 'unavailable') onOff();
    else router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('projection.scoff.intro')}</Text>
      {SCOFF_QUESTIONS.map((question, index) => (
        <Question key={question} text={t(`projection.scoff.${question}`)} answer={answers[index]} onAnswer={(yes) => choose(index, yes)} />
      ))}
      {failed && <Failed />}
      <Button label={t('projection.scoff.continue')} disabled={!complete} onPress={() => void carryOn()} />
      <Text style={[styles.note, { color: color.muted }]}>{t('projection.scoff.source')}</Text>
    </ScrollView>
  );
}

function Question({ text, answer, onAnswer }: { text: string; answer: boolean | null; onAnswer: (yes: boolean) => void }) {
  const { color } = useTheme();
  const yes = t('projection.scoff.yes');
  const no = t('projection.scoff.no');
  return (
    <Card>
      <Text style={[styles.question, { color: color.text }]}>{text}</Text>
      <View style={styles.choices}>
        <Chip label={yes} accessibilityLabel={`${text} ${yes}`} selected={answer === true} onPress={() => onAnswer(true)} />
        <Chip label={no} accessibilityLabel={`${text} ${no}`} selected={answer === false} onPress={() => onAnswer(false)} />
      </View>
    </Card>
  );
}

function Unavailable({ projection }: { projection: ProjectionAccess }) {
  const { color } = useTheme();
  const link = projection.support();
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={[styles.text, { color: color.text }]}>{t('projection.unavailable.body')}</Text>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('projection.unavailable.support')}</Text>
      {link !== null && <SupportLink region={link.region} url={link.url} />}
      <Button label={t('projection.unavailable.done')} onPress={() => router.back()} />
    </ScrollView>
  );
}

function Failed() {
  const { color } = useTheme();
  return <Text style={[styles.text, { color: color.warn }]}>{t('projection.scoff.failed')}</Text>;
}

function SupportLink({ region, url }: { region: string; url: string }) {
  return (
    <Button
      label={t('projection.unavailable.open', { name: t(`projection.support.${region}`) })}
      variant="ghost"
      onPress={() => void Linking.openURL(url)}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  head: { paddingHorizontal: tokens.space.lg, gap: tokens.space.sm },
  back: { fontSize: tokens.type.body },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  text: { fontSize: tokens.type.body },
  question: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  choices: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm },
  note: { fontSize: tokens.type.bodySmall },
});
