import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { setText } from './session';
import type { ExercisePlan } from './workout';

type Schemas = components['schemas'];

/**
 * A move's rows (prototype 2.4): the set's number (with its side for a one-sided move; a done set marked), today — done,
 * or the suggestion faint — and last time. The row under way is outlined.
 */
export function SetTable({ plan, move }: { plan: ExercisePlan; move: Schemas['Exercise'] }) {
  const { color } = useTheme();
  const units = useUnits();
  const sides = move.unilateral ? 2 : 1;
  return (
    <View style={styles.table}>
      <View style={styles.row}>
        {(['set', 'today', 'last'] as const).map((column) => (
          <Text key={column} style={[styles.head, column === 'set' ? styles.number : styles.cell, { color: color.muted }]}>
            {t(`workout.head.${column}`)}
          </Text>
        ))}
      </View>
      {plan.rows.map((row, index) => {
        const number = Math.floor(index / sides) + 1;
        const label = row.side === 'BOTH' ? String(number) : `${number}${t(`workout.side.${row.side}`)}`;
        const { loadKg, reps } = row.suggested;
        const today = row.done ?? (loadKg === null || reps === null ? null : { loadKg, reps });
        return (
          <View
            key={`${row.side}-${index}`}
            style={[
              styles.row,
              styles.set,
              { backgroundColor: color.surface },
              index === plan.current && { borderColor: color.text, borderWidth: tokens.border.outline },
            ]}>
            {/* Done is said by a mark and in words as well as by colour (K-807, Differentiate Without Color Alone). */}
            <Text
              accessibilityLabel={t(row.done === null ? 'workout.setToDo' : 'workout.setDone', { number: label })}
              style={[styles.number, styles.value, { color: row.done === null ? color.muted : color.accent }]}>
              {row.done === null ? label : `${label} ${t('workout.doneMark')}`}
            </Text>
            <Text style={[styles.cell, styles.value, { color: row.done === null ? color.muted : color.text }]}>
              {today === null ? '–' : setText(today, move, units)}
            </Text>
            <Text style={[styles.cell, styles.last, { color: color.muted }]}>{row.last === null ? '–' : setText(row.last, move, units)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { gap: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, paddingHorizontal: tokens.space.sm },
  set: { paddingVertical: tokens.space.sm, borderRadius: tokens.radius.button },
  head: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  number: { width: 28 },
  cell: { flex: 1 },
  value: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  last: { fontSize: tokens.type.bodySmall },
});
