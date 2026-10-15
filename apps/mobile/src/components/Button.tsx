import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet } from 'react-native';

import { FitText } from '@/components/FitText';
import { useTheme } from '@/theme/theme';
import { type Palette, tokens } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'ghost' | 'warn';

type Props = {
  /** Already translated: callers pass t('…'). */
  label: string;
  onPress: () => void;
  /** 'warn' only for the confirming step of a destructive action (ADR-016). */
  variant?: ButtonVariant;
  /** 'touch': as small as 'sm' but at least size.touch tall, for a choice made mid-set. */
  size?: 'md' | 'sm' | 'touch';
  disabled?: boolean;
  /** Working on it: a screen reader hears "busy"; the caller also changes the label so a sighted user sees it too. */
  busy?: boolean;
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

type Reach = { top: number; bottom: number; left: number; right: number };

/**
 * How far past its drawn edge each side must take a press for the button to be size.touch across (K-1027). Half of
 * the shortfall per side: the look is untouched, only where a finger counts changes. Null when it is already big enough.
 */
function reachFor(width: number, height: number): Reach | null {
  const up = Math.ceil(Math.max(0, tokens.size.touch - height) / 2);
  const across = Math.ceil(Math.max(0, tokens.size.touch - width) / 2);
  return up === 0 && across === 0 ? null : { top: up, bottom: up, left: across, right: across };
}

export function Button({ label, onPress, variant = 'primary', size = 'md', disabled = false, busy = false, accessibilityLabel }: Props) {
  const { color } = useTheme();
  const { fill, ink } = colours(variant, color);
  // The drawn size is known only after layout (text and padding decide it), so the reach is worked out from it.
  const [reach, setReach] = useState<Reach | null>(null);
  const measured = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    const next = reachFor(layout.width, layout.height);
    // The same reach again is no change: a button laid out twice is not drawn twice.
    setReach((prev) => (prev?.top === next?.top && prev?.left === next?.left ? prev : next));
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      onLayout={measured}
      hitSlop={reach ?? undefined}
      style={({ pressed }) => [styles.base, size !== 'md' && styles.small, size === 'touch' && styles.touch, fill, (pressed || disabled) && styles.dim]}>
      <FitText style={[styles.label, size !== 'md' && styles.labelSmall, { color: ink }]}>{label}</FitText>
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
  touch: { minHeight: tokens.size.touch, justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  label: { fontSize: tokens.type.button, fontWeight: tokens.weight.semibold, textAlign: 'center' },
  labelSmall: { fontSize: tokens.type.buttonSmall },
});
