/**
 * One move's starting weight (prototype `.wrow`, #ob-weights): its name, less, the load, more. Unset until the first
 * "more"; each step is the stepper's (weights.ts › stepWeight). VoiceOver reaches less and more by the move's name.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type UnitSystem, formatLoad } from '@/units/units';

type Props = {
  /** Already translated. */
  name: string;
  kg: number | undefined;
  units: UnitSystem;
  onStep: (direction: 1 | -1) => void;
};

export function LoadStepper({ name, kg, units, onStep }: Props) {
  const { color } = useTheme();
  const shown = kg === undefined ? t('onboarding.weights.unset') : formatLoad(kg, units);
  const button = (direction: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(direction > 0 ? 'onboarding.weights.more' : 'onboarding.weights.less', { move: name })}
      accessibilityState={{ disabled: direction < 0 && kg === undefined }}
      disabled={direction < 0 && kg === undefined}
      onPress={() => onStep(direction)}
      hitSlop={tokens.space.xs}
      style={({ pressed }) => [styles.step, { backgroundColor: color.surface }, pressed && styles.dim]}>
      <Text style={[styles.mark, { color: color.text }]}>{t(direction > 0 ? 'onboarding.weights.plusMark' : 'onboarding.weights.minusMark')}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.row, { borderBottomColor: color.line }]}>
      <Text style={[styles.name, { color: color.text }]}>{name}</Text>
      {button(-1)}
      <Text accessibilityLabel={`${name}, ${shown}`} style={[styles.value, { color: kg === undefined ? color.muted : color.text }]}>
        {shown}
      </Text>
      {button(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    borderBottomWidth: tokens.border.hairline,
  },
  name: { flex: 1, fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  step: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    borderRadius: tokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  value: { minWidth: tokens.size.primaryButton * 2, textAlign: 'center', fontFamily: tokens.font.display, fontSize: tokens.type.number },
  dim: { opacity: tokens.opacity.dim },
});
