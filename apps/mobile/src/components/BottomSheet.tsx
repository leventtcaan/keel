import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';

/**
 * A sheet that rises from the foot and is as tall as its rows (Evre 7 C4: Swap, End and the finish question are sheets over the
 * session, not panels that replace it). The page stays where it was behind a dim; a tap on the dim, or the system's back, closes it.
 * Short rows only: a sheet with a paragraph in it is a page in disguise.
 */
export function BottomSheet({ children, onClose, testID }: { children: ReactNode; onClose: () => void; testID?: string }) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  return (
    <Modal transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('modal.dismiss')} onPress={onClose} style={[styles.dim, { backgroundColor: color.shadow }]} />
        <SafeAreaView testID={testID} edges={['bottom']} style={[styles.sheet, { backgroundColor: color.background }]}>
          <View style={[styles.grabber, { backgroundColor: color.line }]} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" bounces={false}>
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  dim: { ...StyleSheet.absoluteFill, opacity: tokens.opacity.scrim },
  sheet: { maxHeight: '85%', borderTopLeftRadius: tokens.radius.card, borderTopRightRadius: tokens.radius.card },
  grabber: { alignSelf: 'center', width: tokens.size.touch, height: tokens.border.outline * 2, borderRadius: tokens.radius.track, marginTop: tokens.space.sm },
  body: { padding: tokens.space.lg, gap: tokens.space.sm },
});
