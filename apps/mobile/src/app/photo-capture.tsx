import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { type PhotoCheck, POSES } from '@/photos/library';
import { photoParams } from '@/photos/params';
import { type Tilt, tiltOf } from '@/photos/tilt';
import { useAppServices } from '@/services/ServicesProvider';
import { ThemeProvider, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { localDay } from '@/today/today';

/** The viewfinder's drawing space for the frame guide (prototype 4.1): corner marks and a centre line. */
const FRAME = { width: 324, height: 430 };
const CORNERS = ['M40 60 V40 H60', 'M264 40 H284 V60', 'M40 370 V390 H60', 'M264 390 H284 V370'];
const GUIDE_WIDTH = 3;

/** The last photo of a pose, newest day first; none before the first. */
function lastOf(checks: PhotoCheck[], pose: (typeof POSES)[number]): string | null {
  for (let i = checks.length - 1; i >= 0; i -= 1) {
    const uri = checks[i].photos[pose];
    if (uri !== undefined) return uri;
  }
  return null;
}

/**
 * The guided progress photo (K-601, H1 §2.4, prototype 4.1): front, then side; each over the last photo of its pose, faded
 * (onion skin), inside a frame guide, with a level from the accelerometer — standardising the pose halves the error
 * (Wong 2021). A self-timer for a phone on a stand. Without a camera (the simulator) or with it off, a photo from the
 * library. Each photo goes to the phone's library (K-614) and nowhere else (V1); the camera is asked for only on a tap.
 */
export default function PhotoCaptureScreen() {
  const { photos, report } = useAppServices();
  const { color } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [checks, setChecks] = useState<PhotoCheck[]>([]);
  const [step, setStep] = useState(0);
  const [tilt, setTilt] = useState<Tilt | null>(null);
  const [timer, setTimer] = useState(false);
  const [counting, setCounting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pose = POSES[step];
  const reportName = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });

  useEffect(() => {
    photos.checks().then(setChecks).catch(reportName);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on arrival
  }, [photos]);

  // The level: the accelerometer while the screen is open, stopped when it closes (also if it closes before the check ends).
  useEffect(() => {
    let open = true;
    let subscription: { remove(): void } | null = null;
    void Accelerometer.isAvailableAsync().then((available) => {
      if (!open || !available) return;
      Accelerometer.setUpdateInterval(photoParams.levelUpdateMs);
      subscription = Accelerometer.addListener((gravity) => setTilt(tiltOf(gravity)));
    });
    return () => {
      open = false;
      subscription?.remove();
    };
  }, []);

  // While open: a photo that arrives after Close is not kept, and nothing goes back twice. A pending self-timer goes too.
  const open = useRef(true);
  const countdown = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      open.current = false;
      if (countdown.current !== null) clearTimeout(countdown.current);
    },
    [],
  );

  // One photo at a time, from the first tap: the camera takes seconds, and a second tap would take another (or fail).
  const inFlight = useRef(false);
  async function capture(source: () => Promise<string | null>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const uri = await source();
      if (uri === null || !open.current) return;
      await photos.add(uri, localDay(new Date()), pose);
      if (!open.current) return;
      setFailed(false);
      if (step + 1 < POSES.length) setStep(step + 1);
      else router.back();
    } catch (error) {
      reportName(error);
      if (open.current) setFailed(true);
    } finally {
      inFlight.current = false;
      if (open.current) setBusy(false);
    }
  }

  const fromCamera = async () => {
    const picture = await camera.current?.takePictureAsync({ quality: photoParams.jpegQuality, exif: false, shutterSound: false });
    return picture?.uri ?? null;
  };
  const fromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: false, base64: false, allowsEditing: false });
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  };

  function press() {
    if (inFlight.current || countdown.current !== null) return;
    if (!timer) return void capture(fromCamera);
    setCounting(true);
    countdown.current = setTimeout(() => {
      countdown.current = null;
      setCounting(false);
      void capture(fromCamera);
    }, photoParams.timerSeconds * 1000);
  }

  const ghost = lastOf(checks, pose);
  const granted = permission?.granted === true;
  // Built outside the JSX below (the raw-text guard reads JSX children).
  const viewfinder = granted ? (
    <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
  ) : null;
  const ghostImage =
    ghost === null ? null : (
      <Image testID="capture-ghost" source={{ uri: ghost }} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: photoParams.ghostOpacity }]} />
    );
  // Not known yet (the hook's first answer): neither the camera nor "off".
  const access = granted || permission === null ? null : permission.canAskAgain === false ? (
    <Text style={[styles.text, { color: color.textSecondary }]}>{t('capture.denied')}</Text>
  ) : (
    <Button label={t('capture.allow')} onPress={() => void requestPermission()} />
  );
  const shutter = granted ? (
    <View style={styles.row}>
      <Chip label={t('capture.timer', { seconds: photoParams.timerSeconds })} selected={timer} onPress={() => setTimer(!timer)} />
      <Button label={t('capture.shutter')} onPress={press} disabled={busy || counting} />
    </View>
  ) : null;
  const ghostNote = ghost === null ? null : <Text style={[styles.small, { color: color.muted }]}>{t('capture.ghost')}</Text>;
  const countingNote = counting ? <Text style={[styles.small, { color: color.muted }]}>{t('capture.counting')}</Text> : null;
  const failure = failed ? <Text style={[styles.text, { color: color.text }]}>{t('capture.failed')}</Text> : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('capture.title')}</ScreenTitle>
        <Text style={[styles.label, { color: color.text }]}>{t(`capture.pose.${pose}`, { step: step + 1, total: POSES.length })}</Text>
        {/* The viewfinder stays dark in both themes (prototype 4.1). */}
        <ThemeProvider scheme="dark">
          <Finder>
            {viewfinder}
            {ghostImage}
          </Finder>
        </ThemeProvider>
        <Level tilt={tilt} />
        <Text style={[styles.heading, { color: color.text }]}>{t('capture.guide')}</Text>
        {ghostNote}
        {access}
        {shutter}
        {countingNote}
        <Button label={t('capture.library')} variant="ghost" onPress={() => void capture(fromLibrary)} disabled={busy || counting} />
        {failure}
        <Text style={[styles.small, { color: color.muted }]}>{t('capture.onPhone')}</Text>
        <Button label={t('capture.close')} variant="ghost" size="sm" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** The dark viewfinder (both themes, prototype 4.1): what the camera sees, the last photo faded over it, the frame guide. */
function Finder({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View testID="capture-finder" style={[styles.finder, { backgroundColor: color.background }]}>
      {children}
      <Svg testID="capture-frame" style={StyleSheet.absoluteFill} viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} pointerEvents="none">
        {CORNERS.map((d) => (
          <Path key={d} d={d} fill="none" stroke={color.accent} strokeWidth={GUIDE_WIDTH} />
        ))}
        <Line x1={70} y1={FRAME.height / 2} x2={FRAME.width - 70} y2={FRAME.height / 2} stroke={color.text} strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

/** The level under the viewfinder, on the page: the page's colours, the accent when straight. */
function Level({ tilt }: { tilt: Tilt | null }) {
  const { color } = useTheme();
  if (tilt === null) return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.small, { color: tilt.level ? color.accent : color.textSecondary }]}>{t('capture.level', { degrees: tilt.degrees })}</Text>
      <Text style={[styles.small, { color: color.textSecondary }]}>{t(tilt.level ? 'capture.levelOk' : 'capture.levelOff')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
  finder: { aspectRatio: FRAME.width / FRAME.height, borderRadius: tokens.radius.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  heading: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
