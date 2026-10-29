import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { ThemeProvider, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';

import { type Pose, POSES } from './library';
import type { SetSummary } from './result';
import { Scrim } from './CameraChrome';

/** A phone photo's shape (3 by 4), for the thumbnails. */
const THUMB_RATIO = 3 / 4;

type Props = {
  /** The two photos just kept, by pose, as the photos folder now holds them. */
  saved: Partial<Record<Pose, string>>;
  summary: SetSummary;
  onCompare: () => void;
  onDone: () => void;
};

/**
 * Where the flow ends (K-1055, prototype §10 frame 7): the two photos just kept, when the next set is due, and what Compare
 * will do — open at once when an earlier set is there, or with the second set. The photos never left the phone, and it says so.
 */
export function CaptureDone({ saved, summary, onCompare, onDone }: Props) {
  const { color } = useTheme();
  // Built outside the JSX below (the raw-text guard reads what is inside JSX children).
  const thumbs = POSES.map((pose) => {
    const uri = saved[pose];
    const photo =
      uri === undefined ? null : (
        <Image
          testID={`capture-saved-${pose}`}
          accessibilityLabel={t('capture.done.photo', { pose: t(`capture.done.${pose}`) })}
          source={{ uri }}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { backgroundColor: color.surface }]}
        />
      );
    return (
      <View key={pose} style={styles.thumb}>
        {photo}
        <Tag pose={pose} />
      </View>
    );
  });
  const compare = summary.canCompare ? <Button label={t('capture.done.compare')} variant="secondary" onPress={onCompare} /> : null;
  const compareLater = summary.canCompare ? null : <Text style={[styles.small, { color: color.textSecondary }]}>{t('capture.done.compareLater')}</Text>;
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('capture.done.title', { week: summary.week })}</ScreenTitle>
        <View style={styles.thumbs}>{thumbs}</View>
        <Card>
          <Text style={[styles.small, styles.strong, { color: color.muted }]}>{t('capture.done.next')}</Text>
          <Text style={[styles.next, { color: color.text }]}>{t('capture.done.nextOn', { week: summary.nextWeek, date: shortDate(summary.nextOn) })}</Text>
          {compareLater}
        </Card>
        {compare}
        <Text style={[styles.small, { color: color.muted }]}>{t('capture.done.onPhone')}</Text>
      </ScrollView>
      <View style={styles.buttons}>
        <Button label={t('capture.done.done')} onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}

/** The pose's name on its thumbnail: dark ground, light words, whatever the theme (it sits on a photo). */
function Tag({ pose }: { pose: Pose }) {
  return (
    <ThemeProvider scheme="dark">
      <TagText pose={pose} />
    </ThemeProvider>
  );
}

function TagText({ pose }: { pose: Pose }) {
  const { color } = useTheme();
  return (
    <Scrim style={styles.tag}>
      <Text style={[styles.tagText, { color: color.text }]}>{t(`capture.done.${pose}`)}</Text>
    </Scrim>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.xl, gap: tokens.space.md },
  thumbs: { flexDirection: 'row', gap: tokens.space.md },
  thumb: { flex: 1, aspectRatio: THUMB_RATIO, borderRadius: tokens.radius.card, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'flex-start' },
  tag: { margin: tokens.space.sm, borderRadius: tokens.radius.card, overflow: 'hidden', paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs },
  tagText: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  next: { fontFamily: tokens.font.display, fontSize: tokens.type.number },
  small: { fontSize: tokens.type.bodySmall },
  strong: { fontWeight: tokens.weight.bold },
  buttons: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md },
});
