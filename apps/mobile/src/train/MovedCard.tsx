import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import type { UnitSystem } from '@/units/units';

import type { Move } from './trainData';
import { whatMoved } from './whatMoved';

/**
 * "What moved" (K-974, ADR-075 #7; prototype `#summary`): the session's moves, each with its best set and what changed
 * against last time, as the server says it (`WorkoutSummary.moves`). Up is the accent, the rest plain: a lighter day is
 * not coloured or flagged (U7). Nothing to show, no card.
 */
export function MovedCard({ moves, units, known }: { moves: components['schemas']['MoveChange'][]; units: UnitSystem; known?: ReadonlyMap<string, Move> }) {
  const { color } = useTheme();
  const { rows, more } = whatMoved(moves, units, known);
  if (rows.length === 0) return null;
  return (
    <View style={[styles.card, { backgroundColor: color.surface }]}>
      <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
        {t('workoutEnd.moved')}
      </Text>
      {rows.map((row) => {
        const changeColor = row.tone === 'up' ? color.accent : color.textSecondary;
        return (
          <View key={row.key} testID="moved-row" accessible accessibilityLabel={row.label} style={styles.row}>
            <Text style={[styles.name, { color: color.text }]}>{row.name}</Text>
            <View style={styles.result}>
              <Text style={[styles.set, { color: color.text }]}>{row.set}</Text>
              {row.change !== null && <Text style={[styles.change, { color: changeColor }]}>{row.change}</Text>}
            </View>
          </View>
        );
      })}
      {more > 0 && (
        <Text accessibilityLabel={t('workoutEnd.move.moreLabel', { count: more })} style={[styles.change, { color: color.muted }]}>
          {t('workoutEnd.move.more', { count: more })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    gap: tokens.space.sm,
  },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: tokens.space.sm,
  },
  name: { flexShrink: 1, fontSize: tokens.type.body },
  result: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: tokens.space.xs,
  },
  set: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  change: { fontSize: tokens.type.bodySmall },
});
