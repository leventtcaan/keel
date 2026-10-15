import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const GLYPH = 24;

type Props = {
  /** What a screen reader calls the field ("Weight (kg)"); the number alone is on the screen. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** The unit after the number ("kg"), and its spoken name for the buttons ("kilograms"). */
  unit: string;
  spokenUnit: string;
  /** One step, written as the buttons say it ("0.1"). */
  step: string;
  canLower: boolean;
  canRaise: boolean;
  onLower: () => void;
  onRaise: () => void;
};

/**
 * The weigh screen's scale (K-980, prototype `#weigh`): the number big in the middle, plus and minus a tenth at either side.
 * The number is a field too: a tap types over it (the user test asked for both, `prototip/kullanici-testi.md`).
 */
export function ScaleRow({ label, value, onChangeText, unit, spokenUnit, step, canLower, canRaise, onLower, onRaise }: Props) {
  const { color } = useTheme();
  const button = (sign: 'minus' | 'plus', enabled: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(sign === 'minus' ? 'weighIn.minus' : 'weighIn.plus', { step, unit: spokenUnit })}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [styles.step, { backgroundColor: color.surface }, (pressed || !enabled) && styles.dim]}>
      <Svg width={GLYPH} height={GLYPH} viewBox="0 0 24 24" accessible={false}>
        <Path d={sign === 'minus' ? 'M5 12h14' : 'M12 5v14M5 12h14'} stroke={color.text} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {button('minus', canLower, onLower)}
      <View style={styles.number}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          maxLength={6}
          selectTextOnFocus
          placeholder="-"
          placeholderTextColor={color.muted}
          style={[styles.input, { color: color.text }]}
        />
        <Text style={[styles.unit, { color: color.muted }]}>{unit}</Text>
      </View>
      {button('plus', canRaise, onRaise)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.md },
  number: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: tokens.space.xs },
  input: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.tile, fontVariant: ['tabular-nums'], textAlign: 'center', minWidth: 120 },
  unit: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  step: {
    width: tokens.size.primaryButton,
    height: tokens.size.primaryButton,
    borderRadius: tokens.size.primaryButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: tokens.opacity.dim },
});
