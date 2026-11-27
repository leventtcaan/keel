/**
 * The paywall's hero in the warm notebook (ADR-094 Ek 8 #2). Opened from the person's locked call (its "See plans" names the
 * week), it is theirs: "Your call is ready", its week, and — once the server says the trend is ready — their own weight, its
 * change and its line, the same reads This week makes (numbers.ts). Otherwise an example told in weight, in their units, marked as one. Never a forecast: no
 * weight to come, no date to reach it (U12, ADR-050, ADR-069 #3); the numbers are the server's or the example's (U1).
 */
import { StyleSheet, Text, View } from 'react-native';

import { TrendLine } from '@/components/TrendLine';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type WeightNumber, type loadWeight, weightNumber } from '@/today/numbers';
import { weekdayDate } from '@/today/today';
import { formatWeight, weightChange } from '@/units/units';

import { FramedTag } from './PaywallParts';
import { param } from './params';

/** The person's locked call: its week, and their weight's reads (none until they are read, or when they were not). */
export type ReadyCall = { weekOf: string; weight: Awaited<ReturnType<typeof loadWeight>> | null };

/** A day as the locked call names its week (YYYY-MM-DD), or null: a link's word is checked, never trusted. */
export function lockedWeekOf(param: string | undefined): string | null {
  return param !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(param) && !Number.isNaN(Date.parse(`${param}T12:00:00Z`)) ? param : null;
}

/** The weight, its change in words and its line: the server's trend, or the example's points. */
function WeightLine({ shown, change, points }: { shown: string; change: string | null; points: number[] }) {
  const { color } = useTheme();
  const changeText = change === null ? null : <Text style={[styles.change, { color: color.textSecondary }]}>{change}</Text>;
  return (
    <View style={styles.weight}>
      <View style={styles.weightWords}>
        <Text style={[styles.kilos, { color: color.text }]}>{shown}</Text>
        {changeText}
      </View>
      <TrendLine points={points} width={tokens.size.heroTrendWidth} height={tokens.size.heroTrendHeight} />
    </View>
  );
}

/** "−4.8 kg in 12 weeks": the change as This week says it, then over how long. */
function changeWords(weight: Extract<WeightNumber, { kind: 'trend' }>): string | null {
  if (weight.change === null) return null;
  return t('subscription.ready.change', { change: t(`thisWeek.numbers.${weight.change.direction}`, { size: weight.change.size }), span: weight.change.span });
}

export function ReadyCallHero({ ready }: { ready: ReadyCall }) {
  const { color } = useTheme();
  const units = useUnits();
  const date = weekdayDate(ready.weekOf);
  const weight = weightNumber(ready.weight ?? undefined, units);
  const line = weight?.kind === 'trend' ? <WeightLine shown={formatWeight(weight.kg, units)} change={changeWords(weight)} points={weight.points} /> : null;
  return (
    <View accessible={false} accessibilityLabel={t('subscription.ready.label', { date })} style={styles.hero}>
      <Text style={[styles.eyebrow, { color: color.progressText }]}>{t('subscription.ready.week', { date })}</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {t('lockedCall.title')}
      </Text>
      {line}
      <Text style={[styles.body, { color: color.text }]}>{t('subscription.ready.line')}</Text>
    </View>
  );
}

/** Three weeks of weekly points, and the one they are measured from. */
const HELD_POINTS = 4;

/** The example call, told in weight: a trend that has held, then the one step the call takes (ADR-094 Ek 8 #2). */
export function WeightExample() {
  const { color } = useTheme();
  const units = useUnits();
  // Weekly points: the change said is over the last three weeks (four points), the part that has held.
  const points = param<number[]>('paywall_example_weight_kg');
  const last = points[points.length - 1];
  const { delta, size } = weightChange(points[Math.max(0, points.length - HELD_POINTS)], last, units);
  const direction = delta === 0 ? 'steady' : delta < 0 ? 'down' : 'up';
  const change = t('subscription.example.weight.change', { change: t(`thisWeek.numbers.${direction}`, { size }) });
  return (
    <View accessible={false} accessibilityLabel={t('subscription.example.weight.label')} style={styles.hero}>
      <View style={styles.top}>
        <Text style={[styles.eyebrow, { color: color.progressText }]}>{t('subscription.example.weight.eyebrow')}</Text>
        <FramedTag label={t('subscription.example.tag')} />
      </View>
      <Text style={[styles.title, { color: color.text }]}>{t('subscription.example.weight.title')}</Text>
      <WeightLine shown={formatWeight(last, units)} change={change} points={points} />
      <View style={[styles.call, { borderTopColor: color.line }]}>
        <Text style={[styles.callLabel, { color: color.textSecondary }]}>{t('subscription.example.weight.call')}</Text>
        <Text style={[styles.step, { color: color.accent }]}>{t('subscription.example.weight.step')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: tokens.space.sm },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  eyebrow: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  title: { ...tokens.face.display, fontSize: tokens.type.decisionTitle },
  weight: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: tokens.space.md },
  weightWords: { flexShrink: 1, gap: tokens.space.xs / 2 },
  kilos: { ...tokens.face.displayBold, fontSize: tokens.type.screenTitle, fontVariant: ['tabular-nums'] },
  change: { fontSize: tokens.type.bodySmall },
  body: { fontSize: tokens.type.body },
  call: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.md, borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.sm },
  callLabel: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  step: { flexShrink: 1, textAlign: 'right', fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
});
