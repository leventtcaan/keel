import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { tokens } from '@/theme/tokens';

/**
 * The way out of a modal sheet (K-1065): "Close" at its top right, always on the screen, as the sheets of iOS have their Done or
 * Cancel. A swipe down still works; this is for the person who does not know it. Place it above the sheet's scroll.
 */
export function ModalClose({ label = t('modal.close'), accessibilityLabel, onPress }: { label?: string; accessibilityLabel?: string; onPress?: () => void }) {
  return (
    <View style={styles.bar}>
      <Button label={label} accessibilityLabel={accessibilityLabel} variant="text" size="sm" onPress={onPress ?? (() => router.back())} />
    </View>
  );
}

const styles = StyleSheet.create({ bar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: tokens.space.md } });
