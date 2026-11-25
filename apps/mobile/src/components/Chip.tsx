import { Pressable, StyleSheet } from 'react-native';

import { FitText } from '@/components/FitText';
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
  /** A full touch target (size.touch tall), where the chip is a control of its own rather than one of a dense row. */
  touch?: boolean;
  /** The one choice still missing before the step can go on: outlined in the accent until one is made. */
  needed?: boolean;
  onPress: () => void;
};

/**
 * A choice among a few. The selected one is petrol, the colour of a selection (ADR-094 §1), on its soft ground with a petrol
 * ring and label: a solid petrol fill is the screen's one primary button, so a chosen answer never looks like a second one.
 */
export function Chip({ label, selected = false, disabled = false, accessibilityLabel, touch = false, needed = false, onPress }: Props) {
  const { color } = useTheme();
  const fill = selected
    ? { backgroundColor: color.accentSoft, borderColor: color.accent, borderWidth: tokens.border.outline }
    : { backgroundColor: color.surface, borderColor: needed ? color.accent : color.edge, ...(needed ? { borderWidth: tokens.border.outline } : {}) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, fill, touch && styles.touch, disabled && styles.dim]}>
      <FitText style={[styles.label, { color: selected ? color.accent : color.text }]}>{label}</FitText>
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
  touch: { minHeight: tokens.size.touch, minWidth: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  label: { fontSize: tokens.type.bodySmall, textAlign: 'center' },
});
