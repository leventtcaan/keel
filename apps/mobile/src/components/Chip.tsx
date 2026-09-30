import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated. */
  label: string;
  selected?: boolean;
  onPress: () => void;
};

/** A choice among a few; the selected one takes the inverse surface (prototype `.chip[aria-pressed]`). */
export function Chip({ label, selected = false, onPress }: Props) {
  const { color } = useTheme();
  const fill = selected
    ? { backgroundColor: color.decisionBackground, borderColor: color.decisionBackground }
    : { backgroundColor: color.surface, borderColor: color.line };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, fill]}>
      <Text style={[styles.label, { color: selected ? color.decisionText : color.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: tokens.radius.chip,
    borderWidth: tokens.border.hairline,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  label: { fontSize: tokens.type.bodySmall },
});
