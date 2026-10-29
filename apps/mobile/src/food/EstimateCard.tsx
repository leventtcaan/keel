import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The estimate card (K-407, K-1046; prototype yeniden-yapim.html §7 `.est`): the meal's energy as the big range in the display
 * face with its unit small beside it, its protein as a range under it, then each item as the database matched it, with its
 * range, and the server's one question (U1, U5). Always ranges, never one number: the pair is the server's, written here.
 * `question`: the server's one question, when one item dominates the range — already in words.
 */
export function EstimateCard({ estimate, question }: { estimate: components['schemas']['FoodEstimate']; question: string | null }) {
  const { color } = useTheme();
  const kcalUnit = t('food.budget.kcalUnit');
  const proteinUnit = t('food.budget.proteinUnit');
  const spoken = (low: number, high: number, unit: string) => `${t('format.rangeSpoken', { low, high })} ${unit}`;
  const written = (low: number, high: number, unit: string) => `${t('format.range', { low, high })} ${unit}`;
  return (
    <Card testID="estimate">
      <Text style={[styles.label, { color: color.muted }]}>{t('meal.estimate.title')}</Text>
      <Text accessibilityLabel={spoken(estimate.kcal.low, estimate.kcal.high, kcalUnit)} style={[styles.big, { color: color.text }]}>
        {written(estimate.kcal.low, estimate.kcal.high, kcalUnit)}
      </Text>
      <Text accessibilityLabel={spoken(estimate.proteinG.low, estimate.proteinG.high, proteinUnit)} style={[styles.text, { color: color.text }]}>
        {written(estimate.proteinG.low, estimate.proteinG.high, proteinUnit)}
      </Text>
      {estimate.items.map((item, index) => (
        <View key={`${item.foodId}-${index}`} style={styles.row}>
          <Text style={[styles.small, styles.name, { color: color.muted }]}>{item.name}</Text>
          <Text accessibilityLabel={spoken(item.kcal.low, item.kcal.high, kcalUnit)} style={[styles.small, { color: color.muted }]}>
            {written(item.kcal.low, item.kcal.high, kcalUnit)}
          </Text>
        </View>
      ))}
      {question !== null && <Text style={[styles.text, { color: color.textSecondary }]}>{question}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space.sm },
  name: { flex: 1 },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  // The meal's range in the display face at the stepper's size (prototype `.est .big`); the unit is part of the same text so a screen reader says it once.
  big: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.stepperValue, fontVariant: ['tabular-nums'] },
  text: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
  small: { fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
});
