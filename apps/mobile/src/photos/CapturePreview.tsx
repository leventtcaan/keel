import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { ThemeProvider, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Scrim } from './CameraChrome';
import type { Pose } from './library';

type Props = {
  uri: string;
  pose: Pose;
  step: number;
  total: number;
  /** The photo is being kept: both buttons wait. */
  busy: boolean;
  /** Keeping it failed: said, and the photo stays here to try again. */
  failed: boolean;
  onRetake: () => void;
  onUse: () => void;
};

/**
 * The photo just taken, or chosen from the library, full screen before anything is kept (K-1055, prototype §10 frame 5).
 * Retake keeps nothing and goes back to the same pose; only Use photo hands it to the photos folder (the screen does that).
 * Dark like the camera it follows.
 */
export function CapturePreview(props: Props) {
  return (
    <ThemeProvider scheme="dark">
      <Preview {...props} />
    </ThemeProvider>
  );
}

function Preview({ uri, pose, step, total, busy, failed, onRetake, onUse }: Props) {
  const { color } = useTheme();
  return (
    <View testID="capture-preview" style={[styles.fill, { backgroundColor: color.background }]}>
      <Image accessibilityLabel={t('capture.preview.photo', { pose: t(`capture.done.${pose}`) })} source={{ uri }} resizeMode="contain" style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <Scrim style={styles.pill}>
            <Text style={[styles.pillText, { color: color.text }]}>{t(`capture.pose.${pose}`, { step, total })}</Text>
          </Scrim>
        </View>
        <View style={styles.fill} />
        <Scrim style={styles.bar}>
          {failed ? <ProblemText style={[styles.failed, { color: color.text }]}>{t('capture.failed')}</ProblemText> : null}
          <View style={styles.buttons}>
            <View style={styles.fill}>
              <Button label={t('capture.preview.retake')} variant="secondary" onPress={onRetake} disabled={busy} />
            </View>
            <View style={styles.fill}>
              <Button label={t('capture.preview.use')} onPress={onUse} disabled={busy} busy={busy} />
            </View>
          </View>
        </Scrim>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { alignItems: 'center', paddingTop: tokens.space.sm },
  pill: { borderRadius: tokens.radius.card, overflow: 'hidden', paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm },
  pillText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  bar: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md, gap: tokens.space.md },
  failed: { fontSize: tokens.type.bodySmall, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: tokens.space.sm },
});
