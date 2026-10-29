import { Stack, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProblemText, announce, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { DayTiles } from '@/onboarding/DayTiles';
import { defaultTrainingDays } from '@/onboarding/params';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { rebuild } from '@/train/changes';

/**
 * Build my program (K-1037, ADR-084; prototype `build-program`), route `/build-program`: the way out for an account with a
 * profile and no program. The onboarding's days question, once more: the count is the one answer, the app places the days
 * (defaultTrainingDays) and the server builds the program (POST /v1/program/generate, the same call as "Rebuild for me");
 * the starting weights are not asked, the first session finds them. Built, the Train tab opens. No answer from the server
 * is "no connection"; any other failure is "couldn't build it"; either can be tried again.
 */
export default function BuildProgramScreen() {
  const { api } = useAppServices();
  const { color } = useTheme();
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
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

  const build = async (chosen: number) => {
    if (sending.current) return;
    sending.current = true;
    setCount(chosen);
    setBusy(true);
    setProblem(null);
    announce(t('buildProgram.building'));
    const answer = await rebuild(api, defaultTrainingDays(chosen) ?? []);
    sending.current = false;
    if (!shown.current) return;
    setBusy(false);
    if (answer.kind === 'done') return router.dismissTo('/train');
    setProblem(t(answer.kind === 'offline' ? 'buildProgram.offline' : 'buildProgram.failed'));
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: color.background }]}>
      {/* While the program is being built the way back is shut, as the Back button was: the answer would lead nowhere. */}
      <Stack.Screen options={{ headerBackVisible: !busy, gestureEnabled: !busy }} />
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('buildProgram.title')}</ScreenTitle>
        <Text style={[styles.question, { color: color.text }]}>{t('onboarding.days.title')}</Text>
        <DayTiles chosen={count} disabled={busy} onChoose={(chosen) => void build(chosen)} />
        <Text style={[styles.note, { color: color.muted }]}>{t('buildProgram.note')}</Text>
        {busy && (
          <View style={styles.status}>
            <ActivityIndicator color={color.muted} />
            <Text style={[styles.text, { color: color.textSecondary }]}>{t('buildProgram.building')}</Text>
          </View>
        )}
        {problem !== null && (
          <View style={styles.status}>
            <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>{problem}</ProblemText>
            {count !== null && <Button label={t('buildProgram.retry')} onPress={() => void build(count)} />}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  question: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  status: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
