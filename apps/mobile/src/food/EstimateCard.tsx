import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { kcalText, macroText, macrosOf, rangeText } from './single';

/**
 * The meal's total (K-407, K-1046; ADR-090 #5): its energy as the big number in the display face and its protein, carbs and fat
 * under it, each the middle of the server's range. "Details" opens the ranges and, for each item, its own (U5) — the numbers are
 * the server's, the card only picks how to show them (U1). `question`: the server's one question, when one item dominates the
 * range — already in words.
 */
export function EstimateCard({ estimate, question }: { estimate: components['schemas']['FoodEstimate']; question: string | null }) {
  const { color } = useTheme();
  const [detail, setDetail] = useState(false);
  const total = macrosOf(estimate);
  const unit = t('food.budget.kcalUnit');
  const proteinUnit = t('food.budget.proteinUnit');
  return (
    <Card testID="estimate">
      <Text style={[styles.label, { color: color.muted }]}>{t('meal.estimate.title')}</Text>
      <Text testID="estimate-kcal" style={[styles.big, { color: color.text }]}>
        {kcalText(total.kcal)}
      </Text>
      <Text style={[styles.text, { color: color.text }]}>{macroText(total)}</Text>
      {question !== null && <Text style={[styles.text, { color: color.textSecondary }]}>{question}</Text>}
      <Pressable testID="estimate-detail" accessibilityRole="button" accessibilityState={{ expanded: detail }} onPress={() => setDetail((now) => !now)} style={styles.detailsRow}>
        <Text style={[styles.small, { color: color.accent }]}>{t(detail ? 'meal.item.detailHide' : 'meal.item.detail')}</Text>
      </Pressable>
      {detail && (
        <>
          <Text style={[styles.small, { color: color.textSecondary }]}>
            {t('meal.estimate.range', { kcal: rangeText(estimate.kcal, unit), protein: rangeText(estimate.proteinG, proteinUnit) })}
          </Text>
          {estimate.items.map((item, index) => (
            <Text key={`${item.foodId}-${index}`} style={[styles.small, { color: color.muted }]}>
              {t('meal.estimate.itemRange', { name: item.name, kcal: rangeText(item.kcal, unit) })}
            </Text>
          ))}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  big: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.stepperValue, fontVariant: ['tabular-nums'] },
  text: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
  small: { fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
  detailsRow: { minHeight: tokens.size.touch / 2, justifyContent: 'center' },
});
