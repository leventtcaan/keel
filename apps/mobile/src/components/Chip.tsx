import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated. */
  label: string;
  selected?: boolean;
  /** Can't be chosen now (a seventh training day); shown dimmed. */
  disabled?: boolean;
  /** What a screen reader says, when the label is short for it ("M" → "Monday"). */
  accessibilityLabel?: string;
  onPress: () => void;
};

/**
 * A choice among a few; the selected one is filled with the text colour (prototype `.chip[aria-pressed]`). On the page
 * that equals the decision-block colours; inside the block (inverse palette) it flips, so it never vanishes into it.
 */
export function Chip({ label, selected = false, disabled = false, accessibilityLabel, onPress }: Props) {
  const { color } = useTheme();
  const fill = selected
    ? { backgroundColor: color.text, borderColor: color.text }
    : { backgroundColor: color.surface, borderColor: color.line };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, fill, disabled && styles.dim]}>
      <Text style={[styles.label, { color: selected ? color.background : color.text }]}>{label}</Text>
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
  dim: { opacity: tokens.opacity.dim },
  label: { fontSize: tokens.type.bodySmall },
});
