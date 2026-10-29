import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';

import { CaptureCamera } from '@/photos/CaptureCamera';
import { CaptureDone } from '@/photos/CaptureDone';
import { CaptureIntro, type Setup } from '@/photos/CaptureIntro';
import { CaptureNoCamera } from '@/photos/CaptureNoCamera';
import { CapturePreview } from '@/photos/CapturePreview';
import { type PhotoCheck, type Pose, POSES } from '@/photos/library';
import { photoParams } from '@/photos/params';
import { summarise } from '@/photos/result';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { localDay } from '@/today/today';

/** The last photo of a pose, newest day first; none before the first. */
function lastOf(checks: PhotoCheck[], pose: Pose): string | null {
  for (let i = checks.length - 1; i >= 0; i -= 1) {
    const uri = checks[i].photos[pose];
    if (uri !== undefined) return uri;
  }
  return null;
}

/** A photo taken or chosen and not yet kept: where it is, and the day it was taken (the same day names both poses' files). */
type Shot = { uri: string; day: string };

/**
 * The guided progress photo (K-601, K-1055, H1 §2.4, prototype yeniden-yapim §10): an intro on the first set, then a
 * full-screen camera for the front and the side — each over the last photo of its pose, faded, inside a body outline, with a
 * calm level (standardising the pose halves the error, Wong 2021) — a preview after every photo (Retake / Use photo), and a
 * result. A self-timer for a phone on a stand. Without a camera (the simulator, or it is off) a photo comes from the library
 * and goes through the same preview. A photo is kept only by Use photo, in the phone's photos folder (K-614) and nowhere else
 * (V1); the camera is asked for only on a tap.
 *
 * Close at any point keeps nothing more. A photo already kept with Use photo stays: it is a photo the person chose, the front
 * of a set that was never finished is still a front photo, and the next try retakes the pose (same file name, replaced).
 *
 * Mirroring: the front camera's live picture is mirrored (the system's preview, as a mirror), the photo we save is not
 * (CameraView `mirror` false, the default, said out loud): every progress photo is then as others would see the person,
 * front camera, back camera or library alike, so sets taken a different way still compare. The faded photo is turned over
 * with the front camera, to match the mirrored picture it is lined up with.
 */
export default function PhotoCaptureScreen() {
  const { photos, report } = useAppServices();
  const { color } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  // null until read: the intro is for the first set only, so it waits for the answer.
  const [checks, setChecks] = useState<PhotoCheck[] | null>(null);
  const [started, setStarted] = useState(false);
  const [setup, setSetup] = useState<Setup>('stand');
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [timerSeconds, setTimerSeconds] = useState(photoParams.timerSeconds);
  const [counting, setCounting] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [shot, setShot] = useState<Shot | null>(null);
  const [saved, setSaved] = useState<{ day: string; photos: Partial<Record<Pose, string>> } | null>(null);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pose = POSES[step];
  const reportName = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });

  useEffect(() => {
    photos
      .checks()
      .then(setChecks)
      .catch((error: unknown) => {
        reportName(error);
        setChecks([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on arrival
  }, [photos]);

  // While open: a photo that arrives after Close is not kept, and nothing goes back twice. A running countdown goes too.
  const open = useRef(true);
  const tick = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      open.current = false;
      if (tick.current !== null) clearTimeout(tick.current);
    },
    [],
  );

  // One thing at a time, from the first tap: the camera takes seconds, keeping a photo takes a moment, and a second tap would
  // take another (or fail).
  const inFlight = useRef(false);
  async function work(job: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await job();
    } catch (error) {
      reportName(error);
      if (open.current) setFailed(true);
    } finally {
      inFlight.current = false;
      if (open.current) setBusy(false);
    }
  }

  /** A picture from `source` to the preview; nothing is kept yet. */
  const capture = (source: () => Promise<string | null>) =>
    work(async () => {
      const uri = await source();
      if (uri === null || !open.current) return;
      setFailed(false);
      setShot({ uri, day: localDay(new Date()) });
    });

  const fromCamera = async () => {
    const picture = await camera.current?.takePictureAsync({ quality: photoParams.jpegQuality, exif: false, shutterSound: false });
    return picture?.uri ?? null;
  };
  const fromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: false, base64: false, allowsEditing: false });
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  };

  /** Use photo: the one place a photo is kept. A failure stays on the preview, to try again or retake. */
  const keep = () =>
    work(async () => {
      if (shot === null) return;
      const photo = await photos.add(shot.uri, shot.day, pose);
      if (!open.current) return;
      setFailed(false);
      const uri = photo.uri;
      setSaved((before) => ({ day: shot.day, photos: { ...before?.photos, [pose]: uri } }));
      setShot(null);
      if (step + 1 < POSES.length) setStep(step + 1);
      else setFinished(true);
    });

  function press() {
    if (inFlight.current || tick.current !== null) return;
    if (timerSeconds === 0) return void capture(fromCamera);
    // The timer counts down a second at a time, shown as it goes, and takes the photo as it reaches the end.
    let left = timerSeconds;
    setCounting(left);
    const next = () => {
      tick.current = setTimeout(() => {
        left -= 1;
        if (left > 0) {
          setCounting(left);
          next();
        } else {
          tick.current = null;
          setCounting(null);
          void capture(fromCamera);
        }
      }, 1000);
    };
    next();
  }
  function cancel() {
    if (tick.current !== null) clearTimeout(tick.current);
    tick.current = null;
    setCounting(null);
  }

  function start() {
    // On a stand: the front camera, so the person sees themselves, and the stand's timer. In someone's hands: the back camera, no timer.
    setFacing(setup === 'stand' ? 'front' : 'back');
    setTimerSeconds(setup === 'stand' ? photoParams.timerSeconds : photoParams.timerHandSeconds);
    setStarted(true);
  }

  const blank = <View style={{ flex: 1, backgroundColor: color.background }} />;
  if (checks === null) return blank;
  if (checks.length === 0 && !started) {
    return <CaptureIntro setup={setup} onSetup={setSetup} onStart={start} onClose={() => router.back()} />;
  }
  if (finished && saved !== null) {
    return (
      <CaptureDone
        saved={saved.photos}
        summary={summarise(checks, saved.photos, saved.day)}
        onCompare={() => router.replace('/compare')}
        onDone={() => router.back()}
      />
    );
  }
  if (shot !== null) {
    return (
      <CapturePreview
        uri={shot.uri}
        pose={pose}
        step={step + 1}
        total={POSES.length}
        busy={busy}
        failed={failed}
        onRetake={() => {
          setShot(null);
          setFailed(false);
        }}
        onUse={() => void keep()}
      />
    );
  }
  if (permission === null) return blank;
  if (!permission.granted) {
    return (
      <CaptureNoCamera
        state={permission.canAskAgain === false ? 'off' : 'ask'}
        busy={busy}
        failed={failed}
        onAllow={() => void requestPermission()}
        onSettings={() => void Linking.openSettings()}
        onLibrary={() => void capture(fromLibrary)}
        onClose={() => router.back()}
      />
    );
  }
  return (
    <CaptureCamera
      cameraRef={camera}
      pose={pose}
      step={step + 1}
      total={POSES.length}
      facing={facing}
      ghost={lastOf(checks, pose)}
      timerSeconds={timerSeconds}
      counting={counting}
      busy={busy}
      failed={failed}
      onClose={() => router.back()}
      onSwitch={() => setFacing(facing === 'front' ? 'back' : 'front')}
      onTimer={setTimerSeconds}
      onShutter={press}
      onCancel={cancel}
      onLibrary={() => void capture(fromLibrary)}
    />
  );
}
