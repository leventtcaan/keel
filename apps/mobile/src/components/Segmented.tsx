import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Option<T extends string> = {
  value: T;
  /** Already translated. */
  label: string;
};

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

/**
 * A segmented control (ADR-070 Ek 2 #2, prototype `.seg`): two to three exclusive choices side by side in one track, the
 * chosen one raised in the text colour. It is for a setting that is always one of a few (Light, Dark, System); a choice
 * among many, or one that triggers an action, stays a Chip. Each segment is a button that says whether it is selected, and
 * is at least size.touch tall.
 */
export function Segmented<T extends string>({ options, value, onChange, testID }: Props<T>) {
  const { color } = useTheme();
  return (
    <View testID={testID} style={[styles.track, { backgroundColor: color.surface }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: color.text }]}>
            <Text style={[styles.label, { color: selected ? color.background : color.text }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: tokens.space.xs, gap: tokens.space.xs, borderRadius: tokens.radius.button + tokens.space.xs },
  segment: {
    flex: 1,
    minHeight: tokens.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.button,
  },
  label: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold, textAlign: 'center' },
});
