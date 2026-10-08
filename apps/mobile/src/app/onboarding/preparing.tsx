import { Redirect, router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { profileReady } from '@/onboarding/draft';
import { useDraft } from '@/onboarding/OnboardingContext';
import { onboardingParams as P } from '@/onboarding/params';
import { linesDone } from '@/onboarding/prepare';
import { usePreparation } from '@/onboarding/usePreparation';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** The tick's mark, inside its circle. */
const TICK_MARK = tokens.type.label;

/**
 * #ob-preparing (ADR-072 #6): the plan being built, three lines each ticked by a real answer of the server (prepare.ts):
 * the program for the days, its cardio, the first call (the first workout without the health data consent: no calls) —
 * no timer, no made-up progress. While it works the way back is
 * off (the answers are being saved); a failure is said, with a way to try again from where it stopped. Done, "See my
 * plan" opens it in this screen's place.
 */
export default function PreparingScreen() {
  const { draft, progress } = useDraft();
  const units = useUnits();
  // Opened before the walk's answers make a profile (a link): back to its start, nothing sent.
  if (progress.profile === undefined && !profileReady(draft, units, new Date().getFullYear())) return <Redirect href="/onboarding" />;
  return <Preparing />;
}

function Preparing() {
  const { color } = useTheme();
  const { signOut } = useAppServices();
  const { draft, progress } = useDraft();
  const prep = usePreparation();
  const done = linesDone(progress);
  const days = progress.program?.days.length ?? draft.trainingDays.length;
  const checkInDay = progress.profile?.schedule.checkInDay ?? P.checkInDay;
  // The food only once the plan will show its row (a starting target came back); the cardio as the program sets it.
  const noCardio = progress.program !== undefined && progress.program.cardio === undefined;
  const food = progress.starting !== undefined && progress.starting !== null;
  let second = noCardio ? 'onboarding.preparing.noCardio' : 'onboarding.preparing.cardio';
  if (food) second = noCardio ? 'onboarding.preparing.food' : 'onboarding.preparing.foodAndCardio';
  const lines = [
    t('onboarding.preparing.program', { count: days }),
    t(second),
    // Without the health data consent there are no calls: the third line is the first workout, named by the catalog.
    (progress.consented ?? draft.healthConsent === 'granted')
      ? t('onboarding.preparing.firstCall', { day: t(`onboarding.schedule.dayName.${checkInDay}`) })
      : t('onboarding.preparing.firstWorkout'),
  ];

  const tick = <SymbolView name="checkmark" size={TICK_MARK} tintColor={color.onAccent} weight="bold" />;
  let bottom =<Button label={t('onboarding.preparing.see')} disabled={done < lines.length} onPress={() => router.replace('/onboarding/plan')} />;
  if (prep.problem !== null && !prep.busy) {
    bottom = (
      <View style={styles.bottom}>
        <ProblemText occurrence={prep.occurrence} style={[styles.text, { color: color.text }]}>
          {prep.problem}
        </ProblemText>
        {prep.missing ? (
          <Button label={t('onboarding.preparing.bringAgain')} onPress={prep.bringAgain} />
        ) : (
          <Button label={t('onboarding.tryAgain')} onPress={() => void prep.run()} />
        )}
        {/* A failure that keeps coming (a resume after a restart too) is not a dead end: as on the checking screen. */}
        <Button label={t('onboarding.signOut')} variant="ghost" onPress={() => void signOut()} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      {/* No way back: the answers above are being saved; after a failure, trying again is the way on. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.body}>
        <ProgressBar value={done / lines.length} label={t('onboarding.preparing.title')} />
        <ScreenTitle>{t('onboarding.preparing.title')}</ScreenTitle>
        <View style={styles.lines}>
          {lines.map((line, i) => {
            const ticked = i < done;
            return (
              <View key={line} style={styles.line} accessible accessibilityLabel={ticked ? t('onboarding.preparing.done', { line }) : line}>
                <View style={[styles.tick, { backgroundColor: ticked ? color.accent : color.track }]}>
                  {ticked && tick}
                </View>
                <Text style={[styles.text, { color: ticked ? color.text : color.muted }]}>{line}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.bottom}>{bottom}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: tokens.space.lg, gap: tokens.space.lg },
  lines: { gap: tokens.space.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  tick: {
    width: tokens.space.xl,
    height: tokens.space.xl,
    borderRadius: tokens.space.xl / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: tokens.type.body },
  bottom: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
});
