import { StyleSheet, Text } from 'react-native';

import { Section } from '@/components/Section';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';
import { type UnitSystem, formatWeight, weightStepKg } from '@/units/units';

import { LineChart } from './LineChart';
import type { ChartPoint } from './lineScale';
import { WeighInDots } from './Parts';
import type { WeightPart } from './sections';

/**
 * Weight (ADR-078 #2, Ek 2, Ek 3, U8): the server's 7-day average, never one morning's weight. The latest large and the line over
 * the days the server has in the window (a single day is only the value: a point is not a line). Before the trend is ready, or
 * with no day to draw, the weigh-ins toward it (WeighInDots).
 */
export function WeightCard({ part, units }: { part: WeightPart; units: UnitSystem }) {
  const { color } = useTheme();
  if (part.kind === 'dots') return <WeighInDots count={part.count} min={part.min} note={part.note} />;

  const shown: ChartPoint[] = part.points.map((p) => ({ day: p.day, value: p.kg, label: formatWeight(p.kg, units) }));
  const [first, last] = [shown[0], shown[shown.length - 1]];
  const low = shown.reduce((a, b) => (b.value < a.value ? b : a), first);
  const high = shown.reduce((a, b) => (b.value > a.value ? b : a), first);
  // A range narrower than one shown step is the scale's noise: drawn flat at half height with one label, so it is not read as a trend.
  const points = high.value - low.value < weightStepKg(units) ? shown.map((p) => ({ ...p, value: low.value })) : shown;
  const summary = t('progress.weight.chartSpoken', {
    first: first.label,
    firstDate: shortDate(first.day),
    last: last.label,
    lastDate: shortDate(last.day),
    low: low.label,
    high: high.label,
  });
  const chart = points.length < 2 ? null : <LineChart prefix="weight" points={points} summary={summary} />;
  // One day alone has no chart to date it: its day, as the server gave it.
  const day =
    points.length > 1 ? null : (
      <Text testID="weight-latest-day" style={[styles.fine, { color: color.muted }]}>
        {shortDate(last.day)}
      </Text>
    );
  return (
    <Section card testID="section-weight" title={t('progress.weight.chartTitle')} aside={t('progress.weight.average')}>
      <Text testID="weight-latest" style={[styles.big, { color: color.text }]}>
        {last.label}
      </Text>
      {day}
      {chart}
    </Section>
  );
}

const styles = StyleSheet.create({
  fine: { fontSize: tokens.type.bodySmall },
  big: { fontFamily: tokens.font.display, fontSize: tokens.type.heading, fontVariant: ['tabular-nums'] },
});
