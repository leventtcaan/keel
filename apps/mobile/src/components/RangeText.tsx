import { StyleSheet, Text } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  low: number;
  high: number;
  /** Already translated unit ("kcal", "kg"); omitted for unitless counts. */
  unit?: string;
};

/**
 * An estimate is always shown as a range, never a single number (U5). The pair is ordered here, so a reversed
 * low/high still reads as the same range.
 */
export function RangeText({ low, high, unit }: Props) {
  const { color } = useTheme();
  const vars = { low: Math.min(low, high), high: Math.max(low, high) };
  const suffix = unit === undefined ? '' : ` ${unit}`;
  return (
    <Text accessibilityLabel={t('format.rangeSpoken', vars) + suffix} style={[styles.range, { color: color.text }]}>
      {t('format.range', vars) + suffix}
    </Text>
  );
}

const styles = StyleSheet.create({
  range: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number, fontVariant: ['tabular-nums'] },
});
