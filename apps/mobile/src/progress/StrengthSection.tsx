import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import type { Session } from '@/train/history';
import { workoutParams } from '@/train/params';
import { exerciseName, shortDate } from '@/train/program';
import type { Move } from '@/train/trainData';
import { type UnitSystem, formatLoad, loadValue } from '@/units/units';

import { StrengthChart } from './StrengthChart';
import { strengthMoves, strengthPoints, windowFrom } from './strength';

type Props = { moves: ReadonlyMap<string, Move>; sessions: Session[]; today: string; units: UnitSystem };

/**
 * Strength on the Progress tab (K-604, prototype 4.4): one lift at a time — the latest week large, where the window
 * started, the chart — then the two windows side by side, each saying which part of the chart it is.
 */
export function StrengthSection({ moves, sessions, today, units }: Props) {
  const { color } = useTheme();
  const lifts = strengthMoves(moves, sessions, today);
  const [picked, setPicked] = useState<string | null>(null);
  const lift = picked !== null && lifts.includes(picked) ? picked : lifts[0];
  const points = lift === undefined ? [] : strengthPoints(lift, sessions, today, (kg) => loadValue(kg, units));

  // Built outside the JSX below (the raw-text guard reads JSX children).
  const body =
    lift === undefined ? (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('strength.empty')}</Text>
    ) : (
      <Card>
        <View style={styles.top}>
          <Text testID="strength-latest" style={[styles.big, { color: color.text }]}>
            {formatLoad(points[points.length - 1].kg, units)}
          </Text>
          <Text style={[styles.small, styles.since, { color: color.muted }]}>
            {t('strength.since', { load: formatLoad(points[0].kg, units), date: shortDate(points[0].week) })}
          </Text>
        </View>
        <StrengthChart points={points} from={windowFrom(today)} today={today} units={units} move={exerciseName(lift, moves)} />
        <Text style={[styles.small, { color: color.muted }]}>{t('strength.legendLine')}</Text>
        <Text style={[styles.small, { color: color.accent }]}>{t('strength.legendEasier')}</Text>
      </Card>
    );
  // The two windows say which part of the chart is which: only with a chart.
  const windows =
    lift === undefined ? null : (
      <View style={styles.windows}>
        <Window eyebrow={t('strength.callEyebrow')} title={t('strength.callTitle', { weeks: workoutParams.effortCallWindowWeeks })} note={t('strength.callNote')} />
        <Window
          eyebrow={t('strength.judgeEyebrow')}
          title={t('strength.judgeTitle', { days: workoutParams.evaluationWindowDays })}
          note={t('strength.judgeNote')}
          dark
        />
      </View>
    );
  const chips =
    lifts.length < 2 ? null : (
      <View style={styles.chips}>
        {lifts.map((id) => (
          <Chip key={id} label={exerciseName(id, moves)} accessibilityLabel={exerciseName(id, moves)} selected={id === lift} onPress={() => setPicked(id)} />
        ))}
      </View>
    );

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
        {t('strength.title')}
      </Text>
      <Text style={[styles.small, { color: color.muted }]}>{t('strength.subtitle')}</Text>
      {chips}
      {body}
      {windows}
    </View>
  );
}

/** One of the two windows (prototype 4.4 `.win .tile`): the decision window light, the evaluation window dark. */
function Window({ eyebrow, title, note, dark = false }: { eyebrow: string; title: string; note: string; dark?: boolean }) {
  const { color } = useTheme();
  const [fill, ink, soft] = dark ? [color.text, color.background, color.background] : [color.surface, color.text, color.muted];
  return (
    <View style={[styles.window, { backgroundColor: fill }]}>
      <Text style={[styles.eyebrow, { color: soft }]}>{eyebrow}</Text>
      <Text style={[styles.windowTitle, { color: ink }]}>{title}</Text>
      <Text style={[styles.small, { color: soft }]}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space.sm },
  heading: { fontFamily: tokens.font.display, fontSize: tokens.type.heading },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  top: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: tokens.space.sm },
  big: { fontFamily: tokens.font.display, fontSize: tokens.type.screenTitle },
  since: { flexShrink: 1, textAlign: 'right' },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  windows: { flexDirection: 'row', gap: tokens.space.sm },
  window: { flex: 1, borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.xs },
  eyebrow: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  windowTitle: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number },
});
