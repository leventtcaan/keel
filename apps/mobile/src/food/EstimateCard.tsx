import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { RangeText } from '@/components/RangeText';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The match card (K-407): each item as the database matched it, with its range, and the meal's energy and protein as
 * ranges (U1, U5). `question`: the server's one question, when one item dominates the range — already in words.
 */
export function EstimateCard({ estimate, question }: { estimate: components['schemas']['FoodEstimate']; question: string | null }) {
  const { color } = useTheme();
  const kcalUnit = t('food.budget.kcalUnit');
  return (
    <Card testID="estimate">
      <Text style={[styles.label, { color: color.muted }]}>{t('meal.estimate.title')}</Text>
      {estimate.items.map((item, index) => (
        <View key={`${item.foodId}-${index}`} style={styles.row}>
          <Text style={[styles.text, styles.name, { color: color.text }]}>{item.name}</Text>
          <Text
            accessibilityLabel={`${t('format.rangeSpoken', { low: item.kcal.low, high: item.kcal.high })} ${kcalUnit}`}
            style={[styles.text, { color: color.text }]}>{`${t('format.range', { low: item.kcal.low, high: item.kcal.high })} ${kcalUnit}`}</Text>
        </View>
      ))}
      <RangeText low={estimate.kcal.low} high={estimate.kcal.high} unit={kcalUnit} />
      <RangeText low={estimate.proteinG.low} high={estimate.proteinG.high} unit={t('food.budget.proteinUnit')} />
      {question !== null && <Text style={[styles.text, { color: color.textSecondary }]}>{question}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space.sm },
  name: { flex: 1 },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
});
