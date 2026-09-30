import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated. */
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * One answer of a single-choice question, with a line on what it means (prototype `.opt`). A radio for screen readers:
 * title and line are read together, and whether it is the one chosen.
 */
export function OptionCard({ title, body, selected, onPress }: Props) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}, ${body}`}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: color.surface, borderColor: selected ? color.text : color.surface },
      ]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: color.text }]}>{title}</Text>
        <View style={[styles.dot, { borderColor: selected ? color.accent : color.muted }]}>
          {selected && <View style={[styles.fill, { backgroundColor: color.accent }]} />}
        </View>
      </View>
      <Text style={[styles.body, { color: color.muted }]}>{body}</Text>
    </Pressable>
  );
}

const DOT = 20;
const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.card,
    borderWidth: tokens.border.outline,
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: tokens.space.sm },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, flexShrink: 1 },
  body: { fontSize: tokens.type.bodySmall },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: tokens.border.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { width: DOT / 2, height: DOT / 2, borderRadius: DOT / 4 },
});
