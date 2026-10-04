import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { type AccessibilityActionEvent, Image, type LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { type Anchor, comparison } from '@/photos/compare';
import { type PhotoCheck, type Pose, POSES } from '@/photos/library';
import { photoParams } from '@/photos/params';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';

/** A progress photo's shape on screen: the camera's portrait 3 : 4. */
const PHOTO_RATIO = 3 / 4;

const plural = (key: string, count: number) => t(`${key}.${count === 1 ? 'one' : 'other'}`, { count });
const anchorLabel = (anchor: Anchor) => (anchor.kind === 'day1' ? t('compare.day1') : plural('compare.earlier', anchor.weeks));
const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The comparison anchor (K-602, 01 §15, prototype 4.2): the latest photo beside a past point the user picks — Day 1 first,
 * or the photo day before — in one pose. Side by side, or as a slide: the latest over the past one, the divide dragged or
 * moved by a VoiceOver swipe. Two days with their dates, never "before" and "after". Photos from the phone only (V1).
 */
export default function CompareScreen() {
  const { photos, report } = useAppServices();
  const { color } = useTheme();
  const [checks, setChecks] = useState<PhotoCheck[] | null>(null);
  const [pose, setPose] = useState<Pose>('front');
  const [picked, setPicked] = useState<Anchor['kind']>('day1');
  const [sliding, setSliding] = useState(false);

  useEffect(() => {
    photos
      .checks()
      .then(setChecks)
      .catch((error: unknown) => {
        report({ name: error instanceof Error ? error.name : 'Unknown' });
        setChecks([]);
      });
  }, [photos, report]);

  const pair = checks === null ? null : comparison(checks, pose);
  // A pick this pose doesn't have falls back to Day 1, which every comparison has.
  const past = pair === null ? null : (pair.anchors.find((a) => a.kind === picked) ?? pair.anchors[0]);

  // Built outside the JSX below (the raw-text guard reads JSX children).
  const body =
    checks === null ? null : pair === null || past === null ? (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('compare.empty')}</Text>
    ) : (
      <>
        <Text style={[styles.small, { color: color.muted }]}>{t('compare.with')}</Text>
        <View style={styles.row}>
          {pair.anchors.map((anchor) => (
            <Chip key={anchor.kind} label={anchorLabel(anchor)} selected={anchor === past} onPress={() => setPicked(anchor.kind)} />
          ))}
        </View>
        <View style={styles.row}>
          <Chip label={t('compare.sideBySide')} selected={!sliding} onPress={() => setSliding(false)} />
          <Chip label={t('compare.slide')} selected={sliding} onPress={() => setSliding(true)} />
        </View>
        {sliding ? <Slide past={past.uri} latest={pair.latest.uri} /> : <SideBySide past={past.uri} latest={pair.latest.uri} />}
        <View style={styles.captions}>
          <Text style={[styles.small, styles.caption, { color: color.text }]}>
            {t('compare.caption', { label: anchorLabel(past), date: shortDate(past.takenOn) })}
          </Text>
          <Text style={[styles.small, styles.caption, { color: color.text }]}>
            {t('compare.caption', { label: t('compare.latest'), date: shortDate(pair.latest.takenOn) })}
          </Text>
        </View>
        <Text style={[styles.text, { color: color.textSecondary }]}>{plural('compare.between', past.weeks)}</Text>
      </>
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('compare.title')}</ScreenTitle>
        <View style={styles.row}>
          {POSES.map((each) => (
            <Chip key={each} label={t(`compare.${each}`)} selected={each === pose} onPress={() => setPose(each)} />
          ))}
        </View>
        {body}
        <Text style={[styles.small, { color: color.muted }]}>{t('compare.onPhone')}</Text>
        <Button label={t('compare.close')} variant="ghost" size="sm" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SideBySide({ past, latest }: { past: string; latest: string }) {
  return (
    <View style={styles.row}>
      <Image testID="compare-past" source={{ uri: past }} resizeMode="cover" style={styles.half} />
      <Image testID="compare-latest" source={{ uri: latest }} resizeMode="cover" style={styles.half} />
    </View>
  );
}

/** The latest photo over the past one, shown up to the divide; drag across it, or swipe up/down with VoiceOver. */
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
      style={[styles.slide, { backgroundColor: color.surface }]}>
      <Image testID="compare-past" source={{ uri: past }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <View testID="compare-divide" style={[styles.divide, { width: `${percent}%`, borderColor: color.accent }]}>
        <Image testID="compare-latest" source={{ uri: latest }} resizeMode="cover" style={[styles.full, width > 0 && { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  half: { flex: 1, aspectRatio: PHOTO_RATIO, borderRadius: tokens.radius.card },
  slide: { width: '100%', aspectRatio: PHOTO_RATIO, borderRadius: tokens.radius.card, overflow: 'hidden' },
  divide: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden', borderRightWidth: tokens.border.outline },
  full: { height: '100%' },
  captions: { flexDirection: 'row', gap: tokens.space.sm },
  caption: { flex: 1 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
