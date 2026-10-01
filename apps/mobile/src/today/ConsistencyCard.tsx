import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Consistency = components['schemas']['Consistency'];
const PARTS = ['training', 'protein', 'steps', 'weighIns'] as const;

/** The daily number (U15, K-111) as the server counted it (K-420): this week, its four parts, the weeks on track. */
export function ConsistencyCard({ consistency }: { consistency: Consistency | null }) {
  const { color } = useTheme();
  if (consistency === null) {
    return (
      <Card>
        <Text style={[styles.label, { color: color.muted }]}>{t('today.consistency.title')}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('today.consistency.firstWeek')}</Text>
      </Card>
    );
  }
  const percent =
    consistency.percent === undefined ? null : (
      <Text style={[styles.number, { color: color.text }]}>{t('today.consistency.percent', { percent: consistency.percent })}</Text>
    );
  const record =
    consistency.record.countedWeeks === 0 ? null : (
      <Text style={[styles.small, { color: color.muted }]}>
        {t('today.consistency.record', {
          onTrack: consistency.record.onTrackWeeks,
          counted: consistency.record.countedWeeks,
        })}
      </Text>
    );
  return (
    <Card testID="consistency">
      <Text style={[styles.label, { color: color.muted }]}>{t('today.consistency.title')}</Text>
      {percent}
      <Text style={[styles.text, { color: color.textSecondary }]}>
        {t('today.consistency.of', {
          done: consistency.done,
          planned: consistency.planned,
        })}
      </Text>
      <View style={styles.parts}>
        {PARTS.map((part) => {
          const { done, planned } = consistency[part];
          const name = t(`today.consistency.${part}`);
          return (
            <View
              key={part}
              accessible
              accessibilityLabel={t('today.consistency.partSpoken', {
                part: name,
                done,
                planned,
              })}
              style={styles.part}>
              <Text style={[styles.small, { color: color.muted }]}>{name}</Text>
              <Text style={[styles.partNumber, { color: color.text }]}>{t('today.consistency.part', { done, planned })}</Text>
            </View>
          );
        })}
      </View>
      {record}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  number: {
    fontFamily: tokens.font.display,
    fontSize: tokens.type.screenTitle,
  },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  parts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
  },
  part: { flex: 1, gap: tokens.space.xs },
  partNumber: {
    fontFamily: tokens.font.displayBold,
    fontSize: tokens.type.number,
  },
});
