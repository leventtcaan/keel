import { StyleSheet, Text } from 'react-native';

import { SandLock } from '@/components/SandLock';
import { WordChoice } from '@/components/WordChoice';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { ChartRange } from './params';
import type { RangeNote } from './useChartRange';

/** A chart's ranges as words on the paper (ADR-094 Ek 9, K-1260). */
export function RangeWords({ ranges, value, onChange, testID }: { ranges: ChartRange[]; value: string; onChange: (key: string) => void; testID: string }) {
  return <WordChoice testID={testID} options={ranges.map((r) => ({ value: r.key, label: t(`progress.range.${r.key}`) }))} value={value} onChange={onChange} />;
}

/** Under the chart, after a range was chosen: the sand lock without a subscription, a line when it could not be read. */
export function RangeNoteLine({ note, lockLine = t('progress.range.locked') }: { note: RangeNote; lockLine?: string }) {
  const { color } = useTheme();
  if (note === null) return null;
  if (note === 'locked') return <SandLock testID="range-lock" line={lockLine} />;
  return <Text style={[styles.line, { color: color.textSecondary }]}>{t(note === 'unread' ? 'progress.range.unread' : 'progress.range.failed')}</Text>;
}

const styles = StyleSheet.create({ line: { fontSize: tokens.type.bodySmall } });
