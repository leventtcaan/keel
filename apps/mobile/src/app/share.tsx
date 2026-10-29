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
import { Preview, drawnWidth } from '@/share/Preview';
import { shareParams } from '@/share/params';
import { type Backdrop, StickerImage } from '@/share/Sticker';
import type { StoryBackground } from '@/share/story';
import { type StickerFacts, stickersFor } from '@/share/stickers';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';
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
  const { api, training, shareImage, shareStory, report } = services;
  const units = useUnits();
  const { color } = useTheme();
  const { width } = useWindowDimensions();
  const { workout } = useLocalSearchParams<{ workout?: string }>();
  const [facts, setFacts] = useState<Facts | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [ground, setGround] = useState<Ground>('dark');
  const [photo, setPhoto] = useState<string | null>(null);
  const [video, setVideo] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const [busy, setBusy] = useState(false);
  // Which button was pressed, so that one says it is working (the other only waits).
  const [working, setWorking] = useState<'story' | 'sheet' | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const image = useRef<Svg>(null);
  // The sticker alone, drawn out of sight: what a Story takes as the sticker, whatever the preview sits on.
  const bare = useRef<Svg>(null);
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
  // A video is only for Stories (Instagram puts it behind the sticker): everywhere else the sticker goes alone.
  const backdrop: Backdrop | undefined = ground === 'instagram' || video ? undefined : photo !== null ? { kind: 'photo', uri: photo } : { kind: 'dark' };
  // What a Story gets behind the sticker: the user's own file, else a dark colour (left to be changed in Instagram).
  const behind: StoryBackground = photo !== null ? { kind: video ? 'video' : 'image', uri: photo } : { kind: 'color', hex: palettes.dark.background };

  const choose = async (source: Source) => {
    setProblem(null);
    try {
      const chosen = await pickBackground(source);
      if (chosen === 'denied' || chosen === 'tooLong') return setProblem(chosen);
      if (chosen === null) return;
      forget();
      held.current = chosen.uri;
      setPhoto(chosen.uri);
      setVideo(chosen.video === true);
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
    setVideo(false);
    setGround(next);
  };
  /** A drawing's PNG in base64; null when it is not there or could not be made (the drawing can answer with nothing). */
  const png = (drawing: typeof image) =>
    new Promise<string | null>((resolve) => (drawing.current === null ? resolve(null) : drawing.current.toDataURL((base64?: string) => resolve(base64 ? base64 : null))));
  /** One hand-over at a time; a failure is said by name only, an empty drawing too. */
  const hand = async (from: 'story' | 'sheet', job: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setWorking(from);
    setProblem(null);
    setFellBack(false);
    try {
      await job();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem('share');
    } finally {
      setBusy(false);
      setWorking(null);
    }
  };
  const sheet = async () => {
    const base64 = await png(image);
    if (base64 === null) throw Object.assign(new Error('empty'), { name: 'EmptyImage' });
    await shareImage(base64);
  };
  const share = () => void hand('sheet', sheet);
  const toStory = () =>
    void hand('story', async () => {
      const alone = await png(bare);
      if (alone === null) throw Object.assign(new Error('empty'), { name: 'EmptyImage' });
      // Without the App ID or Instagram the share sheet takes over, with the image as previewed.
      if ((await shareStory({ sticker: alone, background: behind })) === 'unavailable') {
        setFellBack(true);
        await sheet();
      }
    });

  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const instagramNote = ground === 'instagram' ? <Text style={[styles.small, { color: color.muted }]}>{t('share.instagramNote')}</Text> : null;
  const videoNote = video ? <Text style={[styles.small, { color: color.muted }]}>{t('share.videoNote')}</Text> : null;
  const fallbackNote = fellBack ? <Text style={[styles.small, { color: color.muted }]}>{t('share.storyFallback')}</Text> : null;
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
        {videoNote}
        {problem !== null && <Failed problem={problem} />}
        {fallbackNote}
        <Button label={working === 'story' ? t('share.preparing') : t('share.story')} disabled={busy} busy={working === 'story'} onPress={toStory} />
        <Button label={working === 'sheet' ? t('share.preparing') : t('share.share')} variant="ghost" disabled={busy} busy={working === 'sheet'} onPress={share} />
        <Text style={[styles.small, { color: color.muted }]}>{t('share.note')}</Text>
        <View style={styles.hidden} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <StickerImage ref={bare} testID="bare" sticker={sticker} width={drawnWidth()} />
        </View>
      </View>
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('share.title')}</ScreenTitle>
        {facts?.waiting === true && <Text style={[styles.small, { color: color.muted }]}>{t('workoutEnd.pending')}</Text>}
        {facts?.partial === true && <Text style={[styles.small, { color: color.muted }]}>{t('share.partial')}</Text>}
        {choice}
      </ScrollView>
    </SafeAreaView>
  );
}

type Problem = 'share' | 'denied' | 'photo' | 'tooLong';

function Failed({ problem }: { problem: Problem }) {
  const { color } = useTheme();
  const words = {
    share: t('share.failed'),
    denied: t('share.denied'),
    photo: t('share.photoFailed'),
    tooLong: t('share.videoTooLong', { seconds: shareParams.storyVideoSeconds }),
  };
  return <ProblemText style={[styles.text, { color: color.text }]}>{words[problem]}</ProblemText>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.md, alignItems: 'stretch' },
  hidden: { height: 0, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm, justifyContent: 'center' },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
