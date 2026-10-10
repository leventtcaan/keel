import { Redirect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ProblemText, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { MondayReminder } from '@/onboarding/MondayReminder';
import { useDraft } from '@/onboarding/OnboardingContext';
import { sendPlanSeen } from '@/onboarding/planSeen';
import { daysTo, firstWorkout } from '@/onboarding/prepare';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { weekdayDate } from '@/today/today';
import { MoveThumb } from '@/train/MoveThumb';
import { dayName, exerciseName } from '@/train/program';
import { repCount } from '@/train/reps';
import { formatLoad } from '@/units/units';

type Schemas = components['schemas'];

// "2,450": a whole number of kcal as the app writes it, in English like every word of the app.
const KCAL = new Intl.NumberFormat('en-US');

const WEEK: Schemas['Weekday'][] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
/** "Mon, Wed, Fri": the training days in the week's order. */
const daysWords = (days: Schemas['Weekday'][]) =>
  [...days].sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b)).map((day) => t(`onboarding.schedule.dayShort.${day}`)).join(', ');

/**
 * #ob-plan (ADR-072 #6): the starting call in U3's parts, from the server's answers (#ob-preparing). The reason: the
 * answers reflected (goal, days, which days). The action: the first workout — each move's image, sets × range and, where
 * known, its weight, else "Session 1 finds your weights" — and the cardio as the program sets it (ADR-074: a dose, never
 * a measured burn) and, when the server has one, where the calories start (K-989: one number, and the days the scale
 * corrects it in; no row without the consent or a weigh-in). The date: the server's first call (K-990) and the days to it, only with the health data consent (without it there
 * are no calls). The Monday morning reminder is offered here (K-434's place). Continue ends onboarding: the paywall, or
 * the tabs. No way back: the answers are saved.
 */
export default function PlanScreen() {
  const { color } = useTheme();
  const units = useUnits();
  const { api, profile, report, planPreviews, reminders } = useAppServices();
  const { progress, setProgress } = useDraft();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
  const leaving = useRef(false);
  // Where the first call stands, for the reminders (K-992): the Monday morning one never rings before the server's day.
  const consented = progress.consented;
  const keptCall = progress.firstCall;
  useEffect(() => {
    if (consented === undefined) return;
    void reminders.keepFirstCall(consented !== true ? 'off' : keptCall === undefined || keptCall === null ? 'weekly' : { on: keptCall });
  }, [reminders, consented, keptCall]);
  // The plan shown for the first time: the server is told (K-993), once while onboarding lasts, then the first call's day is
  // read again, as it counts from today. A failure changes nothing here; shown again, it is said again (planSeen.ts).
  const shown = progress.profile !== undefined && progress.program !== undefined && progress.exercises !== undefined;
  const said = progress.planSeen === true;
  const latest = useRef(progress);
  useEffect(() => {
    latest.current = progress;
  }, [progress]);
  const saying = useRef(false);
  useEffect(() => {
    if (!shown || said || saying.current) return;
    saying.current = true;
    void sendPlanSeen(api, consented === true, report).then((result) => {
      saying.current = false;
      if (!result.sent) return;
      setProgress({ ...latest.current, planSeen: true, ...(result.firstCall === undefined ? {} : { firstCall: result.firstCall }) });
    });
  }, [api, consented, report, said, setProgress, shown]);
  // Opened before the plan is prepared (a link): it is prepared first.
  if (progress.profile === undefined || progress.program === undefined || progress.exercises === undefined) {
    return <Redirect href="/onboarding/preparing" />;
  }
  const { schedule } = progress.profile;
  const program = progress.program;
  // The catalog's moves and the user's own (K-968): an own move by the name they gave it, never its id.
  const moves = new Map(progress.exercises.map((move) => [move.id, move]));
  const now = new Date();
  const workout = firstWorkout(program, now, schedule.timeZone);
  // The first call's day is the server's (K-990): shown, and the days to it counted; never worked out here. Without the
  // health data consent there are no weekly calls: none is promised.
  const firstCall = progress.consented === true ? (progress.firstCall ?? null) : null;
  const call = firstCall === null ? null : { day: firstCall, inDays: daysTo(firstCall, now, schedule.timeZone) };
  const known = workout.day.exercises.some((move) => move.nextLoadKg !== undefined);
  // Where the calories start (K-989): one number to start from, not Monday's (the first call runs on Monday's inputs).
  const starting = progress.starting ?? null;

  const finish = async () => {
    if (leaving.current) return;
    leaving.current = true;
    setBusy(true);
    setProblem(null);
    // First: the paywall that takes this screen's place reads it as it opens.
    planPreviews.keep({
      own: program.source === 'OWN',
      days: schedule.trainingDays.length,
      firstWorkout: workout.day.weekday ?? null,
      firstCall: call?.day ?? null,
      checkInDay: schedule.checkInDay,
      hasCardio: (program.cardio?.sessionsPerWeek ?? 0) > 0,
    });
    try {
      await profile.finish();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('onboarding.plan.finishFailed'));
      leaving.current = false;
      setBusy(false);
    }
  };

  const small = (words: string) => <Text style={[styles.small, { color: color.muted }]}>{words}</Text>;
  const row = (label: string, value: string, note: string) => (
    <View style={[styles.fact, { borderTopColor: color.line }]}>
      <Text style={[styles.key, { color: color.muted }]}>{label}</Text>
      <View style={styles.value}>
        <Text style={[styles.strong, { color: color.text }]}>{value}</Text>
        {small(note)}
      </View>
    </View>
  );
  const cardio = program.cardio;
  const afterLift = cardio?.sessions.every((session) => session.place === 'AFTER_LIFT') ?? true;
  const when = workout.inDays === 0 ? t('onboarding.plan.today') : workout.day.weekday === undefined ? null : t(`onboarding.schedule.dayName.${workout.day.weekday}`);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('onboarding.plan.title')}</ScreenTitle>
        <View style={styles.reflect} accessibilityLabel={t('onboarding.plan.reflectLabel')}>
          {[
            t('onboarding.plan.goal', { goal: t(`onboarding.plan.goalName.${progress.profile.goal}`) }),
            t('onboarding.plan.days', { count: schedule.trainingDays.length }),
            daysWords(schedule.trainingDays),
          ].map((words) => (
            <Text key={words} style={[styles.chip, { color: color.text, backgroundColor: color.surface }]}>
              {words}
            </Text>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: color.decisionBackground }]} accessibilityLabel={t('onboarding.plan.workoutLabel')}>
          {when !== null && (
            <Text style={[styles.small, { color: color.decisionMuted }]}>{t('onboarding.plan.firstWorkout', { day: when })}</Text>
          )}
          <Text style={[styles.dayName, { color: color.decisionText }]}>{dayName(workout.day)}</Text>
          {!known && (
            <Text style={[styles.tag, { color: color.onAccentInk, backgroundColor: color.accentInk }]}>{t('onboarding.plan.findsWeights')}</Text>
          )}
          {workout.day.exercises.map((move) => (
            <View key={move.exerciseId} style={styles.move}>
              <MoveThumb equipment={moves.get(move.exerciseId)?.equipment} />
              <View style={styles.moveText}>
                <Text style={[styles.moveName, { color: color.decisionText }]}>{exerciseName(move.exerciseId, moves)}</Text>
                <Text style={[styles.small, { color: color.decisionMuted }]}>
                  {t('onboarding.plan.setsReps', { sets: move.sets, reps: repCount(move.reps) })}
                </Text>
              </View>
              {move.nextLoadKg !== undefined && (
                <Text style={[styles.strong, { color: color.decisionText }]}>{formatLoad(move.nextLoadKg, units)}</Text>
              )}
            </View>
          ))}
        </View>

        {cardio !== undefined &&
          cardio.sessionsPerWeek > 0 &&
          row(
            t('onboarding.plan.cardio'),
            t('onboarding.plan.cardioDose', { sessions: cardio.sessionsPerWeek, minutes: cardio.minutes }),
            t(afterLift ? 'onboarding.plan.cardioAfter' : 'onboarding.plan.cardioMixed'),
          )}
        {starting !== null &&
          row(
            t('onboarding.plan.food'),
            t('onboarding.plan.foodKcal', { kcal: KCAL.format(starting.targetKcal) }),
            // The days the scale watches it before a calorie call: the engine's, by sex (never written here, ADR-072 Ek 1).
            t('onboarding.plan.foodNote', { days: starting.observationDays }),
          )}
        {call !== null &&
          row(
            t('onboarding.plan.firstCall'),
            weekdayDate(call.day),
            call.inDays <= 0 ? t('onboarding.plan.today') : call.inDays === 1 ? t('onboarding.plan.tomorrow') : t('onboarding.plan.inDays', { count: call.inDays }),
          )}
        {/* Without the consent there are no calls, so no morning to be told of one (K-992, user test). */}
        {progress.consented === true && <MondayReminder day={t(`onboarding.schedule.dayName.${schedule.checkInDay}`)} />}
      </ScrollView>
      <View style={styles.bottom}>
        {problem !== null && (
          <ProblemText occurrence={occurrence} style={[styles.small, { color: color.text }]}>
            {problem}
          </ProblemText>
        )}
        <Button label={t('onboarding.continue')} disabled={busy} onPress={() => void finish()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  reflect: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  chip: {
    fontSize: tokens.type.bodySmall,
    fontWeight: tokens.weight.semibold,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.chip,
    overflow: 'hidden',
  },
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  dayName: { fontFamily: tokens.font.display, fontSize: tokens.type.decisionTitle },
  tag: {
    alignSelf: 'flex-start',
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.chip,
    overflow: 'hidden',
  },
  move: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  moveText: { flex: 1 },
  moveName: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  fact: { flexDirection: 'row', gap: tokens.space.md, paddingTop: tokens.space.sm, borderTopWidth: tokens.border.hairline },
  key: { width: tokens.size.touch * 2, fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  value: { flex: 1 },
  strong: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  small: { fontSize: tokens.type.bodySmall },
  bottom: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
});
