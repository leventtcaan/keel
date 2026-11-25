import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { workoutParams } from './params';
import { isBodyOnly, rirChoice, setText } from './session';
import { loadValue } from '@/units/units';
import type { ExercisePlan } from './workout';

/**
 * The move's sets done in this session (ADR-075 #1, prototype `.donerow`), folded to ONE line while they are being done
 * ("80×8 · 80×8", K-1207); a tap opens them, and in the open each is a row with its mark (done is said by more than colour, K-807),
 * what was lifted, its number (and side) and the reps left, and a tap on a row corrects or deletes it (K-972). A set skipped (K-972)
 * is grey and says so: no mark, no load, never a "100 × 0". What the sets said (the analysis line) opens with them.
 */
type Props = {
  plan: ExercisePlan;
  move: components['schemas']['Exercise'];
  /** A set done tapped, to correct or delete it (K-972); its number (and side) as shown. */
  onEdit: (set: components['schemas']['NewSet'], number: string) => void;
  /** What the sets said (the analysis line, the weight found): in the open part, under the rows. */
  children?: ReactNode;
};

/** A set as the folded line writes it: "80×8", "+10×8" for an added load, "12 reps" for the body alone. */
function shortText(set: { loadKg: number; reps: number | string }, move: components['schemas']['Exercise'], units: Parameters<typeof loadValue>[1]): string {
  if (isBodyOnly(set, move)) return t('workout.goal.reps', { reps: set.reps });
  return t(move.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'workout.doneShortAdded' : 'workout.doneShort', { load: loadValue(set.loadKg, units), reps: set.reps });
}

export function DoneSets({ plan, move, onEdit, children }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  const sides = move.unilateral ? 2 : 1;
  const top = workoutParams.rirChoices.length - 1;
  const [open, setOpen] = useState(false);
  const shown = plan.rows.filter((row) => row.done !== null || (row.skipped === true && plan.skippedMove !== true));
  const doneRows = plan.rows.filter((row) => row.done !== null);
  if (shown.length === 0 && (children === undefined || children === null || children === false)) return null;
  const line = (doneRows.length === 0 ? [t('workout.skipped')] : doneRows.flatMap((row) => (row.done === null ? [] : [shortText(row.done, move, units)]))).join(t('workout.doneSeparator'));
  const summary = (
    <Pressable
      testID="done-summary"
      accessibilityRole="button"
      accessibilityLabel={t('workout.doneSummaryLabel', { sets: line })}
      accessibilityHint={t(open ? 'workout.doneSummaryClose' : 'workout.doneSummaryHint')}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen((was) => !was)}
      style={({ pressed }) => [styles.summary, { backgroundColor: color.surface }, pressed && styles.dim]}>
      <Text style={[styles.set, styles.grow, { color: color.text }]}>{line}</Text>
    </Pressable>
  );
  // Built outside the JSX (the raw-text guard reads what is inside it).
  const list = (
    <View style={styles.list}>
      {plan.rows.map((row, index) => {
        const number = Math.floor(index / sides) + 1;
        const label = row.side === 'BOTH' ? String(number) : `${number}${t(`workout.side.${row.side}`)}`;
        // Only what was skipped before a set done or under way: a move skipped leaves its sets to come unshown.
        if (row.skipped === true && plan.skippedMove !== true)
          return (
            <View key={`${row.side}-${index}`} accessible accessibilityLabel={t('workout.skippedSet', { number: label })} style={[styles.row, { backgroundColor: color.surface }]}>
              <Text style={[styles.set, styles.skipped, { color: color.muted }]}>{t('workout.skipped')}</Text>
              <Text style={[styles.small, styles.grow, { color: color.muted }]}>{t('workout.doneNumber', { number: label })}</Text>
            </View>
          );
        if (row.done === null) return null;
        const set = setText(row.done, move, units);
        const rir = row.done.rir === undefined ? null : rirChoice(row.done.rir);
        const left = rir === null ? null : rir === workoutParams.rirChoices[top] ? t('workout.rir.more') : String(rir);
        const done = row.done;
        return (
          // One element for VoiceOver: what the set is, all of it, and that a tap corrects it.
          <Pressable
            key={`${row.side}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={left === null ? t('workout.setDone', { number: label }) : t('workout.doneSet', { number: label, set, left })}
            accessibilityHint={t('workout.editHint')}
            onPress={() => onEdit(done, label)}
            style={({ pressed }) => [pressed && styles.dim]}>
          <View style={[styles.row, { backgroundColor: color.surface }]}>
            <Text style={[styles.markText, { color: color.muted }]}>{t('workout.doneMark')}</Text>
            <Text style={[styles.set, { color: color.text }]}>{set}</Text>
            <Text style={[styles.small, styles.grow, { color: color.muted }]}>{t('workout.doneNumber', { number: label })}</Text>
            {left !== null && <Text style={[styles.small, { color: color.muted }]}>{t('workout.doneLeft', { left })}</Text>}
          </View>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View style={styles.list}>
      {summary}
      {open ? list : null}
      {open ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space.xs },
  dim: { opacity: tokens.opacity.dim },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.button },
  summary: { minHeight: tokens.size.touch, justifyContent: 'center', paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.button },
  markText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  set: { ...tokens.face.displayBold, fontSize: tokens.type.number },
  small: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  grow: { flex: 1 },
  skipped: { paddingLeft: tokens.space.xl + tokens.space.sm },
});
