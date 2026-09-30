import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Share done, 0…1. Values outside are clamped; a missing value (NaN) shows as empty. */
  value: number;
  /** Already translated; what VoiceOver announces with the percentage. */
  label: string;
};

function percent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

export function ProgressBar({ value, label }: Props) {
  const { color } = useTheme();
  const now = percent(value);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now }}
      style={[styles.track, { backgroundColor: color.track }]}>
      <View testID="progress-fill" style={[styles.fill, { width: `${now}%`, backgroundColor: color.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: tokens.size.track, borderRadius: tokens.radius.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: tokens.radius.track },
});
