/**
 * The frame of every onboarding step (prototype section 1): back and "n of N" on top, the question, the answers, and
 * Continue at the bottom — off until the step is answered. Continue opens the next step; on the last one, `onFinish`.
 */
import { type Href, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { STEPS, type Step, stepComplete } from './draft';
import { useDraft } from './OnboardingContext';

/** Each step's screen. Typed routes check every entry against src/app/onboarding, so a missing screen fails typecheck. */
const ROUTES: Record<Step, Href> = {
  goal: '/onboarding',
  program: '/onboarding/program',
  schedule: '/onboarding/schedule',
  about: '/onboarding/about',
  activity: '/onboarding/activity',
  photos: '/onboarding/photos',
  expectations: '/onboarding/expectations',
};

type Props = {
  step: Step;
  /** Already translated. */
  title: string;
  children: ReactNode;
  /** The last step's button: its own label, and what it does instead of moving on. */
  finish?: {
    label: string;
    onPress: () => void;
    busy: boolean;
    problem: string | null;
  };
};

export function StepFrame({ step, title, children, finish }: Props) {
  const { color } = useTheme();
  const { draft } = useDraft();
  const units = useUnits();
  const index = STEPS.indexOf(step);
  const ready = stepComplete(step, draft, units, new Date().getFullYear());
  const next = STEPS[index + 1];

  // The first step has no way back: before it is sign-in, which the session guard has closed.
  const back =
    index > 0 ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.back')}
        onPress={() => router.back()}
        hitSlop={tokens.space.md}>
        <Text style={[styles.back, { color: color.text }]}>{t('onboarding.backMark')}</Text>
      </Pressable>
    ) : (
      <View />
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.top}>
        {back}
        <Text
          accessibilityLabel={t('onboarding.progress', {
            step: index + 1,
            total: STEPS.length,
          })}
          style={[styles.count, { color: color.muted }]}>
          {t('onboarding.count', { step: index + 1, total: STEPS.length })}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{title}</ScreenTitle>
        {children}
      </ScrollView>
      <View style={styles.bottom}>
        {finish?.problem && <Text style={[styles.problem, { color: color.text }]}>{finish.problem}</Text>}
        {finish !== undefined ? (
          <Button label={finish.label} onPress={finish.onPress} disabled={!ready || finish.busy} />
        ) : (
          <Button
            label={t('onboarding.continue')}
            onPress={() => next !== undefined && router.push(ROUTES[next])}
            disabled={!ready}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.sm,
  },
  back: { fontSize: tokens.type.heading },
  count: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  body: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    gap: tokens.space.md,
  },
  bottom: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.lg,
    gap: tokens.space.sm,
  },
  problem: { fontSize: tokens.type.body },
});
