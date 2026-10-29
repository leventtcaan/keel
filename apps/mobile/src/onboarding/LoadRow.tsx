/**
 * One move's starting weight (prototype section 11 frame 7, #ob-weights; K-1058): its name and the load, "Not set" until moved.
 * A tap opens the lift's wheel under the row (the same Wheel About you uses), flicked to a number in the lift's load steps;
 * a tap on the open row closes it. The wheel's middle row is only a place to start (the empty bar), never a suggested load
 * (ADR-072). A lift set by mistake goes back to "Not set" with "Clear" under its wheel. VoiceOver hears the row as one button, name and
 * value, and the wheel as one adjustable control.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type UnitSystem, formatLoad } from '@/units/units';

import { Wheel } from './Wheel';
import { kgFromWheel, loadOnWheel, loadValues } from './weights';

type Props = {
  /** Already translated. */
  name: string;
  kg: number | undefined;
  units: UnitSystem;
  open: boolean;
  onToggle: () => void;
  /** The load the wheel came to rest on, in kg. */
  onChange: (kg: number) => void;
  /** Back to "Not set". */
  onClear: () => void;
};

export function LoadRow({ name, kg, units, open, onToggle, onChange, onClear }: Props) {
  const { color } = useTheme();
  const shown = kg === undefined ? t('onboarding.weights.unset') : formatLoad(kg, units);
  // Built outside the JSX children (the raw-text guard reads them).
  const clear =
    kg === undefined ? null : (
      <Button label={t('onboarding.weights.clear')} accessibilityLabel={t('onboarding.weights.clearLabel', { name })} variant="text" size="sm" onPress={onClear} />
    );
  return (
    <View style={[styles.box, { borderBottomColor: color.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${shown}`}
        accessibilityHint={t('onboarding.weights.rowHint')}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.row, pressed && styles.dim]}>
        <Text style={[styles.name, { color: color.text }]}>{name}</Text>
        <Text style={[styles.value, { color: kg === undefined ? color.muted : color.text }]}>{shown}</Text>
      </Pressable>
      {open && (
        <View style={styles.wheel}>
          <Wheel
            quiet
            label={name}
            unit={t(units === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit')}
            values={loadValues(units)}
            value={loadOnWheel(kg, units)}
            unset={kg === undefined}
            format={String}
            onChange={(value) => onChange(kgFromWheel(value, units))}
          />
          {clear}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderBottomWidth: tokens.border.hairline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
    minHeight: tokens.size.row,
  },
  name: { flex: 1, fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  value: { fontFamily: tokens.font.display, fontSize: tokens.type.number },
  wheel: { paddingBottom: tokens.space.sm },
  dim: { opacity: tokens.opacity.dim },
});
