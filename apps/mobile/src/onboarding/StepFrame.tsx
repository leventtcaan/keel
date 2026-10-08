/**
 * The frame of every onboarding step (prototype `obFrame`): back and the step indicator on top, the question and its
 * reason, the answers. A step whose answer is one tap moves on with that tap (`useChoose`); the others end with Continue,
 * off until the step is answered, or with their own `actions`. The steps and their order are the route's (flow.ts), so
 * the indicator counts the walk of this user's branch. The steps taken off the walk keep their code and this frame;
 * nothing opens them.
 */
import { type Href, router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { type ReactNode, useCallback, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type Draft, stepComplete } from './draft';
import { type RetiredStep, type Step, nextStep, walk } from './flow';
import { useDraft } from './OnboardingContext';

/** Each step's screen. Typed routes check every entry against src/app/onboarding, so a missing screen fails typecheck. */
const ROUTES: Record<Step, Href> = {
  goal: '/onboarding',
  experience: '/onboarding/experience',
  program: '/onboarding/program',
  ownProgram: '/onboarding/own-program',
  review: '/onboarding/review',
  days: '/onboarding/days',
  consent: '/onboarding/health-data',
  about: '/onboarding/about',
  activity: '/onboarding/activity',
  weights: '/onboarding/weights',
};

/** After the walk's last step: the plan is prepared (K-967), then shown. */
const PREPARING: Href = '/onboarding/preparing';

/** The screen after a step: the walk's next, or after its last the plan being prepared. */
export const routeAfter = (next: Step | null): Href => (next === null ? PREPARING : ROUTES[next]);

/**
 * For a step answered with one tap: keeps the answer and opens the next step of the walk those answers make (the program
 * answer changes the branch, so the next step is worked out from the draft with the answer in it); after the last step,
 * the plan being prepared. A second tap while the next screen opens does nothing; coming back to the step, a tap moves on
 * again.
 */
export function useChoose(step: Step): (answer: Partial<Draft>) => void {
  const { draft, update } = useDraft();
  const leaving = useRef(false);
  useFocusEffect(
    useCallback(() => {
      leaving.current = false;
    }, []),
  );
  return (answer) => {
    if (leaving.current) return;
    leaving.current = true;
    update(answer);
    router.push(routeAfter(nextStep(step, { ...draft, ...answer })));
  };
}

type Props = {
  step: Step | RetiredStep;
  /** Already translated. */
  title: string;
  /** Why the question is asked, under it (prototype `.why`). Already translated. */
  why?: string;
  children: ReactNode;
  /** The answer is a tap that moves on (useChoose): no Continue. */
  chosen?: boolean;
  /** Continue's own words, when the step has them. */
  continueLabel?: string;
  /** In place of Continue: steps whose answer is a choice of buttons (a consent, the last step). */
  actions?: ReactNode;
  /** While a step's answer is on its way to the server, leaving it would leave that answer behind. */
  backDisabled?: boolean;
};

export function StepFrame({ step, title, why, children, chosen = false, continueLabel, actions, backDisabled = false }: Props) {
  const { color } = useTheme();
  const { draft } = useDraft();
  const units = useUnits();
  // The steps this user walks: the branch follows the experience and program answers.
  const steps = walk(draft);
  const index = (steps as readonly string[]).indexOf(step);
  const ready = stepComplete(step, draft, units, new Date().getFullYear());
  const next = nextStep(step, draft);

  // The first step has no way back: before it is sign-in, which the session guard has closed.
  const back =
    index > 0 ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.back')}
        accessibilityState={{ disabled: backDisabled }}
        disabled={backDisabled}
        onPress={() => router.back()}
        hitSlop={tokens.space.md}
        style={styles.backTarget}>
        <Text style={[styles.back, { color: color.text }]}>{t('onboarding.backMark')}</Text>
      </Pressable>
    ) : null;

  const bottom =
    actions ??
    (chosen ? null : (
      <Button
        label={continueLabel ?? t('onboarding.continue')}
        // A step off the walk (index -1) leads nowhere: nothing opens it either.
        onPress={() => index >= 0 && router.push(routeAfter(next))}
        disabled={!ready}
      />
    ));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      {/* The system's swipe back too, not only the button. */}
      <Stack.Screen options={{ gestureEnabled: !backDisabled }} />
      <View style={styles.top}>
        {back}
        {/* One segment per step of this walk, filled up to this one (prototype `.steps`); said as one line. */}
        <View
          accessible
          accessibilityLabel={t('onboarding.progress', { step: index + 1, total: steps.length })}
          style={styles.steps}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.segment, { backgroundColor: i <= index ? color.text : color.line }]} />
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{title}</ScreenTitle>
        {why !== undefined && <Text style={[styles.why, { color: color.textSecondary }]}>{why}</Text>}
        {children}
      </ScrollView>
      {bottom !== null && <View style={styles.bottom}>{bottom}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.sm,
    minHeight: tokens.size.touch,
  },
  backTarget: { minWidth: tokens.size.touch, minHeight: tokens.size.touch, justifyContent: 'center' },
  back: { fontSize: tokens.type.heading },
  steps: { flex: 1, flexDirection: 'row', gap: tokens.space.xs },
  segment: { flex: 1, height: tokens.size.track, borderRadius: tokens.radius.track },
  why: { fontSize: tokens.type.body },
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
