import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet } from 'react-native';

import { FitText } from '@/components/FitText';
import { useTheme } from '@/theme/theme';
import { type Palette, tokens } from '@/theme/tokens';

/**
 * The four roles of ADR-070 Ek 2 #1; the look comes from the role.
 * - primary: the screen's one main action, the `cta` fill (black on light, turquoise on dark and in the workout's focus mode).
 * - secondary: the alternative beside it, a surface fill, no outline, ink words.
 * - text: an action inside a line ("Edit", "Undo"), the accent as words, no fill, no outline.
 * - destructive: starts a destructive action, the warning colour as words, no fill (the confirmation is a system alert, ADR-087).
 */
type Role = 'primary' | 'secondary' | 'text' | 'destructive';

/**
 * `ghost` and `warn` are the names before the roles (K-1041). `ghost` draws as secondary (the outlined pill is gone) and
 * `warn` as destructive (a filled red button is gone). Deprecated: a later task moves the call sites to the roles.
 */
export type ButtonVariant = Role | 'ghost' | 'warn';

type Props = {
  /** Already translated: callers pass t('…'). */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /**
   * 'md' is the full-width 54 pt button of a screen's dock; 'sm' is compact (its touch area is widened without changing its
   * look); 'touch' is as small as 'sm' but at least size.touch tall, for a choice made mid-set. The text and destructive
   * roles are size.touch tall at any size.
   */
  size?: 'md' | 'sm' | 'touch';
  disabled?: boolean;
  /** Working on it: a screen reader hears "busy"; the caller also changes the label so a sighted user sees it too. */
  busy?: boolean;
  /** What a screen reader says when the label is short for it ("Withdraw" → "Withdraw Health data"). */
  accessibilityLabel?: string;
};

const ROLE_OF: Record<ButtonVariant, Role> = {
  primary: 'primary',
  secondary: 'secondary',
  text: 'text',
  destructive: 'destructive',
  ghost: 'secondary',
  warn: 'destructive',
};

function colours(role: Role, color: Palette) {
  switch (role) {
    case 'primary':
      return { fill: { backgroundColor: color.cta }, ink: color.onCta };
    case 'secondary':
      // Inside the decision block the surface is the block itself (inverse()), so the fill would vanish: the block's line stands in.
      return { fill: { backgroundColor: color.surface === color.background ? color.raise : color.surface }, ink: color.text };
    case 'text':
      return { fill: null, ink: color.accent };
    case 'destructive':
      return { fill: null, ink: color.warn };
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
  const role = ROLE_OF[variant];
  const words = role === 'text' || role === 'destructive';
  const { fill, ink } = colours(role, color);
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
      style={({ pressed }) => [
        styles.base,
        size !== 'md' && styles.small,
        size === 'touch' && styles.touch,
        size === 'md' && !words && styles.dock,
        words && styles.words,
        fill,
        (pressed || disabled) && styles.dim,
      ]}>
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
  /** The screen's main buttons, primary and secondary, are 54 pt tall (ADR-070 #6). */
  dock: { minHeight: tokens.size.primaryButton, justifyContent: 'center' },
  /** Words with no box: the press is still size.touch tall, the padding is only a little air around them. */
  words: { minHeight: tokens.size.touch, justifyContent: 'center', paddingVertical: 0, paddingHorizontal: tokens.space.xs },
  dim: { opacity: tokens.opacity.dim },
  label: { fontSize: tokens.type.button, fontWeight: tokens.weight.semibold, textAlign: 'center' },
  labelSmall: { fontSize: tokens.type.buttonSmall },
});
