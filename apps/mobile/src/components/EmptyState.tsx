import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  icon: SFSymbol;
  /** Already translated: one line, what to do here (Evre 7 §A: one empty state, an icon and one line). */
  text: string;
  testID?: string;
};

/** What a list says when it has nothing yet: an icon and one line, centred. */
export function EmptyState({ icon, text, testID }: Props) {
  const { color } = useTheme();
  return (
    <View style={styles.wrap} testID={testID}>
      <Icon name={icon} tone="muted" />
      <Text style={[styles.text, { color: color.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.lg },
  text: { fontSize: tokens.type.body, textAlign: 'center' },
});
