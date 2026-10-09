import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { workoutParams } from './params';
import { rirChoice, setText } from './session';
import type { ExercisePlan } from './workout';

/**
 * The move's sets done in this session (ADR-075 #1, prototype `.donerow`): each with its mark (done is said by more than
 * colour, K-807), what was lifted, its number (and side) and the reps left. Editing one is K-972.
 */
export function DoneSets({ plan, move }: { plan: ExercisePlan; move: components['schemas']['Exercise'] }) {
  const { color } = useTheme();
  const units = useUnits();
  const sides = move.unilateral ? 2 : 1;
  const top = workoutParams.rirChoices.length - 1;
  return (
    <View style={styles.list}>
      {plan.rows.map((row, index) => {
        if (row.done === null) return null;
        const number = Math.floor(index / sides) + 1;
        const label = row.side === 'BOTH' ? String(number) : `${number}${t(`workout.side.${row.side}`)}`;
        const set = setText(row.done, move, units);
        const rir = row.done.rir === undefined ? null : rirChoice(row.done.rir);
        const left = rir === null ? null : rir === workoutParams.rirChoices[top] ? t('workout.rir.more') : String(rir);
        return (
          <View
            key={`${row.side}-${index}`}
            accessible
            accessibilityLabel={left === null ? t('workout.setDone', { number: label }) : t('workout.doneSet', { number: label, set, left })}
            style={[styles.row, { backgroundColor: color.surface }]}>
            <View style={[styles.mark, { backgroundColor: color.accent }]}>
              <Text style={[styles.markText, { color: color.onAccent }]}>{t('workout.doneMark')}</Text>
            </View>
            <Text style={[styles.set, { color: color.text }]}>{set}</Text>
            <Text style={[styles.small, styles.grow, { color: color.textSecondary }]}>{t('workout.doneNumber', { number: label })}</Text>
            {left !== null && <Text style={[styles.small, { color: color.textSecondary }]}>{t('workout.doneLeft', { left })}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.button },
  mark: { width: tokens.space.xl, height: tokens.space.xl, borderRadius: tokens.space.xl / 2, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  set: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number },
  small: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  grow: { flex: 1 },
});
