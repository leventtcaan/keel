import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActionSheetIOS, Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Section } from '@/components/Section';
import { useAppServices } from '@/services/ServicesProvider';
import { localDay } from '@/today/today';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { exerciseName, shortDate } from '@/train/program';
import type { Move } from '@/train/trainData';
import { type UnitSystem, formatLoad, loadValue } from '@/units/units';

import { RangeNoteLine, RangeWords } from './ChartRanges';
import { effortLine } from './effort';
import { joinWeeks, rangeFrom, readLiftWeeks } from './longRange';
import { type ChartRange, progressParams } from './params';
import { useChartRange } from './useChartRange';
import { LineChart } from './LineChart';
import type { ChartPoint } from './lineScale';
import { liftSet } from './Parts';

type Lift = components['schemas']['LiftProgress'];

/**
 * Strength once a lift has weeks to draw or an effort to tell (ADR-078 #2, Ek 3): the lift shown is its name, which opens
 * the system's list of every lift in the program's order (ADR-094 Ek 3 #4: no chips); the real best set large and where it
 * started (the phone subtracts nothing), the best set of each week as a line (no estimated max, B10; a week the call held
 * the load ringed), and the effort line. A lift with one week shows its set and no
 * chart: a point is not a line.
 */
export function LiftsCard({ lifts, moves, units }: { lifts: Lift[]; moves: ReadonlyMap<string, Move>; units: UnitSystem }) {
  const { color } = useTheme();
  const [picked, setPicked] = useState<string | null>(null);
  // Opens on the first lift that has a chart to show, else the first.
  const lift = lifts.find((l) => l.exerciseId === picked) ?? lifts.find((l) => l.weeks.length >= 2) ?? lifts[0];
  const move = exerciseName(lift.exerciseId, moves);
  // A longer range (K-1260, ADR-096 Ek 1: with a subscription): the lift's weeks from its paged history, the server's weeks kept.
  const { api, training } = useAppServices();
  const read = useCallback(
    (range: ChartRange) => readLiftWeeks(training, api, lift.exerciseId, range.days === null ? null : rangeFrom(localDay(new Date()), range.days)),
    [api, training, lift.exerciseId],
  );
  const range = useChartRange(progressParams.strengthRanges, read);
  const weeks = range.data === null ? lift.weeks : joinWeeks(lift.weeks, range.data);

  const points: ChartPoint[] = weeks.map((w) => ({ day: w.weekOf, value: loadValue(w.loadKg, units), label: formatLoad(w.loadKg, units), marked: w.held }));
  const held = points.filter((p) => p.marked === true).map((p) => shortDate(p.day));
  const [first, last] = [points[0], points[points.length - 1]];
  const low = points.reduce((a, b) => (b.value < a.value ? b : a), first);
  const high = points.reduce((a, b) => (b.value > a.value ? b : a), first);
  const summary =
    points.length < 2
      ? ''
      : [
          t('progress.strength.spoken', { move, first: first.label, firstDate: shortDate(first.day), last: last.label, lastDate: shortDate(last.day), low: low.label, high: high.label }),
          ...(held.length === 0 ? [] : [t('progress.strength.spokenHeld', { weeks: held.join(', ') })]),
        ].join(' ');
  const effort = effortLine(lift.effort, units);

  // The lift's name in petrol with a chevron: the system's list of the lifts, in the program's order, and Cancel (ADR-094 Ek 3 #4).
  const choose = () => {
    const names = lifts.map((l) => exerciseName(l.exerciseId, moves));
    const options = [...names, t('progress.strength.pickCancel')];
    ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: names.length, tintColor: color.accent }, (index) => {
      if (index >= 0 && index < names.length) {
        setPicked(lifts[index].exerciseId);
        range.reset(); // another lift starts at the server's weeks
      }
    });
  };
  // Built outside the JSX below (the raw-text guard reads JSX children).
  const name =
    lifts.length < 2 ? (
      <Text style={[styles.move, { color: color.text }]}>{move}</Text>
    ) : (
      <View style={styles.pickRow}>
        <Pressable
          testID="strength-pick"
          accessibilityRole="button"
          accessibilityLabel={t('progress.strength.pickLabel', { move })}
          onPress={choose}
          hitSlop={tokens.space.sm}
          style={({ pressed }) => [styles.pick, pressed && styles.dim]}>
          <Text style={[styles.move, { color: color.accent }]}>{move}</Text>
          <SymbolView name="chevron.down" size={tokens.type.bodySmall} tintColor={color.accent} />
        </Pressable>
        <Text style={[styles.count, { color: color.muted }]}>{t('progress.strength.count', { count: lifts.length })}</Text>
      </View>
    );
  const chart = points.length < 2 ? null : <LineChart prefix="strength" points={points} summary={summary} />;
  const legend = held.length === 0 ? null : <Text style={[styles.fine, { color: color.muted }]}>{t('progress.strength.legendHeld')}</Text>;
  const start = lift.stronger ? <Text style={[styles.fine, { color: color.muted }]}>{t('progress.strength.started', { set: liftSet(lift.baseline, moves.get(lift.exerciseId), units) })}</Text> : null;
  const effortText = effort === null ? null : (
    <Text testID="strength-effort" style={[styles.effort, { color: color.textSecondary }]}>
      {effort}
    </Text>
  );

  return (
    <Section card testID="section-strength" title={t('progress.strength.title')} aside={t('progress.strength.bestSet')}>
      {name}
      <View style={styles.top}>
        <Text testID="strength-best" style={[styles.big, { color: color.text }]}>
          {liftSet(lift.best, moves.get(lift.exerciseId), units)}
        </Text>
        {start}
      </View>
      <RangeWords testID="strength-range" ranges={progressParams.strengthRanges} value={range.key} onChange={(key) => void range.choose(key)} />
      {chart}
      <RangeNoteLine note={range.note} />
      {legend}
      {effortText}
    </Section>
  );
}

const styles = StyleSheet.create({
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  pick: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs, minHeight: tokens.size.touch, flexShrink: 1 },
  move: { ...tokens.face.display, fontSize: tokens.type.body },
  count: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
  top: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: tokens.space.sm },
  big: { ...tokens.face.display, fontSize: tokens.type.heading, fontVariant: ['tabular-nums'] },
  fine: { fontSize: tokens.type.bodySmall, flexShrink: 1, textAlign: 'right' },
  effort: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
});
