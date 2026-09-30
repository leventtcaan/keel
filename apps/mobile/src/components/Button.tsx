import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/theme';
import { type Palette, tokens } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'ghost' | 'warn';

type Props = {
  /** Already translated: callers pass t('…'). */
  label: string;
  onPress: () => void;
  /** 'warn' only for the confirming step of a destructive action (ADR-016). */
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  disabled?: boolean;
  /** What a screen reader says when the label is short for it ("Withdraw" → "Withdraw Health data"). */
  accessibilityLabel?: string;
};

function colours(variant: ButtonVariant, color: Palette) {
  switch (variant) {
    case 'primary':
      return { fill: { backgroundColor: color.accent }, ink: color.onAccent };
    case 'warn':
      return { fill: { backgroundColor: color.warn }, ink: color.onWarn };
    case 'ghost':
      return { fill: { borderColor: color.text, borderWidth: tokens.border.outline }, ink: color.text };
  }
}

export function Button({ label, onPress, variant = 'primary', size = 'md', disabled = false, accessibilityLabel }: Props) {
  const { color } = useTheme();
  const { fill, ink } = colours(variant, color);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, size === 'sm' && styles.small, fill, (pressed || disabled) && styles.dim]}>
      <Text style={[styles.label, size === 'sm' && styles.labelSmall, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: tokens.radius.button,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    alignItems: 'center',
  },
  small: { paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, alignSelf: 'flex-start' },
  dim: { opacity: tokens.opacity.dim },
  label: { fontSize: tokens.type.button, fontWeight: tokens.weight.semibold },
  labelSmall: { fontSize: tokens.type.buttonSmall },
});
