import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** The section's heading, already translated. */
  title: string;
  /** A quiet word at the right end of the heading line ("this week", "best set"). */
  aside?: string | null;
  children?: ReactNode;
  testID?: string;
};

/**
 * A section of a page that is not a card (ADR-070 Ek 2 #7, #8): a heading in the system's semibold 13 pt ink, the same one a
 * grouped list's title has, and its content straight on the page. A card is for a role (the decision block, today's workout,
 * a grouped list); a section is not one, so every part of Progress is not the same grey box.
 */
export function Section({ title, aside, children, testID }: Props) {
  const { color } = useTheme();
  // Built outside the JSX children (the raw-text guard reads them).
  const quiet = aside == null ? null : <Text style={[styles.aside, { color: color.muted }]}>{aside}</Text>;
  return (
    <View testID={testID} style={styles.section}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
          {title}
        </Text>
        {quiet}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space.sm },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.sm },
  title: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  aside: { fontSize: tokens.type.label },
});
