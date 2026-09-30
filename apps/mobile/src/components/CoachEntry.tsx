import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The way to the coach, on every tab (ADR-006: one tap from any screen). Styled as the prototype's "Ask" bar above
 * the tab bar; the coach itself arrives in M5.
 */
export function CoachEntry() {
  const { color } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/coach')}
      style={[styles.bar, { backgroundColor: color.surface, borderColor: color.line }]}>
      <Text style={[styles.label, { color: color.muted }]}>{t('coach.entry')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: tokens.radius.card,
    borderWidth: tokens.border.hairline,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
  },
  label: { fontSize: tokens.type.body },
});
