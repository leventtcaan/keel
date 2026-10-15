import { Pressable, StyleSheet, Text } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated. */
  label: string;
  /** What the row holds now, already translated; empty while it is being read. */
  value?: string;
  /** A locked row says what it needs and cannot be opened. */
  disabled?: boolean;
  onPress?: () => void;
};

/**
 * One line of Settings (prototype `.rowbtn`): what it is, what it holds now, and that it opens. A screen reader gets one
 * button named with both, never the arrow. At least a touch target tall (ADR-070 #6).
 */
export function SettingsRow({ label, value = '', disabled = false, onPress }: Props) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value === '' ? label : `${label}, ${value}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, (pressed || disabled) && styles.dim]}>
      <Text style={[styles.label, { color: color.text }]}>{label}</Text>
      <Text style={[styles.value, { color: color.textSecondary }]}>{value}</Text>
      {!disabled && <Text style={[styles.mark, { color: color.muted }]}>{t('settings.forwardMark')}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    minHeight: tokens.size.touch,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.card,
  },
  // Both grow into the room the row has, so neither box is as wide as its text (Bold Text, K-910).
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, flexGrow: 1, flexShrink: 1 },
  value: { flexGrow: 1, flexShrink: 1, textAlign: 'right', fontSize: tokens.type.bodySmall },
  mark: { fontSize: tokens.type.body },
  dim: { opacity: tokens.opacity.dim },
});
