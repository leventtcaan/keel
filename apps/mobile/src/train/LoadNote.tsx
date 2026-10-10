import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Choice = { label: string; onPress: () => void };

/**
 * A weight to take or keep (ADR-075 #3, prototype `.note`): the sentence, then the weight the server offered and the one
 * shown. "Too heavy?" asks it with the lighter weight; the first sets of a move with no target, with the heavier one.
 * The person picks; nothing changes until they do.
 */
export function LoadNote({ text, use, keep }: { text: string; use: Choice; keep: Choice }) {
  const { color } = useTheme();
  return (
    <View testID="load-note" accessibilityRole="alert" style={[styles.note, { backgroundColor: color.surface }]}>
      <Text style={[styles.text, { color: color.text }]}>{text}</Text>
      <View style={styles.choices}>
        <Button label={use.label} size="sm" onPress={use.onPress} />
        <Button label={keep.label} size="sm" variant="ghost" onPress={keep.onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  text: { fontSize: tokens.type.bodySmall },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
});
