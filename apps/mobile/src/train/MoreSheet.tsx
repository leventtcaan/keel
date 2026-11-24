import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

export type MoreRow = {
  key: string;
  /** Already translated. */
  label: string;
  /** What a screen reader says when the label is short for it ("Swap" → "Swap Bench press"). */
  accessibilityLabel?: string;
};

type Props = {
  /** The move it is about, as the person reads it. */
  move: string;
  /** What is written above the rows and is no action (the plates a side for the weight under way); null for nothing. */
  info: string | null;
  rows: MoreRow[];
  onPick: (key: string) => void;
};

/**
 * Everything the set screen does not need during a set (K-1207): the move's How to, History, Swap and Taken, the weight's "Too
 * heavy?", a note, Skip set, Skip move, Superset, Add a move and Finish. One affordance on the page ("More") opens it, so the set
 * under way has the screen to itself and nothing that was there is gone. Short rows, one per action, the same words they had on the
 * page (a sheet with a paragraph in it is a page in disguise).
 */
export function MoreSheet({ move, info, rows, onPick }: Props) {
  const { color } = useTheme();
  return (
    <View testID="more-sheet" style={styles.sheet}>
      <Text style={[styles.title, { color: color.text }]}>{move}</Text>
      {info === null ? null : <Text style={[styles.info, { color: color.muted }]}>{info}</Text>}
      {rows.map((row) => (
        <Pressable
          key={row.key}
          accessibilityRole="button"
          accessibilityLabel={row.accessibilityLabel ?? row.label}
          onPress={() => onPick(row.key)}
          style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, pressed && styles.dim]}>
          <Text style={[styles.label, { color: color.text }]}>{row.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: tokens.space.sm },
  title: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  info: { fontSize: tokens.type.bodySmall },
  row: { minHeight: tokens.size.touch, justifyContent: 'center', paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.card },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  dim: { opacity: tokens.opacity.dim },
});
