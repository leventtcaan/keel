import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/Button';
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

/** The widest a card is shown, in points; narrower on a narrow screen, so the next card peeks in at the side. */
const PREVIEW_MAX = 260;
/** How much of the cards beside the one shown is seen, each side, in points: enough to say there are more. */
const PEEK = 28;

type Facts = StickerFacts & { partial: boolean; waiting: boolean };

/**
 * Share (K-975, ADR-076; ADR-094 Ek 2 › Uygulama #10, Levent 26 Nov): started by the user, from the end of a workout
 * (`?workout=`) or from Progress, never offered on its own. The cards (Workout, PR, Weeks on track, Progress) are made on this
 * phone from what the server says and swiped through one at a time, as a row of pictures; the user may add a photo of
 * their own behind them (the gallery or the camera; else a dark ground). The card shown, captured as a PNG on the phone
 * (react-native-view-shot), goes to the system share sheet, where Instagram's Story is with the rest: one Share, no
 * separate Story or "In Instagram" way. The photo is the user's own and stays on the phone; the progress photos are not
 * offered. The screen only reads; the app sends the image nowhere. The weekly call is not a card (ADR-076 #1).
 */
export default function ShareScreen() {
  const services = useAppServices();
  const { api, training, shareImage, report } = services;
  const units = useUnits();
  const { color } = useTheme();
  const { width } = useWindowDimensions();
  const { workout } = useLocalSearchParams<{ workout?: string }>();
  const [facts, setFacts] = useState<Facts | null>(null);
  const [index, setIndex] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const image = useRef<View>(null);
  const row = useRef<ScrollView>(null);
  // The picker's copy of the chosen photo, in this app's cache: removed when it is taken away or replaced and when the screen closes.
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
            workout:
              end?.kind === 'ready'
                ? { summary: end.summary, programDayId: end.programDayId, endedAt: end.endedAt, program: data?.program.state === 'ready' ? data.program.value : null }
                : null,
            consistency: consistency.state === 'ready' ? consistency.value : null,
            progress: progress.state === 'ready' ? progress.value : null,
            moves: movesOf(data, own),
            // Said, so a card that is missing is not read as "nothing yet": a part the server could not give.
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
  const shown = Math.min(index, Math.max(stickers.length - 1, 0));
  const sticker = stickers[shown];
  const backdrop: Backdrop = photo !== null ? { kind: 'photo', uri: photo } : { kind: 'dark' };
  const preview = Math.min(width - 2 * PEEK - 2 * tokens.space.md, PREVIEW_MAX);
  const step = preview + tokens.space.md;

  /** Shows card `to` (a swipe that came to rest, or VoiceOver's up and down); never past either end. */
  const go = (to: number, scroll: boolean) => {
    const next = Math.max(0, Math.min(stickers.length - 1, to));
    setIndex(next);
    if (scroll) row.current?.scrollTo({ x: next * step, animated: false });
  };
  const rested = (event: NativeSyntheticEvent<NativeScrollEvent>) => go(Math.round(event.nativeEvent.contentOffset.x / step), false);

  const choose = async (source: Source) => {
    setProblem(null);
    try {
      const chosen = await pickBackground(source);
      if (chosen === 'denied') return setProblem(chosen);
      if (chosen === null) return;
      forget();
      held.current = chosen.uri;
      setPhoto(chosen.uri);
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem('photo');
    }
  };
  /** Where the photo comes from, asked in the system's sheet: the gallery, the camera, or neither. */
  const addPhoto = () => {
    const options = [t('share.background.gallery'), t('share.background.camera'), t('share.photo.cancel')];
    ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, (picked) => {
      if (picked === 0) void choose('gallery');
      if (picked === 1) void choose('camera');
    });
  };
  const removePhoto = () => {
    setProblem(null);
    forget();
    setPhoto(null);
  };
  /** The card shown as a PNG in base64; null when it is not there or came out empty. One hand-over at a time; a failure is said by name only. */
  const share = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const base64 = image.current === null ? '' : await captureRef(image, { format: 'png', result: 'base64' });
      if (base64 === '') throw Object.assign(new Error('empty'), { name: 'EmptyImage' });
      await shareImage(base64);
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem('share');
    } finally {
      setBusy(false);
    }
  };

  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const page = sticker === undefined ? '' : t('share.page', { kind: t(`share.kind.${sticker.kind}`), n: shown + 1, count: stickers.length });
  const actions = [{ name: 'increment' }, { name: 'decrement' }];
  const dots = stickers.map((s, i) => <View key={s.kind} testID={i === shown ? 'dot-on' : 'dot-off'} style={[styles.dot, { backgroundColor: i === shown ? color.text : color.edge }]} />);
  const photoButton =
    photo === null ? (
      <Button label={t('share.photo.add')} variant="ghost" disabled={busy} onPress={addPhoto} />
    ) : (
      <Button label={t('share.photo.remove')} variant="ghost" disabled={busy} onPress={removePhoto} />
    );
  const choice =
    sticker === undefined ? (
      facts !== null && <Text style={[styles.text, { color: color.textSecondary }]}>{t('share.nothing')}</Text>
    ) : (
      <View style={styles.part}>
        <ScrollView
          ref={row}
          testID="cards-row"
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          onMomentumScrollEnd={rested}
          style={styles.row}
          contentContainerStyle={{ paddingHorizontal: (width - preview) / 2, gap: tokens.space.md }}>
          {stickers.map((s, i) => (
            <Preview key={s.kind} sticker={s} backdrop={backdrop} width={preview} imageRef={i === shown ? image : undefined} />
          ))}
        </ScrollView>
        <View
          style={styles.dots}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('share.cards')}
          accessibilityValue={{ text: page }}
          accessibilityActions={actions}
          onAccessibilityAction={(event) => go(shown + (event.nativeEvent.actionName === 'increment' ? 1 : -1), true)}>
          {dots}
        </View>
        {photoButton}
        {problem !== null && <Failed problem={problem} />}
        <Button label={busy ? t('share.preparing') : t('share.share')} disabled={busy} busy={busy} onPress={() => void share()} />
        <Text style={[styles.small, { color: color.muted }]}>{t('share.note')}</Text>
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
  // The row runs the screen's full width: the cards beside the one shown peek in at its edges.
  row: { marginHorizontal: -tokens.space.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.xs },
  dot: { width: tokens.size.pageDot, height: tokens.size.pageDot, borderRadius: tokens.size.pageDot / 2 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
