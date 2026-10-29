import { type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

export type MoveAction = {
  key: string;
  /** Already translated. */
  label: string;
  /** What a screen reader says when the label is short for it ("Skip move" → "Skip Bench press today"). */
  accessibilityLabel?: string;
  icon: SFSymbol;
};

/**
 * What "More" opens under the move's header (ADR-070 Ek 2 #1, prototype `.pop`): the move's rarer actions, one row each with
 * its icon, so the header keeps one row of links. Pressing a row does it and the caller closes the menu.
 */
export function MoveMenu({ actions, onPick }: { actions: MoveAction[]; onPick: (key: string) => void }) {
  const { color } = useTheme();
  return (
    <View testID="more-menu" style={[styles.menu, { backgroundColor: color.surface }]}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          onPress={() => onPick(action.key)}
          style={({ pressed }) => [styles.row, pressed && styles.dim]}>
          <Icon name={action.icon} size="small" />
          <Text style={[styles.label, { color: color.text }]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: { borderRadius: tokens.radius.card, paddingHorizontal: tokens.space.md },
  row: { minHeight: tokens.size.touch, flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  label: { fontSize: tokens.type.body },
  dim: { opacity: tokens.opacity.dim },
});
