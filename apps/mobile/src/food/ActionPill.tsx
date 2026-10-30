import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated. */
  label: string;
  icon: SFSymbol;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * A secondary action drawn as an icon and a short word on a filled pill (Quick add, Create food): clearer than a text link, quieter than
 * the screen's one primary button. Several share a row, each taking an equal part of it.
 */
export function ActionPill({ label, icon, onPress, accessibilityLabel, testID }: Props) {
  const { color } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { backgroundColor: color.surface }, pressed && styles.dim]}>
      <Icon name={icon} size="small" tone="accent" />
      <Text style={[styles.label, { color: color.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minHeight: tokens.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    borderRadius: tokens.radius.button,
    paddingHorizontal: tokens.space.md,
  },
  label: { flexShrink: 1, fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  dim: { opacity: tokens.opacity.dim },
});
