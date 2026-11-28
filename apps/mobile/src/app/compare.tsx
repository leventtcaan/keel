import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { type AccessibilityActionEvent, Image, type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { SandLock } from '@/components/SandLock';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { type Anchor, type Shot, comparison, picked as pickedPair, shotsOf } from '@/photos/compare';
import { type PhotoCheck, type Pose, POSES } from '@/photos/library';
import { photoParams } from '@/photos/params';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';

/** A progress photo's shape on screen: the camera's portrait 3 : 4. */
const PHOTO_RATIO = 3 / 4;

const plural = (key: string, count: number) => t(`${key}.${count === 1 ? 'one' : 'other'}`, { count });
/** A gap in weeks, or in days under a week (`key.days`). */
const gap = (key: string, anchor: Anchor) => (anchor.weeks === null ? plural(`${key}.days`, anchor.days) : plural(key, anchor.weeks));
const anchorLabel = (anchor: Anchor) => (anchor.kind === 'day1' ? t('compare.day1') : gap('compare.earlier', anchor));
const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The comparison anchor (K-602, 01 §15, prototype 4.2): the latest photo beside a past point the user picks — Day 1 first,
 * or the photo day before — in one pose. Side by side, or as a slide: the latest over the past one, the divide dragged or
 * moved by a VoiceOver swipe. Two days with their dates, never "before" and "after". Photos from the phone only (V1).
 *
 * Under it every photo day of the pose, each shown large on a tap: the user's own photos, free (K-1261, ADR-096). Any two days
 * side by side and the timeline come with a subscription, read only when asked for (the server is told nothing of the photos):
 * without one the sand lock, unread no lock.
 */
export default function CompareScreen() {
  const { photos, report, paidAccess } = useAppServices();
  const { color } = useTheme();
  const [checks, setChecks] = useState<PhotoCheck[] | null>(null);
  const [pose, setPose] = useState<Pose>('front');
  const [picked, setPicked] = useState<Anchor['kind']>('day1');
  const [sliding, setSliding] = useState(false);
  // The paid parts: the subscription once asked (null: not yet), what was asked for, the days picked, the timeline's frame.
  const [access, setAccess] = useState<Awaited<ReturnType<typeof paidAccess>> | 'checking' | null>(null);
  const [asked, setAsked] = useState(false);
  const [picking, setPicking] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const [viewing, setViewing] = useState<string | null>(null);
  const [frame, setFrame] = useState<number | null>(null);

  useEffect(() => {
    photos
      .checks()
      .then(setChecks)
      .catch((error: unknown) => {
        report({ name: error instanceof Error ? error.name : 'Unknown' });
        setChecks([]);
      });
  }, [photos, report]);

  const shots: Shot[] = checks === null ? [] : shotsOf(checks, pose);
  // The timeline: one photo day after another, oldest first, held on the last.
  useEffect(() => {
    if (frame === null || frame >= shots.length - 1) return;
    const next = setTimeout(() => setFrame(frame + 1), photoParams.timelineFrameMs);
    return () => clearTimeout(next);
  }, [frame, shots.length]);

  const choosePose = (each: Pose) => {
    setPose(each);
    setDays([]);
    setViewing(null);
    setFrame(null);
  };
  /**
   * A paid part asked for: the subscription read (again unless open: back from the paywall with one, the part opens), then the part
   * opened, or the lock (or the unread line) shown. A tap while a read is on its way waits for that read.
   */
  const reading = useRef<ReturnType<typeof paidAccess> | null>(null);
  const ask = async (open: () => void) => {
    setAsked(true);
    let now = access;
    if (now !== 'open') {
      setAccess('checking');
      reading.current ??= paidAccess().finally(() => (reading.current = null));
      now = await reading.current;
      setAccess(now);
    }
    if (now === 'open') open();
  };
  const pickTwo = () =>
    ask(() => {
      setPicking(true);
      setDays([]);
      setFrame(null);
    });
  const play = () =>
    ask(() => {
      setPicking(false);
      setViewing(null);
      setFrame(0);
    });
  // Stopped, the timeline stays on the day it reached.
  const stop = () => {
    if (frame !== null) setViewing(shots[frame]?.takenOn ?? null);
    setFrame(null);
  };
  const tapDay = (day: string) => {
    if (picking) setDays((was) => (was.includes(day) ? was.filter((d) => d !== day) : [...was, day].slice(-2)));
    else {
      setFrame(null);
      setViewing(day);
    }
  };

  const base = checks === null ? null : comparison(checks, pose);
  const chosen = checks === null || !picking ? null : pickedPair(checks, pose, days);
  const pair = chosen ?? base;
  // A pick this pose doesn't have falls back to Day 1, which every comparison has.
  const past = pair === null ? null : chosen !== null ? chosen.anchors[0] : (pair.anchors.find((a) => a.kind === picked) ?? pair.anchors[0]);
  const shown = frame !== null ? shots[frame] : shots.find((shot) => shot.takenOn === viewing);

  // The captions, shown under the photos and given to them as their names (K-807).
  const pastCaption = past === null ? '' : t('compare.caption', { label: anchorLabel(past), date: shortDate(past.takenOn) });
  const latestCaption =
    pair === null ? '' : t('compare.caption', { label: t(chosen === null ? 'compare.latest' : 'compare.later'), date: shortDate(pair.latest.takenOn) });
  // Built outside the JSX below (the raw-text guard reads JSX children).
  const body =
    checks === null ? null : pair === null || past === null ? (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('compare.empty')}</Text>
    ) : (
      <>
        <Text style={[styles.small, { color: color.muted }]}>{t('compare.with')}</Text>
        <View style={styles.row}>
          {(base?.anchors ?? []).map((anchor) => (
            <Chip
              key={anchor.kind}
              label={anchorLabel(anchor)}
              selected={chosen === null && anchor.kind === past.kind}
              onPress={() => {
                setPicking(false);
                setPicked(anchor.kind);
              }}
            />
          ))}
        </View>
        <View style={styles.row}>
          <Chip label={t('compare.sideBySide')} selected={!sliding} onPress={() => setSliding(false)} />
          <Chip label={t('compare.slide')} selected={sliding} onPress={() => setSliding(true)} />
        </View>
        {sliding ? (
          <Slide past={past.uri} latest={pair.latest.uri} />
        ) : (
          <SideBySide past={{ uri: past.uri, caption: pastCaption }} latest={{ uri: pair.latest.uri, caption: latestCaption }} />
        )}
        <View style={styles.captions}>
          <Text style={[styles.small, styles.caption, { color: color.text }]}>{pastCaption}</Text>
          <Text style={[styles.small, styles.caption, { color: color.text }]}>{latestCaption}</Text>
        </View>
        <Text style={[styles.text, { color: color.textSecondary }]}>{gap('compare.between', past)}</Text>
      </>
    );

  // Every day of the pose, and the paid parts under it (K-1261). Built outside the JSX below (the raw-text guard reads JSX children).
  const accessLine = !asked ? null : access === 'locked' ? (
    <SandLock testID="compare-lock" line={t('compare.locked')} />
  ) : access === 'unread' ? (
    <Text style={[styles.text, { color: color.textSecondary }]}>{t('compare.unread')}</Text>
  ) : access === 'checking' ? (
    <Text style={[styles.small, { color: color.muted }]}>{t('compare.checking')}</Text>
  ) : picking ? (
    <Text style={[styles.small, { color: color.muted }]}>{t('compare.pickHint')}</Text>
  ) : null;
  const one =
    shown === undefined ? null : (
      <View style={styles.one}>
        <Image testID="compare-one" accessible accessibilityRole="image" accessibilityLabel={t('compare.dayPhoto', { date: shortDate(shown.takenOn) })}
          source={{ uri: shown.uri }} resizeMode="cover" style={styles.full} />
        <Text style={[styles.small, { color: color.text }]}>{shortDate(shown.takenOn)}</Text>
      </View>
    );
  // Running until the last day, then Play again (from the first).
  const playing = frame === null || frame >= shots.length - 1 ? (
    <Button label={t('compare.play')} variant="secondary" size="sm" onPress={() => void play()} />
  ) : (
    <Button label={t('compare.stop')} variant="secondary" size="sm" onPress={stop} />
  );
  const paid =
    shots.length < 2 ? null : (
      <View style={styles.row}>
        <Button label={t('compare.pickTwo')} variant="secondary" size="sm" onPress={() => void pickTwo()} />
        {playing}
      </View>
    );
  const more =
    shots.length === 0 ? null : (
      <>
        <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>{t('compare.days')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {shots.map((shot) => {
            const on = picking ? days.includes(shot.takenOn) : shown?.takenOn === shot.takenOn;
            return (
              <Pressable
                key={shot.takenOn}
                accessibilityRole="button"
                accessibilityLabel={t('compare.dayPhoto', { date: shortDate(shot.takenOn) })}
                accessibilityState={{ selected: on }}
                onPress={() => tapDay(shot.takenOn)}
                style={styles.day}>
                <Image accessible={false} source={{ uri: shot.uri }} resizeMode="cover"
                  style={[styles.thumb, { borderColor: on ? color.accent : color.background }]} />
                <Text style={[styles.small, { color: on ? color.accent : color.muted }]}>{shortDate(shot.takenOn)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {one}
        {paid}
        {accessLine}
      </>
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('compare.title')}</ScreenTitle>
        <View style={styles.row}>
          {POSES.map((each) => (
            <Chip key={each} label={t(`compare.${each}`)} selected={each === pose} onPress={() => choosePose(each)} />
          ))}
        </View>
        {body}
        {more}
        <Text style={[styles.small, { color: color.muted }]}>{t('compare.onPhone')}</Text>
        <Button label={t('compare.close')} variant="ghost" size="sm" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

type Shown = { uri: string; caption: string };

/** Each photo named by its caption for VoiceOver (K-807): which one, and the day it was taken. */
function SideBySide({ past, latest }: { past: Shown; latest: Shown }) {
  // Its own row, not the chips' wrapping one: two halves that wrap have no width to share, and the photos were not drawn.
  return (
    <View style={styles.pair}>
      <Image testID="compare-past" accessible accessibilityRole="image" accessibilityLabel={past.caption} source={{ uri: past.uri }}
        resizeMode="cover" style={styles.half} />
      <Image testID="compare-latest" accessible accessibilityRole="image" accessibilityLabel={latest.caption} source={{ uri: latest.uri }}
        resizeMode="cover" style={styles.half} />
    </View>
  );
}

/** The past photo over the latest, shown up to the divide (left to right, as the captions); drag, or swipe with VoiceOver. */
function Slide({ past, latest }: { past: string; latest: string }) {
  const { color } = useTheme();
  const [width, setWidth] = useState(0);
  const [split, setSplit] = useState(0.5);
  const percent = Math.round(split * 100);
  const follow = (x: number) => width > 0 && setSplit(clamp(x / width));
  const swipe = (event: AccessibilityActionEvent) => {
    const step = event.nativeEvent.actionName === 'increment' ? photoParams.compareSlideStep : -photoParams.compareSlideStep;
    setSplit((now) => clamp(Math.round((now + step) * 100) / 100));
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('compare.slider')}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={swipe}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => follow(event.nativeEvent.locationX)}
      onResponderMove={(event) => follow(event.nativeEvent.locationX)}
      // Inside a scrolling page: a drag that wanders diagonally keeps the divide.
      onResponderTerminationRequest={() => false}
      style={[styles.slide, { backgroundColor: color.surface }]}>
      <Image testID="compare-latest" source={{ uri: latest }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      {/* The past photo on the left, as side by side and as the captions read: shown up to the divide, at full width. */}
      <View testID="compare-divide" style={[styles.divide, { width: `${percent}%`, borderColor: color.accent }]}>
        <Image testID="compare-past" source={{ uri: past }} resizeMode="cover" style={[styles.full, width > 0 && { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  pair: { flexDirection: 'row', gap: tokens.space.sm },
  half: { flex: 1, aspectRatio: PHOTO_RATIO, borderRadius: tokens.radius.card },
  slide: { width: '100%', aspectRatio: PHOTO_RATIO, borderRadius: tokens.radius.card, overflow: 'hidden' },
  divide: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden', borderRightWidth: tokens.border.outline },
  full: { height: '100%' },
  captions: { flexDirection: 'row', gap: tokens.space.sm },
  caption: { flex: 1 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  heading: { ...tokens.face.display, fontSize: tokens.type.body },
  strip: { gap: tokens.space.sm },
  day: { alignItems: 'center', gap: tokens.space.xs },
  thumb: { width: tokens.size.photoThumb, aspectRatio: PHOTO_RATIO, borderRadius: tokens.radius.card, borderWidth: tokens.border.underline },
  one: { width: '100%', aspectRatio: PHOTO_RATIO, gap: tokens.space.xs },
});
