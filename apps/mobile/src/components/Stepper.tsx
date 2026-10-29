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
export function Stepper({ label, value, onChange, onEmpty, step, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, unit, decimals }: Props) {
  const { color } = useTheme();
  const places = decimals ?? decimalsOf(step);
  // What is on the screen while the field is being typed in: "5" on its way to "55" is not yet below the minimum.
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, round(n, places)));
  const stepBy = (direction: 1 | -1) => {
    if (value === null) return;
    // A step while the field is being typed in: the number stepped to is shown, not what was typed (the keyboard stays up over a press).
    setDraft(null);
    onChange(clamp(value + direction * step));
  };
  const typed = (text: string) => {
    setDraft(text);
    const number = parse(text);
    if (number !== null) onChange(clamp(number));
    else onEmpty?.();
  };
  const adjusted = ({ nativeEvent: { actionName } }: AccessibilityActionEvent) => {
    if (actionName === 'increment') stepBy(1);
    else if (actionName === 'decrement') stepBy(-1);
  };
  const atMin = value === null || value <= min;
  const atMax = value === null || value >= max;
  const shown = value === null ? '' : show(value, places);
  return (
    <View style={[styles.box, { backgroundColor: color.surface }]}>
      <StepButton direction={-1} label={t('stepper.decrease', { label })} disabled={atMin} onPress={() => stepBy(-1)} />
      <View style={styles.value}>
        <TextInput
          accessibilityLabel={label}
          // One adjustable control: a swipe up or down steps it, a double tap types (VoiceOver).
          accessibilityRole="adjustable"
          accessibilityValue={{ text: unit === undefined ? shown : `${shown} ${unit}` }}
          accessibilityActions={ACTIONS}
          onAccessibilityAction={adjusted}
          value={draft ?? shown}
          onChangeText={typed}
          onFocus={() => setDraft(shown)}
          onBlur={() => setDraft(null)}
          onSubmitEditing={() => setDraft(null)}
          placeholder="-"
          placeholderTextColor={color.muted}
          keyboardType={places > 0 ? 'decimal-pad' : 'number-pad'}
          selectTextOnFocus
          style={[styles.input, { color: color.text, borderBottomColor: color.edge }]}
        />
        {unit !== undefined && <Text style={[styles.unit, { color: color.muted }]}>{unit}</Text>}
      </View>
      <StepButton direction={1} label={t('stepper.increase', { label })} disabled={atMax} onPress={() => stepBy(1)} />
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
  unit: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
});
