import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { t } from '@/copy';
import { formatNumber } from '@/copy/format';
import type { UnitSystem } from '@/units/units';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { formatDistance } from './distance';
import { walkParams as W } from './params';
import type { Place } from './places';
import type { Leg } from './route';

const num = (n: number) => formatNumber(Math.round(n));
const minutesOf = (steps: number) => Math.max(1, Math.round(steps / W.cadence));
/** The rail's dots between the ring and the filled dot: a look, not a measure. */
const RAIL_DOTS = 5;

type Props = { from: Place; to: Place; leg: Pick<Leg, 'km' | 'approximate'>; perKm: number; left: number; system: UnitSystem };

/**
 * The route slip (K-1252, ADR-094 Ek 7 #5): where the walk starts and where it ends in the serif, a petrol ring and dot joined by a
 * dotted rail with the one-way distance and minutes beside it; under it the round trip in big rounded numbers. When today's steps are
 * read (`left` a number, enough left to walk), a coral bar shows how much of them the walk covers, and the line says it covers them or
 * says what is left: never how short it falls (U7).
 */
export function RouteSlip({ from, to, leg, perKm, left, system }: Props) {
  const { color } = useTheme();
  const oneWay = leg.km * perKm;
  const round = Math.round(2 * oneWay);
  const values = { distance: formatDistance(leg.km, system), steps: num(oneWay) };
  const today = Number.isFinite(left) && left >= W.minRemainingSteps;
  const covers = today && round >= left;
  // Built apart from the JSX tree it joins (copy-literals reads the tree's children for text).
  const tick = covers ? <Icon name="checkmark.circle.fill" size="small" tone="accent" /> : null;
  const forToday = today ? (
    <View style={styles.today}>
      <ProgressBar value={round / left} label={t('walkMap.coverShare', { steps: num(round), left: num(left) })} />
      <View style={styles.line}>
        {tick}
        <Text style={[styles.note, { color: color.text }]}>{t(covers ? 'walkMap.covers' : 'walkMap.leftToday', { steps: num(left) })}</Text>
      </View>
    </View>
  ) : null;
  return (
    <View style={styles.stack}>
      <View style={styles.slip}>
        <View style={styles.rail}>
          <View style={[styles.ring, { borderColor: color.accent, backgroundColor: color.background }]} />
          <View style={styles.dots}>
            {Array.from({ length: RAIL_DOTS }, (_, i) => (
              <View key={i} style={[styles.railDot, { backgroundColor: color.accent }]} />
            ))}
          </View>
          <View style={[styles.end, { backgroundColor: color.accent }]} />
        </View>
        <View style={styles.names}>
          <Text style={[styles.place, { color: color.text }]}>{from.name}</Text>
          <Text accessibilityLabel={t(leg.approximate ? 'walkMap.legApprox' : 'walkMap.leg', values)} style={[styles.note, { color: color.textSecondary }]}>
            {t('walkMap.slipLeg', { distance: values.distance, minutes: minutesOf(oneWay) })}
          </Text>
          <Text style={[styles.place, { color: color.text }]}>{to.name}</Text>
        </View>
      </View>
      {leg.approximate && <Text style={[styles.note, { color: color.textSecondary }]}>{t('walkMap.legApprox', values)}</Text>}
      <View style={[styles.hairline, { backgroundColor: color.line }]} />
      <View accessible accessibilityLabel={t('walkMap.round', { steps: num(round) })} style={styles.steps}>
        <Text style={[styles.big, { color: color.text }]}>{num(round)}</Text>
        <Text style={[styles.note, { color: color.textSecondary }]}>{t('walkMap.roundUnit', { minutes: minutesOf(round) })}</Text>
      </View>
      {forToday}
    </View>
  );
}

const RAIL = 18;
const styles = StyleSheet.create({
  stack: { gap: tokens.space.md },
  slip: { flexDirection: 'row', gap: tokens.space.md },
  rail: { width: RAIL, alignItems: 'center', paddingVertical: tokens.space.xs },
  ring: { width: RAIL - 2, height: RAIL - 2, borderRadius: RAIL / 2, borderWidth: 3.5 },
  dots: { flex: 1, justifyContent: 'space-evenly', paddingVertical: 2 },
  railDot: { width: tokens.space.xs, height: tokens.space.xs, borderRadius: tokens.space.xs / 2 },
  end: { width: RAIL - 2, height: RAIL - 2, borderRadius: RAIL / 2 },
  names: { flex: 1, gap: tokens.space.sm },
  place: { ...tokens.face.display, fontSize: tokens.type.number },
  note: { fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
  hairline: { height: tokens.border.hairline },
  steps: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: tokens.space.sm },
  big: { ...tokens.face.displayBold, fontSize: tokens.type.display, fontVariant: ['tabular-nums'] },
  today: { gap: tokens.space.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
});
