import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InverseSurface, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Small line above the title, e.g. the decision label. */
  eyebrow?: string;
  /** The decision itself; one of the two places uppercase is allowed (ADR-016). */
  title: string;
  /** Beside the eyebrow, on its line: a small mark such as the arrow of a block that opens (This week's hero, K-969). */
  aside?: ReactNode;
  /** Body and actions; they render on the inverse surface. */
  children?: ReactNode;
  /** The block opens something: the eyebrow, title and children are one control (This week's hero, K-1013). */
  onPress?: () => void;
  /** What a screen reader reads of the control `onPress` makes: the block's own words (its title and line), not only what a tap does. */
  pressLabel?: string;
  /** What the tap does, said after the label ("Open the call"). */
  pressHint?: string;
  /** Under the control, outside it: buttons of their own, which a control around them would hide from a screen reader. */
  footer?: ReactNode;
  testID?: string;
};

/** The weekly call: black block on white, and inverted in dark mode (ADR-016). */
export function DecisionBlock({ eyebrow, aside, title, children, onPress, pressLabel, pressHint, footer, testID }: Props) {
  const { color } = useTheme();
  const body = (
    <>
      {aside === undefined ? (
        eyebrow !== undefined && <Text style={[styles.eyebrow, { color: color.accentInk }]}>{eyebrow}</Text>
      ) : (
        <View style={styles.top}>
          <Text style={[styles.eyebrow, styles.eyebrowBeside, { color: color.accentInk }]}>{eyebrow}</Text>
          <InverseSurface>{aside}</InverseSurface>
        </View>
      )}
      <Text accessibilityRole="header" style={[styles.title, { color: color.decisionText }]}>
        {title}
      </Text>
      <InverseSurface>{children}</InverseSurface>
    </>
  );
  // Built outside the JSX children (the raw-text guard reads them).
  const opening =
    onPress === undefined ? (
      body
    ) : (
      <Pressable accessibilityRole="button" accessibilityLabel={pressLabel} accessibilityHint={pressHint} onPress={onPress} style={({ pressed }) => [styles.press, pressed && styles.dim]}>
        {body}
      </Pressable>
    );
  return (
    <View testID={testID} style={[styles.block, { backgroundColor: color.decisionBackground }]}>
      {opening}
      {footer === undefined ? null : <InverseSurface>{footer}</InverseSurface>}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: tokens.space.sm },
  press: { gap: tokens.space.sm },
  dim: { opacity: tokens.opacity.dim },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  eyebrow: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  /** Beside the mark the eyebrow takes the rest of the line, so its box is wider than its text (Bold Text, K-910). */
  eyebrowBeside: { flexGrow: 1, flexShrink: 1 },
  title: {
    fontFamily: tokens.font.display,
    fontSize: tokens.type.decisionTitle,
    textTransform: 'uppercase',
  },
});
