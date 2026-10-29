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
  /** On a surface card, its heading inside, as Progress's target boxes (K-1054); without it the content sits on the page. */
  card?: boolean;
};

/**
 * A section of a page that is not a card (ADR-070 Ek 2 #7, #8): a heading in the system's semibold 13 pt ink, the same one a
 * grouped list's title has, and its content straight on the page. A card is for a role (the decision block, today's workout,
 * a grouped list); a section is not one, so every part of Progress is not the same grey box.
 * Progress's parts are cards since K-1054 (ADR-070 Ek 4): on the page, under the target boxes, they read as loose text, not as
 * the parts of one screen; the heading then takes the boxes' title style.
 */
export function Section({ title, aside, children, testID, card = false }: Props) {
  const { color } = useTheme();
  // Built outside the JSX children (the raw-text guard reads them).
  const quiet = aside == null ? null : <Text style={[styles.aside, { color: color.muted }]}>{aside}</Text>;
  return (
    <View testID={testID} style={[styles.section, card && [styles.card, { backgroundColor: color.surface }]]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.title, card && styles.cardTitle, { color: card ? color.muted : color.text }]}>
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
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.md },
  cardTitle: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.sm },
  title: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  aside: { fontSize: tokens.type.label },
});
