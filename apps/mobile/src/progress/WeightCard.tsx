import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';
import { type UnitSystem, formatWeight } from '@/units/units';

import { LineChart } from './LineChart';
import type { ChartPoint } from './lineScale';
import { CardHead, WeighInDots } from './Parts';
import type { WeightPart } from './sections';

/**
 * Weight (ADR-078 #2, Ek 2, Ek 3, U8): the server's 7-day average, never one morning's weight. The latest large and the line over
 * the days the server has in the window (a single day is only the value: a point is not a line). Before the trend is ready, or
 * with no day to draw, the weigh-ins toward it (WeighInDots).
 */
export function WeightCard({ part, units }: { part: WeightPart; units: UnitSystem }) {
  const { color } = useTheme();
  if (part.kind === 'dots') return <WeighInDots count={part.count} min={part.min} stale={part.stale} />;

  const points: ChartPoint[] = part.points.map((p) => ({ day: p.day, value: p.kg, label: formatWeight(p.kg, units) }));
  const [first, last] = [points[0], points[points.length - 1]];
  const low = points.reduce((a, b) => (b.value < a.value ? b : a), first);
  const high = points.reduce((a, b) => (b.value > a.value ? b : a), first);
  const summary = t('progress.weight.chartSpoken', {
    first: first.label,
    firstDate: shortDate(first.day),
    last: last.label,
    lastDate: shortDate(last.day),
    low: low.label,
    high: high.label,
  });
  const chart = points.length < 2 ? null : <LineChart prefix="weight" points={points} summary={summary} />;
  return (
    <Card>
      <CardHead title={t('progress.weight.chartTitle')} aside={t('progress.weight.average')} />
      <Text testID="weight-latest" style={[styles.big, { color: color.text }]}>
        {last.label}
      </Text>
      {chart}
    </Card>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: tokens.font.display, fontSize: tokens.type.heading, fontVariant: ['tabular-nums'] },
});
