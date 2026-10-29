import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * A titled group of settings that is not a list (a segmented choice, an editor): the title is the grouped list's own
 * (small, semibold, ink; ADR-070 Ek 2 #2, #7). Without a title it is only the spacing, for a sub-page whose title is the page's.
 */
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const { color } = useTheme();
  const heading =
    title === undefined ? null : (
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {title}
      </Text>
    );
  return (
    <View style={styles.section}>
      {heading}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space.sm },
  title: { marginLeft: tokens.space.xs, fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
});
