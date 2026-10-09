import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { MuscleMap } from '@/components/MuscleMap';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { FocusMode, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';
import type { Figure } from '@/train/demo';
import { haptics } from '@/train/haptics';
import { dayName, exerciseName } from '@/train/program';
import { type WorkoutEnd, loadWorkoutEnd } from '@/train/workoutEnd';
import { type UnitSystem, formatLoad, loadValue } from '@/units/units';

type Schemas = components['schemas'];

const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * The workout's end (K-974, ADR-075 #7; prototype `#summary`), always dark (focus mode, ADR-070 #4). "Workout complete"
 * with its mark (still under Reduce Motion), the session's day; the server's numbers (the minutes of active time, kg
 * lifted over the working sets with the change against the same day last time, the working sets) and the kcal an Apple
 * Watch measured, only when it did (else three boxes in one row); the record (the heaviest of the session's, the real
 * set, its next target from the program) or the baseline; the muscles worked, on the one muscle map; this week's
 * sessions as segments; Share and Done. A record is felt (haptics, Ek 5); nothing else is. No e1RM, no badge, no points.
 * Route `/workout-end?workout=<clientId>`. Until the workout reaches the server, the hero and a way to try again: the
 * phone counts nothing.
 */
export default function WorkoutEndScreen() {
  const services = useAppServices();
  const units = useUnits();
  const { workout } = useLocalSearchParams<{ workout: string }>();
  const [end, setEnd] = useState<WorkoutEnd | null>(null);
  const [figure, setFigure] = useState<Figure>('male');
  const felt = useRef(false);

  const read = useCallback(() => {
    void loadWorkoutEnd(services, workout).then((answer) => {
      setEnd(answer);
      // The record is felt once, when it is first shown.
      if (answer.kind === 'ready' && !felt.current && answer.summary.marks.some((m) => m.kind === 'RECORD')) {
        felt.current = true;
        haptics.record();
      }
    });
  }, [services, workout]);
  useEffect(read, [read]);
  useEffect(() => {
    void services.bodyFigure().then(setFigure);
  }, [services]);

  return (
    <FocusMode>
      <StatusBar style="light" />
      <Body end={end} units={units} figure={figure} onRetry={read} />
    </FocusMode>
  );
}

function Body({ end, units, figure, onRetry }: { end: WorkoutEnd | null; units: UnitSystem; figure: Figure; onRetry: () => void }) {
  const { color } = useTheme();
  const ready = end?.kind === 'ready' ? end : null;
  const day = ready === null ? null : (ready.program?.days.find((d) => d.id === ready.programDayId) ?? null);
  let rest = null;
  if (ready !== null) rest = <Facts end={ready} day={day} units={units} figure={figure} />;
  else if (end !== null) {
    rest = (
      <View style={styles.rows}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t(end.kind === 'pending' ? 'workoutEnd.pending' : 'workoutEnd.failed')}</Text>
        <Button label={t('workoutEnd.retry')} variant="ghost" onPress={onRetry} />
      </View>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Hero dayName={day === null ? null : dayName(day)} />
        {rest}
        {ready !== null && <Button label={t('workoutEnd.share')} onPress={() => router.push('/share')} />}
        <Button label={t('workoutEnd.done')} variant="ghost" onPress={() => router.dismissTo('/train')} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** "Workout complete" and its mark, growing in once; still under Reduce Motion. */
function Hero({ dayName: name }: { dayName: string | null }) {
  const { color } = useTheme();
  const reduce = useReduceMotion();
  // One value for the screen's life (state, not a ref: it is read while drawing).
  const [grow] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) {
      grow.setValue(1);
      return;
    }
    Animated.spring(grow, { toValue: 1, useNativeDriver: true }).start();
  }, [grow, reduce]);
  return (
    <View style={styles.hero}>
      <Animated.View testID="hero-mark" style={[styles.mark, { backgroundColor: color.accent, opacity: grow, transform: [{ scale: grow }] }]}>
        <SymbolView name="checkmark" size={tokens.type.heading} tintColor={color.onAccent} />
      </Animated.View>
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {t('workoutEnd.title')}
      </Text>
      {name !== null && <Text style={[styles.text, { color: color.textSecondary }]}>{name}</Text>}
    </View>
  );
}

type Ready = Extract<WorkoutEnd, { kind: 'ready' }>;

function Facts({ end, day, units, figure }: { end: Ready; day: Schemas['ProgramDay'] | null; units: UnitSystem; figure: Figure }) {
  const { color } = useTheme();
  const { summary } = end;
  const plural = (key: string, n: number) => t(`${key}.${n === 1 ? 'one' : 'other'}`);
  const change =
    summary.liftedChangePercent === undefined
      ? undefined
      : t('workoutEnd.change', { percent: summary.liftedChangePercent > 0 ? `+${summary.liftedChangePercent}` : String(summary.liftedChangePercent) });
  const stats: { key: string; value: string; label: string; note?: string }[] = [];
  if (summary.minutes !== undefined) stats.push({ key: 'min', value: String(summary.minutes), label: plural('workoutEnd.minutes', summary.minutes) });
  stats.push({
    key: 'kg',
    value: NUMBER.format(loadValue(summary.liftedKg, units)),
    label: t(units === 'METRIC' ? 'workoutEnd.liftedKg' : 'workoutEnd.liftedLb'),
    note: change,
  });
  stats.push({ key: 'sets', value: String(summary.workingSets), label: plural('workoutEnd.sets', summary.workingSets) });
  const map =
    summary.muscles.length === 0 ? null : (
      <View style={[styles.card, { backgroundColor: color.surface }]}>
        <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
          {t('workoutEnd.worked')}
        </Text>
        <MuscleMap muscles={summary.muscles} figure={figure} />
      </View>
    );
  if (end.kcal !== undefined) stats.push({ key: 'kcal', value: NUMBER.format(end.kcal), label: t('workoutEnd.kcal'), note: t('workoutEnd.watch') });

  return (
    <View style={styles.rows}>
      <View testID="stats" style={styles.stats}>
        {stats.map((s) => (
          <View key={s.key} testID="stat" accessible accessibilityLabel={[s.value, s.label, s.note].filter(Boolean).join(' ')} style={[styles.stat, { backgroundColor: color.surface }]}>
            <Text style={[styles.number, { color: color.text }]}>{s.value}</Text>
            <Text style={[styles.small, { color: color.textSecondary }]}>{s.label}</Text>
            {s.note !== undefined && <Text style={[styles.small, { color: color.muted }]}>{s.note}</Text>}
          </View>
        ))}
      </View>
      <Mark marks={summary.marks} day={day} units={units} />
      {map}
      {end.week !== null && end.week.planned > 0 && <Week done={end.week.done} planned={end.week.planned} />}
    </View>
  );
}

/** The session's record (the heaviest; the real set and its next target), or the baseline of a first session. */
function Mark({ marks, day, units }: { marks: Schemas['SetMark'][]; day: Schemas['ProgramDay'] | null; units: UnitSystem }) {
  const { color } = useTheme();
  const records = marks.filter((m) => m.kind === 'RECORD');
  const set = (loadKg: number, reps: number) => t('workoutEnd.set', { load: formatLoad(loadKg, units), reps });
  if (records.length > 0) {
    const best = records.reduce((a, b) => (b.loadKg > a.loadKg || (b.loadKg === a.loadKg && b.reps > a.reps) ? b : a));
    const next = day?.exercises.find((e) => e.exerciseId === best.exerciseId);
    const nextLine =
      next?.nextLoadKg !== undefined && next.nextReps !== undefined ? t('workoutEnd.recordNext', { set: set(next.nextLoadKg, next.nextReps) }) : t('workoutEnd.recordBest');
    return (
      <View style={[styles.card, { backgroundColor: color.accentSoft }]}>
        <Text style={[styles.small, styles.bold, { color: color.text }]}>{t('workoutEnd.recordKicker')}</Text>
        <Text style={[styles.heading, { color: color.text }]}>{t('workoutEnd.record', { move: exerciseName(best.exerciseId), set: set(best.loadKg, best.reps) })}</Text>
        <Text style={[styles.text, { color: color.text }]}>{nextLine}</Text>
      </View>
    );
  }
  if (!marks.some((m) => m.kind === 'BASELINE')) return null;
  return (
    <View style={[styles.card, { backgroundColor: color.surface }]}>
      <Text style={[styles.heading, { color: color.text }]}>{t('workoutEnd.baseline')}</Text>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('workoutEnd.baselineBody')}</Text>
    </View>
  );
}

/** This week's sessions as segments: done of planned (the server's count; not Apple's rings). */
function Week({ done, planned }: { done: number; planned: number }) {
  const { color } = useTheme();
  return (
    <View accessible accessibilityLabel={t('workoutEnd.weekLabel', { done, planned })} style={styles.rows}>
      <View style={styles.weekHead}>
        <Text style={[styles.small, styles.bold, { color: color.textSecondary }]}>{t('workoutEnd.thisWeek')}</Text>
        <Text style={[styles.number, { color: color.text }]}>{t('workoutEnd.week', { done, planned })}</Text>
      </View>
      <View style={styles.segments}>
        {Array.from({ length: planned }, (_, i) => (
          <Segment key={i} filled={i < done} />
        ))}
      </View>
    </View>
  );
}

/** One session of the week: the track, filled when done. */
function Segment({ filled }: { filled: boolean }) {
  const { color } = useTheme();
  const fill = filled ? <View testID="segment-done" style={[styles.fill, { backgroundColor: color.accent }]} /> : null;
  return (
    <View testID="segment" style={[styles.segment, { backgroundColor: color.track }]}>
      {fill}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  hero: { alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.lg },
  mark: { width: tokens.size.primaryButton, height: tokens.size.primaryButton, borderRadius: tokens.radius.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: tokens.type.decisionTitle, fontWeight: tokens.weight.bold },
  rows: { gap: tokens.space.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  stat: { flexGrow: 1, flexBasis: 0, minWidth: tokens.size.primaryButton, borderRadius: tokens.radius.card, padding: tokens.space.sm, gap: tokens.space.xs },
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  segments: { flexDirection: 'row', gap: tokens.space.xs },
  segment: { flex: 1, height: tokens.size.track, borderRadius: tokens.radius.track, overflow: 'hidden' },
  fill: { flex: 1 },
  number: { fontSize: tokens.type.number, fontWeight: tokens.weight.bold },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
});
