import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Option<T extends string> = {
  value: T;
  /** What the word says. Already translated. */
  label: string;
  /** What a screen reader says, when the word is short for it ("kg, cm" is "Metric (kg, cm)"). Already translated. */
  spoken?: string;
};

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

/**
 * A choice of a few as words on the paper (ADR-094 Ek 9, K-1258; the walk's "On the map | By distance", Ek 7): the chosen word in
 * petrol over a petrol line, the others muted, no filled segment. Each word is a button that says whether it is selected, at least
 * size.touch tall.
 */
export function WordChoice<T extends string>({ options, value, onChange, testID }: Props<T>) {
  const { color } = useTheme();
  return (
    <View testID={testID} style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.spoken ?? option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.word, { borderBottomColor: selected ? color.accent : color.background }]}>
            <Text style={[styles.label, selected ? { color: color.accent, ...styles.chosen } : { color: color.muted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: tokens.space.xl },
  word: { minHeight: tokens.size.touch, justifyContent: 'center', borderBottomWidth: tokens.border.underline },
  label: { fontSize: tokens.type.body },
  chosen: { fontWeight: tokens.weight.semibold },
});
