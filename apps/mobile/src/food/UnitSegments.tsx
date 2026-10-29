import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** Smaller than a chip's touch target (the chips above it are size.touch with their padding): the press still reaches size.touch (hitSlop). */
const SEGMENT = tokens.size.touch - tokens.space.sm;

type Unit = {
  value: string;
  /** On the segment, already translated. */
  label: string;
  /** What a screen reader says ("Rice in g"). */
  spoken: string;
};

type Props = {
  units: readonly Unit[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
};

/**
 * The units of one food (prototype `.seg`, ADR-070 Ek 2 #1): a track with the chosen one raised in the text colour, smaller than
 * the slot chips above it and with no outline, so the two choices never look like one control. A food can have more units than
 * `Segmented` takes (each serving it names, then grams), so they wrap in the track instead of sharing one row. Each is a button
 * that says whether it is selected; the drawn segment is small and its press reaches size.touch.
 */
export function UnitSegments({ units, value, onChange, testID }: Props) {
  const { color } = useTheme();
  const reach = (tokens.size.touch - SEGMENT) / 2;
  return (
    <View testID={testID} style={[styles.track, { backgroundColor: color.surface }]}>
      {units.map((unit) => {
        const selected = unit.value === value;
        return (
          <Pressable
            key={unit.value}
            accessibilityRole="button"
            accessibilityLabel={unit.spoken}
            accessibilityState={{ selected }}
            hitSlop={{ top: reach, bottom: reach }}
            onPress={() => onChange(unit.value)}
            style={[styles.segment, selected && { backgroundColor: color.text }]}>
            <Text style={[styles.label, { color: selected ? color.background : color.text }]}>{unit.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', padding: tokens.space.xs, gap: tokens.space.xs, borderRadius: tokens.radius.button + tokens.space.xs },
  segment: {
    minHeight: SEGMENT,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.button,
  },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold, textAlign: 'center' },
});
