import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { tokens } from '@/theme/tokens';

/**
 * The way out of a modal sheet (K-1065): "Close" at its top right, always on the screen, as the sheets of iOS have their Done or
 * Cancel. A swipe down still works; this is for the person who does not know it. Place it above the sheet's scroll.
 * `title`: the sheet's heading in the same fixed row, left of Close (Evre 6 G, K-1066): a heading in the scroll slid half under this row when
 * a field took focus and the sheet scrolled to it; in the row it stays whole.
 */
export function ModalClose({
  label = t('modal.close'),
  accessibilityLabel,
  onPress,
  title,
}: {
  label?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  title?: string;
}) {
  return (
    <View style={[styles.bar, title !== undefined && styles.withTitle]}>
      {title !== undefined && (
        <View style={styles.title}>
          <ScreenTitle>{title}</ScreenTitle>
        </View>
      )}
      <Button label={label} accessibilityLabel={accessibilityLabel} variant="text" size="sm" onPress={onPress ?? (() => router.back())} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: tokens.space.md },
  withTitle: { alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm, paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, paddingBottom: tokens.space.sm },
  title: { flex: 1 },
});
