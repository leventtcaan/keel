import { useState } from 'react';
import { type AccessibilityActionEvent, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated; what a screen reader calls the control ("Weight"). */
  label: string;
  /** Null: nothing is there yet (a first weigh-in has no last one to start from); the field is empty and the buttons wait for a number. */
  value: number | null;
  onChange: (value: number) => void;
  /** The field was cleared, or holds no number; only for a value that can be empty. */
  onEmpty?: () => void;
  /** One tap of - or +, and one swipe for VoiceOver. From a parameter at the call site, never typed in the screen. */
  step: number;
  min?: number;
  max?: number;
  /** After the number ("kg"), already translated. */
  unit?: string;
  /** How many decimals a value keeps; the step's own by default (2.5 → 1). A number typed past it is rounded to it. */
  decimals?: number;
  /** What the empty field says, already translated ("Pick"); "-" by default. */
  placeholder?: string;
  /**
   * For a screen that moves the number itself (a gym's loads are no fixed step apart, a first tap starts from a bar): given
   * the direction, what one tap does, or null where it would not move (the button is off). Replaces the plain step, the
   * buttons and VoiceOver's swipe alike; with it an empty value can be stepped from. `step` still sets the decimals and the keyboard.
   */
  steps?: (direction: 1 | -1) => (() => void) | null;
  /**
   * The tight box (prototype `.stp.c`, K-1048): the field's name sits inside it, over the number, and not on a line of its own
   * above, and the padding is the small one. Buttons keep their full size. For a screen with little height to spare (the
   * set card, with two steppers and the reps-left row above the dock of an iPhone SE).
   */
  compact?: boolean;
};

const ACTIONS = [{ name: 'increment' }, { name: 'decrement' }];

function decimalsOf(step: number): number {
  const [, fraction = ''] = String(step).split('.');
  return fraction.length;
}

/** One number with a floating point error removed ("0.30000000000000004" → 0.3). */
function round(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

/** "72.5", and "72" for a whole number: no trailing zero. */
function show(value: number, decimals: number): string {
  return String(round(value, decimals));
}

/** What was typed as a number, a comma or a dot for the decimal; null when it is no number yet ("", "-", "1,2,3"). */
function parse(text: string): number | null {
  const typed = text.trim().replace(',', '.');
  if (!/^\d*\.?\d*$/.test(typed) || !/\d/.test(typed)) return null;
  return Number(typed);
}

/**
 * − value + as one component (ADR-070 Ek 2 #5): the value is a field one taps and types into (decimal keyboard, a comma or
 * a dot), the buttons step it. One adjustable control for VoiceOver: swipe up or down to step.
 */
export function Stepper({ label, value, onChange, onEmpty, step, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, unit, decimals, placeholder = '-', steps, compact = false }: Props) {
  const { color } = useTheme();
  const places = decimals ?? decimalsOf(step);
  // What is on the screen while the field is being typed in: "5" on its way to "55" is not yet below the minimum. It holds
  // the value the typing gave the screen: when the value is another one by now (a step, a suggestion taken, the screen
  // set it), the draft is old and the value is shown, so a tap on + with the keyboard up is seen.
  const [draft, setDraft] = useState<{ text: string; value: number | null } | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, round(n, places)));
  const stepTo = (direction: 1 | -1): (() => void) | null => {
    if (steps !== undefined) return steps(direction);
    if (value === null) return null;
    const next = clamp(value + direction * step);
    return next === value ? null : () => onChange(next);
  };
  // A step while the field is being typed in: the number stepped to is shown, not what was typed (the keyboard stays up over a press).
  const stepBy = (direction: 1 | -1) => {
    setDraft(null);
    stepTo(direction)?.();
  };
  const typed = (text: string) => {
    const number = parse(text);
    if (number !== null) {
      const heard = clamp(number);
      setDraft({ text, value: heard });
      onChange(heard);
    } else {
      // Nothing to hear yet; a screen told of empty fields takes the number away, else the old value stays.
      setDraft({ text, value: onEmpty === undefined ? value : null });
      onEmpty?.();
    }
  };
  const adjusted = ({ nativeEvent: { actionName } }: AccessibilityActionEvent) => {
    if (actionName === 'increment') stepBy(1);
    else if (actionName === 'decrement') stepBy(-1);
  };
  const shown = value === null ? '' : show(value, places);
  const typing = draft !== null && draft.value === value;
  const field = (
    <View style={styles.value}>
      <TextInput
        accessibilityLabel={label}
        // One adjustable control: a swipe up or down steps it, a double tap types (VoiceOver).
        accessibilityRole="adjustable"
        accessibilityValue={{ text: unit === undefined ? shown : `${shown} ${unit}` }}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={adjusted}
        value={typing ? draft.text : shown}
        onChangeText={typed}
        onFocus={() => setDraft({ text: shown, value })}
        onBlur={() => setDraft(null)}
        onSubmitEditing={() => setDraft(null)}
        placeholder={placeholder}
        placeholderTextColor={color.muted}
        keyboardType={places > 0 ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        style={[styles.input, compact && styles.inputCompact, { color: color.text, borderBottomColor: color.edge }]}
      />
      {unit !== undefined && <Text style={[styles.unit, { color: color.muted }]}>{unit}</Text>}
    </View>
  );
  // Compact: its name over the number, inside the box. The input says its name to a screen reader, so the caption is not read again.
  const middle = compact ? (
    <View style={styles.middle}>
      <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.caption, { color: color.muted }]}>
        {label}
      </Text>
      {field}
    </View>
  ) : (
    field
  );
  return (
    <View testID="stepper-box" style={[styles.box, compact && styles.boxCompact, { backgroundColor: color.surface }]}>
      <StepButton direction={-1} label={t('stepper.decrease', { label })} disabled={stepTo(-1) === null} onPress={() => stepBy(-1)} />
      {middle}
      <StepButton direction={1} label={t('stepper.increase', { label })} disabled={stepTo(1) === null} onPress={() => stepBy(1)} />
    </View>
  );
}

function StepButton({ direction, label, disabled, onPress }: { direction: 1 | -1; label: string; disabled: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: color.raise }, (pressed || disabled) && styles.dim]}>
      <Icon name={direction === 1 ? 'plus' : 'minus'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.sm,
    borderRadius: tokens.radius.card,
  },
  // The tight box: the small padding and gap; the buttons are the same, so a thumb finds them where it did.
  boxCompact: { padding: tokens.space.xs, gap: tokens.space.xs },
  middle: { flex: 1, minWidth: 0, alignItems: 'center' },
  caption: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  button: {
    width: tokens.size.stepperButton,
    height: tokens.size.stepperButton,
    borderRadius: tokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: tokens.opacity.dim },
  value: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: tokens.space.sm },
  // The dotted line under the number says "type here" (prototype `.stp .sv b`).
  input: {
    fontFamily: tokens.font.display,
    fontSize: tokens.type.stepperValue,
    textAlign: 'center',
    minWidth: tokens.size.touch,
    paddingVertical: tokens.space.xs,
    borderBottomWidth: tokens.border.outline,
    borderStyle: 'dotted',
  },
  // The number's line is its size and its air above and below goes, so the caption and the number are as tall as a button.
  inputCompact: { lineHeight: tokens.type.stepperValue, paddingVertical: 0 },
  unit: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
});
