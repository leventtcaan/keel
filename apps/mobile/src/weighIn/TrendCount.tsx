import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * "3 of 7 weigh-ins for your trend" (K-1044, T-9, prototype `.prog`): one segment for each weigh-in the trend needs, the
 * ones the server has counted filled, and the same said in words. The count and the minimum are the server's
 * (`weighInCount`, `trendMinWeighIns`); the phone only draws them. The segments are for the eye (they hold no text and are not
 * focusable), the words are the one thing a screen reader hears.
 */
export function TrendCount({ count, min }: { count: number; min: number }) {
  const { color } = useTheme();
  const filled = Math.min(count, min);
  const segments = Array.from({ length: min }, (_, i) => (
    <View
      key={i}
      testID={i < filled ? 'trend-segment-filled' : 'trend-segment-empty'}
      style={[styles.segment, i < filled ? { backgroundColor: color.accent } : { backgroundColor: color.track, borderColor: color.edge, borderWidth: tokens.border.hairline }]}
    />
  ));
  return (
    <View style={styles.box}>
      <View style={styles.segments}>
        {segments}
      </View>
      <Text style={[styles.words, { color: color.muted }]}>{t('weighIn.trendCount', { count: filled, min })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: tokens.space.sm },
  segments: { flexDirection: 'row', gap: tokens.space.xs },
  segment: { flex: 1, height: tokens.size.track, borderRadius: tokens.radius.track },
  words: { fontSize: tokens.type.bodySmall, textAlign: 'center' },
});
