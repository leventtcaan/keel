import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Chip } from '@/components/Chip';
import { Section } from '@/components/Section';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { exerciseName, shortDate } from '@/train/program';
import type { Move } from '@/train/trainData';
import { type UnitSystem, formatLoad, loadValue } from '@/units/units';

import { effortLine } from './effort';
import { LineChart } from './LineChart';
import type { ChartPoint } from './lineScale';
import { liftSet } from './Parts';

type Lift = components['schemas']['LiftProgress'];

/**
 * Strength once a lift has weeks to draw or an effort to tell (ADR-078 #2, Ek 3): a chip for each lift in the program's order,
 * the real best set large and where it started (the phone subtracts nothing), the best set of each week as a line (no
 * estimated max, B10; a week the call held the load ringed), and the effort line. A lift with one week shows its set and no
 * chart: a point is not a line.
 */
export function LiftsCard({ lifts, moves, units }: { lifts: Lift[]; moves: ReadonlyMap<string, Move>; units: UnitSystem }) {
  const { color } = useTheme();
  const [picked, setPicked] = useState<string | null>(null);
  // Opens on the first lift that has a chart to show, else the first.
  const lift = lifts.find((l) => l.exerciseId === picked) ?? lifts.find((l) => l.weeks.length >= 2) ?? lifts[0];
  const move = exerciseName(lift.exerciseId, moves);

  const points: ChartPoint[] = lift.weeks.map((w) => ({ day: w.weekOf, value: loadValue(w.loadKg, units), label: formatLoad(w.loadKg, units), marked: w.held }));
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

  // One row that scrolls sideways (prototype `.liftchips`): 25 lifts must not push the chart off the first screen. It opens
  // on the lift shown, so that one is never scrolled out of sight (the lift opens on is the first with a chart, not the first).
  const row = useRef<ScrollView>(null);

  // Built outside the JSX below (the raw-text guard reads JSX children).
  const chips =
    lifts.length < 2 ? null : (
      <ScrollView ref={row} testID="strength-chips" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {lifts.map((l) => (
          <View key={l.exerciseId} onLayout={(e) => l === lift && row.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - tokens.space.md), animated: false })}>
            <Chip label={exerciseName(l.exerciseId, moves)} selected={l === lift} onPress={() => setPicked(l.exerciseId)} touch />
          </View>
        ))}
      </ScrollView>
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
      {chips}
      <View style={styles.top}>
        <Text testID="strength-best" style={[styles.big, { color: color.text }]}>
          {liftSet(lift.best, moves.get(lift.exerciseId), units)}
        </Text>
        {start}
      </View>
      {chart}
      {legend}
      {effortText}
    </Section>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: tokens.space.xs },
  top: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: tokens.space.sm },
  big: { fontFamily: tokens.font.display, fontSize: tokens.type.heading, fontVariant: ['tabular-nums'] },
  fine: { fontSize: tokens.type.bodySmall, flexShrink: 1, textAlign: 'right' },
  effort: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
});
