import { type ReactNode, useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OnPaper } from '@/components/ListGroup';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * A titled group of settings that is not a list (a segmented choice, an editor): the title is the grouped list's own
 * (small, semibold, ink; ADR-070 Ek 2 #2, #7), the serif voice on the paper of a Settings page (ADR-094 Ek 9). Without a title it is only the spacing, for a sub-page whose title is the page's.
 */
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const { color } = useTheme();
  const paper = useContext(OnPaper);
  const heading =
    title === undefined ? null : (
      <Text accessibilityRole="header" style={[paper ? styles.paperTitle : styles.title, { color: color.text }]}>
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
  // On a Settings page the title is the serif voice, as a list group's there (ADR-094 Ek 9).
  paperTitle: { ...tokens.face.display, fontSize: tokens.type.groupTitle },
});
