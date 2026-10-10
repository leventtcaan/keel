import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * One line the session says about the move under way (ADR-075 #4, prototype `.insight-l`): a mark and a sentence, in the
 * page between the sets done and the set under way. Its words are en.json templates filled with the server's numbers.
 */
export function InsightLine({ text }: { text: string }) {
  const { color } = useTheme();
  return (
    <View testID="insight" accessible accessibilityRole="text" accessibilityLabel={text} style={[styles.line, { backgroundColor: color.surface }]}>
      <SymbolView name="checkmark" size={tokens.type.bodySmall} tintColor={color.accent} />
      <Text style={[styles.text, { color: color.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  text: { flex: 1, fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
});
