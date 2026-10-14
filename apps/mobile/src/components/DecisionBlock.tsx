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
  /** What a screen reader says of the control `onPress` makes, in place of reading the block's words. */
  pressLabel?: string;
  /** Under the control, outside it: buttons of their own, which a control around them would hide from a screen reader. */
  footer?: ReactNode;
  testID?: string;
};

/** The weekly call: black block on white, and inverted in dark mode (ADR-016). */
export function DecisionBlock({ eyebrow, aside, title, children, onPress, pressLabel, footer, testID }: Props) {
  const { color } = useTheme();
  const body = (
    <>
      {aside === undefined ? (
        eyebrow !== undefined && <Text style={[styles.eyebrow, { color: color.accentInk }]}>{eyebrow}</Text>
      ) : (
        <View style={styles.top}>
          <Text style={[styles.eyebrow, { color: color.accentInk }]}>{eyebrow}</Text>
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
      <Pressable accessibilityRole="button" accessibilityLabel={pressLabel} onPress={onPress} style={({ pressed }) => [styles.press, pressed && styles.dim]}>
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
  title: {
    fontFamily: tokens.font.display,
    fontSize: tokens.type.decisionTitle,
    textTransform: 'uppercase',
  },
});
