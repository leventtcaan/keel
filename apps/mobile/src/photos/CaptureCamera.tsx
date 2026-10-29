import { CameraView, type CameraType } from 'expo-camera';
import { type Ref, useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { announce, ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { ThemeProvider, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { RoundButton, Scrim } from './CameraChrome';
import type { Pose } from './library';
import { photoParams } from './params';
import { Silhouette } from './Silhouette';
import { useLevel } from './useLevel';

type Props = {
  cameraRef: Ref<CameraView>;
  pose: Pose;
  /** 1-based, of POSES.length. */
  step: number;
  total: number;
  facing: CameraType;
  /** The last photo of this pose, faded behind the outline; null before the first. */
  ghost: string | null;
  /** The timer in seconds (0 = off) and the second the countdown is at; null when it is not running. */
  timerSeconds: number;
  counting: number | null;
  /** A photo is being taken or kept: the shutter and the library wait. */
  busy: boolean;
  failed: boolean;
  onClose: () => void;
  onSwitch: () => void;
  onTimer: (seconds: number) => void;
  onShutter: () => void;
  onCancel: () => void;
  onLibrary: () => void;
};

/**
 * The full-screen camera (K-1055, prototype yeniden-yapim §10, frames 2-4 and 6): the live picture edge to edge, always dark
 * whatever the theme, the body outline to stand in with the last photo of the pose faded behind it, a calm "straight" pill,
 * and the controls at the bottom within a thumb's reach. The level never blocks the shutter: a tilted phone gets a hint, not a lock.
 */
export function CaptureCamera(props: Props) {
  return (
    <ThemeProvider scheme="dark">
      <Viewfinder {...props} />
    </ThemeProvider>
  );
}

function Viewfinder({ cameraRef, pose, step, total, facing, ghost, timerSeconds, counting, busy, failed, onClose, onSwitch, onTimer, onShutter, onCancel, onLibrary }: Props) {
  const { color } = useTheme();
  const straight = useLevel();
  const running = counting !== null;
  // Said when the answer changes, not on every reading (useLevel changes only then); the first answer is said too.
  useEffect(() => {
    if (straight !== null) announce(t(straight ? 'capture.level.straight' : 'capture.level.upright'));
  }, [straight]);
  // The front camera's picture is mirrored like a mirror (the system's way, the saved photo is not): the faded photo is turned the same way.
  const mirrored = facing === 'front';
  const hint = straight === false ? 'tilted' : ghost === null ? pose : `${pose}Ghost`;

  // Built outside the JSX below (the raw-text guard reads what is inside JSX children).
  const closeButton = running ? <View style={styles.spacer} /> : <RoundButton icon="xmark" label={t('capture.close')} onPress={onClose} />;
  const switchButton = running ? <View style={styles.spacer} /> : <RoundButton icon="arrow.triangle.2.circlepath.camera" label={t('capture.switch')} onPress={onSwitch} />;
  const ghostImage =
    ghost === null ? null : (
      // Decorative for VoiceOver (K-807): a faint copy of the last photo to line the body up with, not a photo to read.
      <Image
        testID="capture-ghost"
        accessible={false}
        source={{ uri: ghost }}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { opacity: photoParams.ghostOpacity }, mirrored && styles.turned]}
      />
    );
  const levelPill =
    running || straight === null ? null : (
      <Scrim style={styles.pill}>
        <View style={styles.levelInner}>
          <View style={[styles.dot, { backgroundColor: straight ? color.accent : color.text, opacity: straight ? 1 : tokens.opacity.silhouette }]} />
          <Text accessibilityLiveRegion="polite" style={[styles.pillText, { color: color.text }]}>
            {t(straight ? 'capture.level.straight' : 'capture.level.upright')}
          </Text>
        </View>
      </Scrim>
    );
  const countdown =
    counting === null ? null : (
      <View style={styles.count}>
        <Text testID="capture-count" accessibilityLiveRegion="polite" accessibilityLabel={t('capture.counting', { seconds: counting })} style={[styles.number, { color: color.accent }]}>
          {counting}
        </Text>
      </View>
    );
  const hintLine = failed ? (
    <ProblemText style={[styles.hintText, { color: color.text }]}>{t('capture.failed')}</ProblemText>
  ) : (
    <Text style={[styles.hintText, { color: color.textSecondary }]}>{t(`capture.hint.${hint}`)}</Text>
  );
  const hintBox = running ? null : <Scrim style={styles.hint}>{hintLine}</Scrim>;
  const controls = running ? (
    <Button label={t('capture.cancel')} variant="secondary" onPress={onCancel} />
  ) : (
    <>
      <View style={styles.timers}>
        {photoParams.timerOptions.map((seconds) => (
          <TimerOption key={seconds} seconds={seconds} selected={seconds === timerSeconds} onPress={() => onTimer(seconds)} />
        ))}
      </View>
      <View style={styles.controls}>
        <RoundButton icon="photo.on.rectangle" label={t('capture.library')} onPress={onLibrary} disabled={busy} />
        <Shutter busy={busy} onPress={onShutter} />
        <View style={styles.spacer} />
      </View>
    </>
  );

  return (
    <View testID="capture-camera" style={[styles.fill, { backgroundColor: color.background }]}>
      {/* The picture's mirroring is the system's for the preview; the saved photo is not mirrored (mirror false), see photo-capture.tsx. */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mirror={false} />
      {ghostImage}
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.top}>
          {closeButton}
          <Scrim style={styles.pill}>
            <Text style={[styles.pillText, { color: color.text }]}>{t(`capture.pose.${pose}`, { step, total })}</Text>
          </Scrim>
          {switchButton}
        </View>
        <View style={styles.levelRow} pointerEvents="none">
          {levelPill}
        </View>
        <View style={styles.guide} pointerEvents="none">
          <Silhouette pose={pose} straight={straight === true} mirrored={mirrored} />
          {countdown}
        </View>
        {hintBox}
        <Scrim style={styles.bar}>{controls}</Scrim>
      </SafeAreaView>
    </View>
  );
}

/** One timer choice: the words on the picture, the chosen one filled; the label says what it is out of context. */
function TimerOption({ seconds, selected, onPress }: { seconds: number; selected: boolean; onPress: () => void }) {
  const { color } = useTheme();
  const words = seconds === 0 ? t('capture.timer.off') : t('capture.timer.seconds', { seconds });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={seconds === 0 ? t('capture.timer.labelOff') : t('capture.timer.label', { seconds })}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.timer, selected && { backgroundColor: color.text }]}>
      <Text style={[styles.timerText, { color: selected ? color.background : color.text }]}>{words}</Text>
    </Pressable>
  );
}

/** The round shutter (prototype `.sh`): a ring and a disc; dimmed and idle while a photo is being taken or kept. */
function Shutter({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('capture.shutter')}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.shutter, { borderColor: color.text }, busy && styles.dim]}>
      <View style={[styles.disc, { backgroundColor: color.text }]} />
    </Pressable>
  );
}

const DISC = tokens.size.shutter - 2 * (tokens.border.shutter + tokens.space.xs);

const styles = StyleSheet.create({
  fill: { flex: 1 },
  turned: { transform: [{ scaleX: -1 }] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.sm },
  spacer: { width: tokens.size.touch, height: tokens.size.touch },
  pill: { borderRadius: tokens.radius.card, overflow: 'hidden', paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm },
  pillText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  levelRow: { alignItems: 'center', minHeight: tokens.size.touch, justifyContent: 'center' },
  levelInner: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  dot: { width: tokens.size.swatch, height: tokens.size.swatch, borderRadius: tokens.size.swatch / 2 },
  guide: { flex: 1, paddingHorizontal: tokens.space.xl, paddingVertical: tokens.space.sm },
  count: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  number: { fontFamily: tokens.font.display, fontSize: tokens.type.countdown },
  hint: { marginHorizontal: tokens.space.lg, marginBottom: tokens.space.md, borderRadius: tokens.radius.card, overflow: 'hidden', paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm },
  hintText: { fontSize: tokens.type.bodySmall, textAlign: 'center' },
  bar: { paddingHorizontal: tokens.space.xl, paddingVertical: tokens.space.md, gap: tokens.space.md },
  timers: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space.xs },
  timer: { minHeight: tokens.size.touch, minWidth: tokens.size.touch, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.card, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutter: { width: tokens.size.shutter, height: tokens.size.shutter, borderRadius: tokens.size.shutter / 2, borderWidth: tokens.border.shutter, alignItems: 'center', justifyContent: 'center' },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2 },
  dim: { opacity: tokens.opacity.dim },
});
