import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { workoutParams } from './params';
import { rirChoice, setText } from './session';
import type { ExercisePlan, SetRow } from './workout';

type Schemas = components['schemas'];

type Props = {
  plan: ExercisePlan;
  move: Schemas['Exercise'];
  /** A set done tapped, to correct or delete it (K-972); its number (and side) as shown. */
  onEdit: (set: Schemas['NewSet'], number: string) => void;
  /** What the sets said (the analysis line, the weight found), under the rows. */
  children?: ReactNode;
};

/**
 * This move's sets as quiet rows (ADR-094 Ek 2, A · Focus), one line each: its number, what was lifted or is to be lifted, and its
 * state. A set done has its mark (done is said by more than colour, K-807) and a tap corrects or deletes it (K-972); the set under way
 * has the coral mark of "you are here" (ADR-094 §1); the ones to come are faint. A set skipped (K-972) says so, no load, never
 * "100 × 0"; a move skipped leaves its sets to come unshown. One picture of the move, as the dots are of the session.
 */
export function SetRows({ plan, move, onEdit, children }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  const sides = move.unilateral ? 2 : 1;
  const top = workoutParams.rirChoices.length - 1;
  const what = (row: SetRow): string | null => {
    if (row.done !== null) return setText(row.done, move, units);
    const { loadKg, reps } = row.suggested;
    if (reps === null) return null;
    return loadKg === null ? t('workout.goal.reps', { reps }) : setText({ loadKg, reps }, move, units);
  };
  return (
    <View testID="set-rows" style={styles.list}>
      {plan.rows.map((row, index) => {
        const number = Math.floor(index / sides) + 1;
        const label = row.side === 'BOTH' ? String(number) : `${number}${t(`workout.side.${row.side}`)}`;
        const name = t('workout.setNumber', { number: label });
        const key = `${row.side}-${index}`;
        if (row.skipped === true) {
          if (plan.skippedMove === true) return null;
          return (
            <View key={key} accessible accessibilityLabel={t('workout.skippedSet', { number: label })} style={[styles.row, { backgroundColor: color.surface }]}>
              <View style={styles.lead}>
                <Text style={[styles.name, { color: color.muted }]}>{name}</Text>
              </View>
              <Text style={[styles.set, styles.grow, { color: color.muted }]}>{t('workout.skipped')}</Text>
            </View>
          );
        }
        const set = what(row);
        if (row.done !== null) {
          const done = row.done;
          const rir = done.rir === undefined ? null : rirChoice(done.rir);
          const left = rir === null ? null : rir === workoutParams.rirChoices[top] ? t('workout.rir.more') : String(rir);
          return (
            // One element for VoiceOver: what the set is, all of it, and that a tap corrects it.
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={left === null ? t('workout.doneSetNoLeft', { number: label, set: set ?? '' }) : t('workout.doneSet', { number: label, set: set ?? '', left })}
              accessibilityHint={t('workout.editHint')}
              onPress={() => onEdit(done, label)}
              style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, pressed && styles.dim]}>
              <View style={styles.lead}>
                <Text style={[styles.name, { color: color.text }]}>{name}</Text>
              </View>
              <Text style={[styles.set, styles.grow, { color: color.text }]}>{set}</Text>
              <Text style={[styles.mark, { color: color.text }]}>{t('workout.doneMark')}</Text>
            </Pressable>
          );
        }
        if (plan.skippedMove === true) return null;
        const now = index === plan.current;
        // Built outside the JSX (the raw-text guard reads what is inside it).
        const mark = now ? <View testID="set-row-mark" style={[styles.dot, { backgroundColor: color.progress }]} /> : null;
        return (
          <View
            key={key}
            testID={now ? 'set-row-now' : undefined}
            accessible
            accessibilityLabel={[t('workout.setToDo', { number: label }), set].filter((part) => part !== null).join(', ')}
            accessibilityState={{ selected: now }}
            style={[styles.row, { backgroundColor: color.surface }]}>
            {/* The mark sits before the name; the loads of every row still start at one line. */}
            <View style={styles.lead}>
              {mark}
              <Text style={[styles.name, { color: now ? color.text : color.muted }]}>{name}</Text>
            </View>
            <Text style={[styles.set, styles.grow, { color: now ? color.text : color.muted }]}>{set}</Text>
          </View>
        );
      })}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    minHeight: tokens.size.touch,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.option,
  },
  dim: { opacity: tokens.opacity.dim },
  lead: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, width: tokens.size.setRowName },
  dot: { width: tokens.size.track * 2, height: tokens.size.track * 2, borderRadius: tokens.size.track },
  name: { fontSize: tokens.type.body },
  set: { ...tokens.face.displaySemiBold, fontSize: tokens.type.body },
  mark: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  grow: { flex: 1 },
});
