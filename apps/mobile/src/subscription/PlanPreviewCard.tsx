/**
 * The plan just shown, in brief, at the top of the paywall (prototype `.pwhero`, ADR-072 #7): the program's days and its
 * first workout. The first call is on the timeline below, once.
 */
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { PlanPreview } from './planPreview';

export function PlanPreviewCard({ preview }: { preview: PlanPreview }) {
  const { color } = useTheme();
  const line = (words: string, strong = false) => (
    <Text style={[strong ? styles.strong : styles.small, { color: strong ? color.decisionText : color.decisionMuted }]}>{words}</Text>
  );
  return (
    <View accessibilityLabel={t('subscription.preview.label')} style={[styles.card, { backgroundColor: color.decisionBackground }]}>
      <View style={styles.part}>
        {line(t('subscription.preview.program', { count: preview.days }), true)}
        {preview.firstWorkout !== null &&
          line(t('subscription.preview.firstWorkout', { day: t(`onboarding.schedule.dayName.${preview.firstWorkout}`) }))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  part: { gap: tokens.space.xs },
  strong: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  small: { fontSize: tokens.type.bodySmall },
});
