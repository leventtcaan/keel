import { StyleSheet, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Schemas = components['schemas'];
type Props = { from: string; to: string; weighIns: Schemas['WeighIn'][]; trend: Schemas['TrendPoint'][] };

const HEIGHT = 140;
const DOT = 6;
const TREND_DOT = 8;
const DAY_MS = 24 * 3600 * 1000;

/**
 * The weigh-ins of the window, faint, and the server's 7-day trend (U8, the engine's WeightTrend), clear — one morning is
 * mostly water, the trend is what counts. No axis numbers and no words on it: the screen says what it can, and in the
 * first 14 days nothing about the trend (U8).
 */
export function WeightChart({ from, to, weighIns, trend }: Props) {
  const { color } = useTheme();
  const start = Date.parse(`${from}T00:00:00Z`);
  const span = Math.max(DAY_MS, Date.parse(`${to}T00:00:00Z`) - start);
  const all = [...weighIns.map((w) => w.kg), ...trend.map((p) => p.kg)];
  const low = Math.min(...all);
  const high = Math.max(...all);
  const range = Math.max(high - low, 0.5); // a flat week still draws in the middle, not on an edge
  const x = (ms: number) => `${Math.min(100, Math.max(0, ((ms - start) / span) * 100))}%` as const;
  const y = (kg: number) => (HEIGHT - TREND_DOT) * (1 - (kg - low) / range);

  return (
    <View accessible accessibilityLabel={t('weighIn.chart.spoken')} style={[styles.chart, { borderColor: color.line }]}>
      {weighIns.map((w) => (
        <View
          key={w.id}
          testID="raw-point"
          style={[styles.dot, { left: x(Date.parse(w.measuredAt)), top: y(w.kg), backgroundColor: color.muted, opacity: 0.4 }]}
        />
      ))}
      {trend.map((p) => (
        <View
          key={p.day}
          testID="trend-point"
          style={[styles.trend, { left: x(Date.parse(`${p.day}T12:00:00Z`)), top: y(p.kg), backgroundColor: color.text }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { height: HEIGHT, borderBottomWidth: tokens.border.hairline, marginTop: tokens.space.sm },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
  trend: { position: 'absolute', width: TREND_DOT, height: TREND_DOT, borderRadius: TREND_DOT / 2 },
});
