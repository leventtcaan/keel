import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Section } from '@/components/Section';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { Button } from '@/components/Button';
import { useAppServices } from '@/services/ServicesProvider';
import { load, localDay } from '@/today/today';
import { shortDate } from '@/train/program';
import { type UnitSystem, formatWeight, weightChange, weightStepKg } from '@/units/units';

import { RangeNoteLine, RangeWords } from './ChartRanges';
import { LineChart } from './LineChart';
import { rangeFrom, readTrend } from './longRange';
import { type ChartRange, progressParams } from './params';
import { useChartRange, usePaidPart } from './useChartRange';
import type { ChartPoint } from './lineScale';
import { WeighInDots } from './Parts';
import type { WeightPart } from './sections';

/**
 * The change over the window the chart shows, from the server's trend points alone (U1): the first day drawn to the latest, as the
 * numbers on the screen differ. A plain minus or plus and the text colour, no judgement (U7). Null when there is no span (one day).
 */
function changeLine(points: { day: string; kg: number }[], units: UnitSystem): string | null {
  const [from, to] = [points[0], points[points.length - 1]];
  if (from.day === to.day) return null;
  const { delta, size } = weightChange(from.kg, to.kg, units);
  const date = shortDate(from.day);
  if (delta === 0) return t('progress.weight.steady', { date });
  return t(delta < 0 ? 'progress.weight.down' : 'progress.weight.up', { delta: size, date });
}

/**
 * Weight (ADR-078 #2, Ek 2, Ek 3, U8): the server's 7-day average, never one morning's weight. The latest large and the line over
 * the days the server has in the window (a single day is only the value: a point is not a line). Before the trend is ready, or
 * with no day to draw, the weigh-ins toward it (WeighInDots).
 */
export function WeightCard({ part, units }: { part: WeightPart; units: UnitSystem }) {
  const { color } = useTheme();
  const { api } = useAppServices();
  // A longer range (K-1260, ADR-096 Ek 1): read from the server when chosen; the first is the points Progress already has.
  const read = useCallback(
    (range: ChartRange) => readTrend(api, localDay(new Date()), range.days, progressParams.weightAllWindowDays),
    [api],
  );
  const range = useChartRange(progressParams.weightRanges, read);
  // Progress read again (a new weigh-in): back to the points it has, so a longer range never shows an older read.
  const stamp = part.kind === 'chart' ? part.points.map((p) => `${p.day}:${p.kg}`).join() : '';
  const { reset } = range;
  // Side by side (K-1267, with a subscription): the period before the one shown, as long, under it.
  const paid = usePaidPart();
  // Kept with the read it was asked over: once Progress reads again, it is gone.
  const [asked, setBefore] = useState<{ stamp: string; from: string; to: string; points: { day: string; kg: number }[] } | null>(null);
  const before = asked !== null && asked.stamp === stamp ? asked : null;
  const { clear } = paid;
  useEffect(() => {
    reset();
    clear();
  }, [stamp, reset, clear]);
  const days = progressParams.weightRanges.find((r) => r.key === range.key)?.days ?? null;
  if (part.kind === 'dots') return <WeighInDots count={part.count} min={part.min} note={part.note} />;

  const drawn = range.data !== null && range.data.length > 0 ? range.data : part.points;
  const shown: ChartPoint[] = drawn.map((p) => ({ day: p.day, value: p.kg, label: formatWeight(p.kg, units) }));
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
  const text = changeLine(drawn, units);
  // Built outside the JSX (the raw-text guard reads JSX children).
  const change =
    text === null ? null : (
      <Text testID="weight-change" style={[styles.change, { color: color.text }]}>
        {text}
      </Text>
    );
  const askBefore = () =>
    paid.ask(async () => {
      if (days === null) return false;
      const to = rangeFrom(drawn[0]?.day ?? localDay(new Date()), 2);
      const from = rangeFrom(to, days);
      const read = await load(() => api.GET('/v1/weight-trend', { params: { query: { from, to } } }));
      if (read.state !== 'ready') return false;
      setBefore({ stamp, from, to, points: read.value });
      return true;
    });
  // Built outside the JSX below (the raw-text guard reads JSX children).
  const beforeChart =
    before === null || before.points.length < 2 ? null : (
      <>
        <Text style={[styles.fine, { color: color.muted }]}>{t('progress.compare.span', { from: shortDate(before.from), to: shortDate(before.to) })}</Text>
        <LineChart
          prefix="weight"
          points={before.points.map((p) => ({ day: p.day, value: p.kg, label: formatWeight(p.kg, units) }))}
          summary={t('progress.compare.span', { from: shortDate(before.from), to: shortDate(before.to) })}
        />
      </>
    );
  const toggle =
    days === null ? null : before === null ? (
      <Button label={t('progress.compare.period')} variant="text" size="sm" onPress={() => void askBefore()} />
    ) : (
      <Button label={t('progress.compare.hide')} variant="text" size="sm" onPress={() => setBefore(null)} />
    );
  const compare = (
    <>
      {beforeChart}
      {toggle}
      <RangeNoteLine note={paid.note} lockLine={t('progress.compare.locked')} />
    </>
  );
  return (
    <Section card testID="section-weight" title={t('progress.weight.chartTitle')} aside={t('progress.weight.average')}>
      <Text testID="weight-latest" style={[styles.big, { color: color.text }]}>
        {last.label}
      </Text>
      {change}
      {day}
      <RangeWords testID="weight-range" ranges={progressParams.weightRanges} value={range.key} onChange={(key) => void range.choose(key)} />
      {chart}
      <RangeNoteLine note={range.note} />
      {compare}
    </Section>
  );
}

const styles = StyleSheet.create({
  change: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  fine: { fontSize: tokens.type.bodySmall },
  big: { ...tokens.face.display, fontSize: tokens.type.heading, fontVariant: ['tabular-nums'] },
});
