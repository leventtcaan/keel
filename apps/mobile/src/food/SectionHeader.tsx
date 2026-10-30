import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated. */
  title: string;
  /** One quiet action at the end ("View day", "Show all 8"): words in the accent, never a box. */
  action?: { label: string; onPress: () => void; accessibilityLabel?: string };
  testID?: string;
};

/**
 * The one section header of the food screens (Evre 7 review §A): 17 pt semibold in ink over its card, with at most one quiet action at the
 * end. Log a meal and Today's food use the same one, so a section reads the same on both.
 */
export function SectionHeader({ title, action, testID }: Props) {
  const { color } = useTheme();
  // Built outside the JSX children (the raw-text guard reads them).
  const quiet = action === undefined ? null : <Button label={action.label} accessibilityLabel={action.accessibilityLabel} variant="text" size="sm" onPress={action.onPress} />;
  return (
    <View testID={testID} style={styles.row}>
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {title}
      </Text>
      {quiet}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: tokens.size.touch },
  title: { flexShrink: 1, fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
});
