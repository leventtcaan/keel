/**
 * The frame of every onboarding step (prototype section 1): back and "n of N" on top, the question, the answers, and
 * Continue at the bottom — off until the step is answered. Continue opens the next step; on the last one, `onFinish`.
 */
import { type Href, router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type Step, stepComplete, stepsFor } from './draft';
import { useDraft } from './OnboardingContext';

/** Each step's screen. Typed routes check every entry against src/app/onboarding, so a missing screen fails typecheck. */
const ROUTES: Record<Step, Href> = {
  goal: '/onboarding',
  healthData: '/onboarding/health-data',
  foods: '/onboarding/foods',
  appleHealth: '/onboarding/apple-health',
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
  /** Continue's own words, when the step has them. */
  continueLabel?: string;
  /** In place of Continue: steps whose answer is a choice of buttons (a consent, the last step). */
  actions?: ReactNode;
  /** While a step's answer is on its way to the server, leaving it would leave that answer behind. */
  backDisabled?: boolean;
};

export function StepFrame({ step, title, children, continueLabel, actions, backDisabled = false }: Props) {
  const { color } = useTheme();
  const { draft } = useDraft();
  const units = useUnits();
  // The steps this user walks: some depend on earlier answers (the foods, only with the health consent).
  const steps = stepsFor(draft);
  const index = steps.indexOf(step);
  const ready = stepComplete(step, draft, units, new Date().getFullYear());
  const next = steps[index + 1];

  // The first step has no way back: before it is sign-in, which the session guard has closed.
  const back =
    index > 0 ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.back')}
        accessibilityState={{ disabled: backDisabled }}
        disabled={backDisabled}
        onPress={() => router.back()}
        hitSlop={tokens.space.md}>
        <Text style={[styles.back, { color: color.text }]}>{t('onboarding.backMark')}</Text>
      </Pressable>
    ) : (
      <View />
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      {/* The system's swipe back too, not only the button. */}
      <Stack.Screen options={{ gestureEnabled: !backDisabled }} />
      <View style={styles.top}>
        {back}
        <Text
          accessibilityLabel={t('onboarding.progress', {
            step: index + 1,
            total: steps.length,
          })}
          style={[styles.count, { color: color.muted }]}>
          {t('onboarding.count', { step: index + 1, total: steps.length })}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{title}</ScreenTitle>
        {children}
      </ScrollView>
      <View style={styles.bottom}>
        {actions ?? (
          <Button
            label={continueLabel ?? t('onboarding.continue')}
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
});
