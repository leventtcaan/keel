import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /**
   * 'ask': the camera has not been asked for yet; Continue asks (only on a tap, never on arrival).
   * 'off': it was refused for good (iOS asks once); only Settings can turn it on again.
   */
  state: 'ask' | 'off';
  busy: boolean;
  failed: boolean;
  onAllow: () => void;
  onSettings: () => void;
  onLibrary: () => void;
  onClose: () => void;
};

/**
 * No camera to show (K-1055, prototype §10 frame 8): not asked yet, or refused. Either way a photo from the library still
 * works, through the same preview, so the flow is never a dead end; the simulator, which has no camera, lives here too.
 */
export function CaptureNoCamera({ state, busy, failed, onAllow, onSettings, onLibrary, onClose }: Props) {
  const { color } = useTheme();
  const off = state === 'off';
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <ScreenTitle>{t(off ? 'capture.off.title' : 'capture.ask.title')}</ScreenTitle>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t(off ? 'capture.off.body' : 'capture.ask.body')}</Text>
        {failed ? <ProblemText style={[styles.text, { color: color.text }]}>{t('capture.failed')}</ProblemText> : null}
      </View>
      <View style={styles.buttons}>
        {off ? <Button label={t('capture.off.settings')} onPress={onSettings} /> : <Button label={t('capture.allow')} onPress={onAllow} />}
        <Button label={t('capture.library')} variant="secondary" onPress={onLibrary} disabled={busy} />
        <Button label={t('capture.close')} variant="text" onPress={onClose} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { flex: 1, paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.xl, gap: tokens.space.md },
  text: { fontSize: tokens.type.body },
  buttons: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md, gap: tokens.space.sm },
});
