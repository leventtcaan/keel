import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Ways into the coach from the day's data (prototype 2.1): in the coach a chip is answered there (onChip); without onChip
 * (a chip shown elsewhere) it opens the coach on it (K-509; no other screen shows them today). Ready questions are sand
 * pills (ADR-094 §3, y5-e3) in one row that scrolls sideways above the box: no outline, the words say what each is (a
 * button named by its text, WCAG 1.4.11).
 */
export function CoachChips({ keys, onChip }: { keys: string[]; onChip?: (key: string) => void }) {
  const { color } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
      {keys.map((key) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={t(key)}
          onPress={() => (onChip !== undefined ? onChip(key) : router.push({ pathname: '/coach', params: { chip: key } }))}
          style={({ pressed }) => [styles.pill, { backgroundColor: color.tintDay }, pressed && styles.dim]}>
          <Text style={[styles.label, { color: color.text }]}>{t(key)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chips: { gap: tokens.space.sm, paddingHorizontal: tokens.space.lg },
  pill: { minHeight: tokens.size.touch, justifyContent: 'center', paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.button },
  label: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
