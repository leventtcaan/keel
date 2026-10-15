import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { CardHead } from './Parts';

type Week = components['schemas']['ConsistencyWeek'];

/**
 * The weeks over, a cell each, oldest first, in the order the server sent them (K-1016, ADR-078 #2): on track (filled), a spare
 * week (a lone miss the run forgave: soft with a ring), a paused week (a ring only), a missed week (a plain neutral cell, 3:1 on the card, not named, said as "other weeks":
 * U7). A short history is a short row; the cells are never padded. The count the phone says is of the cells it draws, not a
 * second count of the record (the cells and `forgivenWeeks` need not agree, the grid being the last weeks only).
 */
export function ConsistencyGrid({ weeks }: { weeks: Week[] }) {
  const { color } = useTheme();
  if (weeks.length === 0) return null;
  const count = (state: Week['state']) => weeks.filter((w) => w.state === state).length;
  const spare = count('SPARE');
  const paused = count('PAUSED');
  const look = {
    ON_TRACK: { backgroundColor: color.accent },
    SPARE: { backgroundColor: color.accentSoft, borderColor: color.accent, borderWidth: tokens.border.outline },
    MISSED: { backgroundColor: color.weekMissed },
    PAUSED: { backgroundColor: color.background, borderColor: color.muted, borderWidth: tokens.border.hairline },
  } as const;
  const legend: [string, Week['state']][] = [[t('progress.consistency.onTrack'), 'ON_TRACK'], ...(spare > 0 ? [[t('progress.consistency.spare'), 'SPARE'] as [string, Week['state']]] : []), ...(paused > 0 ? [[t('progress.consistency.paused'), 'PAUSED'] as [string, Week['state']]] : [])];
  return (
    <Card>
      <CardHead title={t('progress.consistency.title')} />
      <View
        testID="consistency-grid"
        accessible
        accessibilityLabel={t('progress.consistency.spoken', { count: weeks.length, onTrack: count('ON_TRACK'), spare, paused, other: count('MISSED') })}
        style={styles.grid}>
        {weeks.map((week) => (
          <View key={week.weekOf} testID={`consistency-cell-${week.state}-${week.weekOf}`} style={[styles.cell, look[week.state]]} />
        ))}
      </View>
      <View style={styles.legend}>
        {legend.map(([label, state]) => (
          <View key={state} style={styles.item}>
            <View style={[styles.swatch, look[state]]} />
            <Text style={[styles.fine, { color: color.muted }]}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.fine, { color: color.muted }]}>{t('progress.consistency.note')}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  cell: { width: tokens.size.weekCell, height: tokens.size.weekCell, borderRadius: tokens.radius.track },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  swatch: { width: tokens.size.swatch, height: tokens.size.swatch, borderRadius: tokens.radius.track },
  fine: { fontSize: tokens.type.bodySmall },
});
