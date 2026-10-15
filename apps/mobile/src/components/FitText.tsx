import { StyleSheet, Text, type TextStyle, View } from 'react-native';

import { useBoldText } from '@/theme/useBoldText';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated. */
  children: string;
  style?: TextStyle | (TextStyle | false | undefined)[];
};

/**
 * Text in a box that is as wide as the text itself (a small button, a chip, a tag), without the box being exactly that wide.
 *
 * React Native sizes a paragraph's view to the measured text and clips what is drawn outside it. With iOS Bold Text on, a
 * label that hugs its text loses its end ("Log a mea", K-910). Then, and only then, the box is sized by a hidden copy of the
 * label in the heaviest weight and the shown label stretches to the box. With Bold Text off (and on Android) the label is
 * laid out as a plain Text, exactly as before. The hidden copy is invisible, zero high and skipped by screen readers; a
 * control that holds a FitText names itself with the label (an `accessibilityLabel`), never from its children.
 */
export function FitText({ children, style }: Props) {
  const bold = useBoldText();
  if (!bold) return <Text style={style}>{children}</Text>;
  return (
    <View style={styles.box}>
      <Text style={[style, styles.shown]}>{children}</Text>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[style, styles.sizer]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexShrink: 1 },
  shown: { alignSelf: 'stretch' },
  sizer: { fontWeight: tokens.weight.black, height: 0, opacity: 0, overflow: 'hidden' },
});
