import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InverseSurface, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Small line above the title, e.g. the decision label. */
  eyebrow?: string;
  /** The decision itself; one of the two places uppercase is allowed (ADR-016). */
  title: string;
  /** Body and actions; they render on the inverse surface. */
  children?: ReactNode;
  testID?: string;
};

/** The weekly call: black block on white, and inverted in dark mode (ADR-016). */
export function DecisionBlock({ eyebrow, title, children, testID }: Props) {
  const { color } = useTheme();
  return (
    <View testID={testID} style={[styles.block, { backgroundColor: color.decisionBackground }]}>
      {eyebrow !== undefined && <Text style={[styles.eyebrow, { color: color.accentInk }]}>{eyebrow}</Text>}
      <Text accessibilityRole="header" style={[styles.title, { color: color.decisionText }]}>
        {title}
      </Text>
      <InverseSurface>{children}</InverseSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: tokens.space.sm },
  eyebrow: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  title: {
    fontFamily: tokens.font.display,
    fontSize: tokens.type.decisionTitle,
    textTransform: 'uppercase',
  },
});
