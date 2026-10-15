import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ProblemText } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { type Source, discardBackground, pickBackground } from '@/share/background';
import { Preview } from '@/share/Preview';
import type { Backdrop } from '@/share/Sticker';
import { type StickerFacts, stickersFor } from '@/share/stickers';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { movesOf } from '@/train/trainData';
import { type WorkoutSummaryRead, loadWorkoutSummary } from '@/train/workoutEnd';

/** The widest the preview is drawn, in points; narrower on a narrow screen. */
const PREVIEW_MAX = 240;
/** The grounds a sticker can sit on: the user's own photo (gallery or camera), a dark one, or none (Instagram's own). */
type Ground = Source | 'dark' | 'instagram';

type Facts = StickerFacts & { partial: boolean; waiting: boolean };

/**
 * Share (K-975, ADR-076; prototype `#share`): started by the user, from the end of a workout (`?workout=`) or from
 * Progress, never offered on its own. Four stickers (Workout, PR, Streak, Progress) made on this phone from what the server
 * says; the user picks one and what it sits on (their photo from the gallery or camera, dark, or nothing for "In
 * Instagram"), it is drawn, and its PNG goes to the system share sheet (Save, TikTok, More). The photo is the user's own
 * and stays on the phone; the progress photos are not offered. The screen only reads; the app sends the image nowhere.
 * The weekly call is not a sticker (ADR-076 #1).
 */
export default function ShareScreen() {
  const services = useAppServices();
  const { api, training, shareImage, report } = services;
  const units = useUnits();
  const { color } = useTheme();
  const { width } = useWindowDimensions();
  const { workout } = useLocalSearchParams<{ workout?: string }>();
  const [facts, setFacts] = useState<Facts | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [ground, setGround] = useState<Ground>('dark');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const image = useRef<Svg>(null);
  // The picker's copy of the chosen photo, in this app's cache: removed when another ground replaces it and when the screen closes.
  const held = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([
        workout === undefined ? Promise.resolve(null) : loadWorkoutSummary(services, workout).catch((): WorkoutSummaryRead => ({ kind: 'failed', problem: 'ServerError' })),
        load(() => api.GET('/v1/consistency')),
        load(() => api.GET('/v1/training-progress')),
        training.read(api).catch(() => null),
        training.own(api).catch(() => []),
      ])
        .then(([end, consistency, progress, data, own]) =>
          setFacts({
            workout: end?.kind === 'ready' ? { summary: end.summary, programDayId: end.programDayId, program: data?.program.state === 'ready' ? data.program.value : null } : null,
            consistency: consistency.state === 'ready' ? consistency.value : null,
            progress: progress.state === 'ready' ? progress.value : null,
            moves: movesOf(data, own),
            // Said, so a sticker that is missing is not read as "nothing yet": a part the server could not give.
            partial: [consistency, progress].some((read) => read.state === 'failed') || end?.kind === 'failed',
            waiting: end?.kind === 'pending',
          }),
        )
        .catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
    }, [services, api, training, workout, report]),
  );

  const forget = useCallback(() => {
    if (held.current === null) return;
    try {
      discardBackground(held.current);
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
    }
    held.current = null;
  }, [report]);
  useEffect(() => forget, [forget]);

  const stickers = facts === null ? [] : stickersFor(facts, units);
  const sticker = stickers.find((s) => s.kind === picked) ?? stickers[0];
  const backdrop: Backdrop | undefined = ground === 'instagram' ? undefined : photo !== null ? { kind: 'photo', uri: photo } : { kind: 'dark' };

  const choose = async (source: Source) => {
    setProblem(null);
    try {
      const chosen = await pickBackground(source);
      if (chosen === 'denied') return setProblem('denied');
      if (chosen === null) return;
      forget();
      held.current = chosen.uri;
      setPhoto(chosen.uri);
      setGround(source);
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem('photo');
    }
  };
  const plain = (next: 'dark' | 'instagram') => {
    setProblem(null);
    forget();
    setPhoto(null);
    setGround(next);
  };
  const share = () => {
    if (busy || image.current === null) return;
    setBusy(true);
    setProblem(null);
    image.current.toDataURL((base64?: string) => {
      // The drawing can answer with nothing; that is a failure to say, not a share of an empty file.
      if (!base64) {
        report({ name: 'EmptyImage' });
        setProblem('share');
        setBusy(false);
        return;
      }
      shareImage(base64)
        .catch((error: unknown) => {
          report({ name: error instanceof Error ? error.name : 'Unknown' });
          setProblem('share');
        })
        .finally(() => setBusy(false));
    });
  };

  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const instagramNote = ground === 'instagram' ? <Text style={[styles.small, { color: color.muted }]}>{t('share.instagramNote')}</Text> : null;
  const choice =
    sticker === undefined ? (
      facts !== null && <Text style={[styles.text, { color: color.textSecondary }]}>{t('share.nothing')}</Text>
    ) : (
      <View style={styles.part}>
        <Preview sticker={sticker} backdrop={backdrop} width={Math.min(width - 2 * tokens.space.lg, PREVIEW_MAX)} imageRef={image} />
        <View style={styles.chips}>
          {stickers.map((s) => (
            <Chip key={s.kind} touch label={t(`share.kind.${s.kind}`)} selected={s.kind === sticker.kind} onPress={() => setPicked(s.kind)} />
          ))}
        </View>
        <View style={styles.chips}>
          <Chip touch label={t('share.background.gallery')} selected={ground === 'gallery'} onPress={() => void choose('gallery')} />
          <Chip touch label={t('share.background.camera')} selected={ground === 'camera'} onPress={() => void choose('camera')} />
          <Chip touch label={t('share.background.dark')} selected={ground === 'dark'} onPress={() => plain('dark')} />
          <Chip touch label={t('share.background.instagram')} selected={ground === 'instagram'} onPress={() => plain('instagram')} />
        </View>
        {instagramNote}
        {problem !== null && <Failed problem={problem} />}
        <Button label={t('share.share')} disabled={busy} onPress={share} />
        <Text style={[styles.small, { color: color.muted }]}>{t('share.note')}</Text>
      </View>
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('share.title')}</ScreenTitle>
        {facts?.waiting === true && <Text style={[styles.small, { color: color.muted }]}>{t('workoutEnd.pending')}</Text>}
        {facts?.partial === true && <Text style={[styles.small, { color: color.muted }]}>{t('share.partial')}</Text>}
        {choice}
      </ScrollView>
    </SafeAreaView>
  );
}

type Problem = 'share' | 'denied' | 'photo';

function Failed({ problem }: { problem: Problem }) {
  const { color } = useTheme();
  const words = { share: t('share.failed'), denied: t('share.denied'), photo: t('share.photoFailed') };
  return <ProblemText style={[styles.text, { color: color.text }]}>{words[problem]}</ProblemText>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.md, alignItems: 'stretch' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm, justifyContent: 'center' },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
