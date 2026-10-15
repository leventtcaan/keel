import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { PixelRatio, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ProblemText } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { layout } from '@/share/layout';
import { shareParams } from '@/share/params';
import { StickerImage } from '@/share/Sticker';
import { type StickerFacts, stickersFor } from '@/share/stickers';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { focusPalette, tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { movesOf } from '@/train/trainData';
import { type WorkoutSummaryRead, loadWorkoutSummary } from '@/train/workoutEnd';

/** The widest the preview is drawn, in points; narrower on a narrow screen. */
const PREVIEW_MAX = 320;

type Facts = StickerFacts & { partial: boolean; waiting: boolean };

/**
 * Share (K-975, ADR-076; prototype `#share`): started by the user, from the end of a workout (`?workout=`) or from
 * Progress, never offered on its own. Four stickers (Workout, PR, Streak, Progress) made on this phone from what the server
 * says; the user picks one, it is drawn, and its PNG goes to the system share sheet (Save, TikTok, More). The screen only
 * reads; the app sends the image nowhere. The weekly call is not a sticker (ADR-076 #1).
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
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const image = useRef<Svg>(null);

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

  const stickers = facts === null ? [] : stickersFor(facts, units);
  const sticker = stickers.find((s) => s.kind === picked) ?? stickers[0];

  const share = () => {
    if (busy || image.current === null) return;
    setBusy(true);
    setFailed(false);
    image.current.toDataURL((base64?: string) => {
      // The drawing can answer with nothing; that is a failure to say, not a share of an empty file.
      if (!base64) {
        report({ name: 'EmptyImage' });
        setFailed(true);
        setBusy(false);
        return;
      }
      shareImage(base64)
        .catch((error: unknown) => {
          report({ name: error instanceof Error ? error.name : 'Unknown' });
          setFailed(true);
        })
        .finally(() => setBusy(false));
    });
  };

  // The image is drawn at the size that comes out at the width in share.json on this screen's scale, and shown smaller.
  const full = shareParams.storyWidth / PixelRatio.get();
  const shown = Math.min(width - 2 * tokens.space.lg, PREVIEW_MAX);
  const scale = shown / full;
  const height = sticker === undefined ? 0 : (full * layout(sticker).height) / shareParams.storyWidth;

  const choice =
    sticker === undefined ? (
      facts !== null && <Text style={[styles.text, { color: color.textSecondary }]}>{t('share.nothing')}</Text>
    ) : (
      <View style={styles.part}>
        <View style={[styles.frame, { width: shown, height: height * scale, backgroundColor: focusPalette.background }]}>
          <View style={{ width: full, height, transformOrigin: 'top left', transform: [{ scale }] }}>
            <StickerImage ref={image} sticker={sticker} width={full} />
          </View>
        </View>
        <View style={styles.chips}>
          {stickers.map((s) => (
            <Chip key={s.kind} touch label={t(`share.kind.${s.kind}`)} selected={s.kind === sticker.kind} onPress={() => setPicked(s.kind)} />
          ))}
        </View>
        {failed && <Failed />}
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

function Failed() {
  const { color } = useTheme();
  return <ProblemText style={[styles.text, { color: color.text }]}>{t('share.failed')}</ProblemText>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.md, alignItems: 'stretch' },
  frame: { alignSelf: 'center', overflow: 'hidden', borderRadius: tokens.radius.card },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm, justifyContent: 'center' },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
