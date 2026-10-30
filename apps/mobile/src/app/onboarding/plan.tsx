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
import { StartingCall, type StartingCallRow } from '@/onboarding/StartingCall';
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

/** The first workout shows this many moves; the rest are counted ("and 6 more"), not listed (K-1058). */
const FIRST_MOVES = 3;

const WEEK: Schemas['Weekday'][] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
/** "Mon, Wed, Fri": the training days in the week's order. */
const daysWords = (days: Schemas['Weekday'][]) =>
  [...days].sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b)).map((day) => t(`onboarding.schedule.dayShort.${day}`)).join(', ');

/**
 * #ob-plan (ADR-072 #6): the starting call in U3's parts, from the server's answers (#ob-preparing). The reason: the
 * answers reflected (goal, days, which days). The news first (K-1058, prototype section 11 frame 6): the starting call in the one
 * dark card (the first workout below it is a plain surface card, not a second dark one) — where the calories start (K-989: one number, and the days the scale corrects it in), the protein (the server's
 * figure for the day) and the server's first call (K-990), its day and the days to it, then every check-in day; none of it
 * without the health data consent (there are no calls), nor the food without a weigh-in. Then the action: the first workout
 * cut to its first three moves — each move's image, sets × range and, where known, its weight; "and N more", and "Session 1
 * finds your weights" when none is known — and the cardio as the program sets it (ADR-074: a dose, never a measured burn).
 * The Monday morning reminder is offered here (K-434's place). Continue ends onboarding: the paywall, or
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
      // What the paywall's own-plan card shows of this screen (K-1058): where the food starts and the first workout.
      startingKcal: starting?.targetKcal ?? null,
      workoutName: dayName(workout.day),
      workoutMoves: workout.day.exercises.length,
      workoutToday: workout.inDays === 0,
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

  // The answers reflected, a chip each — and none without a value: "We pick" is no goal yet, days are counted from the program
  // (a day on no weekday is a day), and the weekdays are those the program has.
  const weekdays = program.days.flatMap((day) => (day.weekday === undefined ? [] : [day.weekday]));
  const chips = [
    progress.profile.goal === 'DECIDE_FOR_ME' ? '' : t('onboarding.plan.goal', { goal: t(`onboarding.plan.goalName.${progress.profile.goal}`) }),
    program.days.length === 0 ? '' : t(program.days.length === 1 ? 'onboarding.plan.days.one' : 'onboarding.plan.days.other', { count: program.days.length }),
    weekdays.length === 0 ? '' : daysWords(weekdays),
  ].filter((words) => words !== '');

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
  // The workout is cut to its first moves; the rest are counted, not listed.
  const leading = workout.day.exercises.slice(0, FIRST_MOVES);
  const hidden = workout.day.exercises.length - leading.length;

  // The starting call (K-1058): the food and the protein (the server's starting target), the first call and the days to it.
  const callRows: StartingCallRow[] = [];
  if (starting !== null) {
    callRows.push({
      label: t('onboarding.plan.food'),
      value: t('onboarding.plan.foodKcal', { kcal: KCAL.format(starting.targetKcal) }),
      // The days the scale watches it before a calorie call: the engine's, by sex (never written here, ADR-072 Ek 1).
      note: t('onboarding.plan.foodNote', { days: starting.observationDays }),
    });
    callRows.push({ label: t('onboarding.plan.protein'), value: t('onboarding.plan.proteinG', { grams: starting.proteinG }) });
  }
  if (call !== null) {
    const soon = call.inDays <= 0 ? t('onboarding.plan.today') : call.inDays === 1 ? t('onboarding.plan.tomorrow') : t('onboarding.plan.inDays', { count: call.inDays });
    callRows.push({
      label: t('onboarding.plan.firstCall'),
      value: weekdayDate(call.day),
      note: t('onboarding.plan.callNote', { when: soon, day: t(`onboarding.schedule.dayName.${schedule.checkInDay}`) }),
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('onboarding.plan.title')}</ScreenTitle>
        {chips.length > 0 && (
          <View style={styles.reflect} accessibilityLabel={t('onboarding.plan.reflectLabel')}>
            {chips.map((words) => (
              <Text key={words} style={[styles.chip, { color: color.text, backgroundColor: color.surface }]}>
                {words}
              </Text>
            ))}
          </View>
        )}

        <StartingCall rows={callRows} />

        <View style={[styles.card, { backgroundColor: color.surface }]} accessibilityLabel={t('onboarding.plan.workoutLabel')}>
          {when !== null && (
            <Text style={[styles.small, { color: color.muted }]}>{t('onboarding.plan.firstWorkout', { day: when })}</Text>
          )}
          <Text style={[styles.dayName, { color: color.text }]}>{dayName(workout.day)}</Text>
          {leading.map((move) => (
            <View key={move.exerciseId} style={styles.move}>
              <MoveThumb equipment={moves.get(move.exerciseId)?.equipment} />
              <View style={styles.moveText}>
                <Text style={[styles.moveName, { color: color.text }]}>{exerciseName(move.exerciseId, moves)}</Text>
                <Text style={[styles.small, { color: color.muted }]}>
                  {t('onboarding.plan.setsReps', { sets: move.sets, reps: repCount(move.reps) })}
                </Text>
              </View>
              {move.nextLoadKg !== undefined && (
                <Text style={[styles.strong, { color: color.text }]}>{formatLoad(move.nextLoadKg, units)}</Text>
              )}
            </View>
          ))}
          {(hidden > 0 || !known) && (
            <View style={styles.rest}>
              {hidden > 0 && <Text style={[styles.small, { color: color.muted }]}>{t('onboarding.plan.more', { count: hidden })}</Text>}
              {!known && (
                <Text style={[styles.tag, { color: color.onAccentInk, backgroundColor: color.accentInk }]}>{t('onboarding.plan.findsWeights')}</Text>
              )}
            </View>
          )}
        </View>

        {cardio !== undefined &&
          cardio.sessionsPerWeek > 0 &&
          row(
            t('onboarding.plan.cardio'),
            t('onboarding.plan.cardioDose', { sessions: cardio.sessionsPerWeek, minutes: cardio.minutes }),
            t(afterLift ? 'onboarding.plan.cardioAfter' : 'onboarding.plan.cardioMixed'),
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
  rest: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space.sm },
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
