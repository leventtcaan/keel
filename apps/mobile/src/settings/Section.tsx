import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** A titled group of settings. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.title, { color: color.muted }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space.sm },
  title: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
});
