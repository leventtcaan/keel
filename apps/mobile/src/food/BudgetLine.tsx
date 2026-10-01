import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { RangeText } from '@/components/RangeText';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { budgetLine } from './budget';

/** What is left of today's food, in words and ranges (K-409); the same line on Today and on the Food tab. */
export function BudgetLine({ left }: { left: components['schemas']['Left'] }) {
  const { color } = useTheme();
  // Nothing logged yet: what is left is the target itself, one number (K-409 review) — a range only for an estimate (U5).
  const amount = (low: number, high: number, unit: string) =>
    low === high ? (
      <Text style={[styles.single, { color: color.text }]}>{t('food.budget.single', { value: low.toLocaleString('en-US'), unit })}</Text>
    ) : (
      <RangeText low={low} high={high} unit={unit} />
    );
  const { kcal, protein } = budgetLine(left);
  const kcalUnit = t('food.budget.kcalUnit');
  const energy =
    kcal.kind === 'left' ? (
      amount(kcal.low, kcal.high, kcalUnit)
    ) : kcal.kind === 'over' ? (
      <View>
        <Text style={[styles.small, { color: color.muted }]}>{t('food.budget.over')}</Text>
        {amount(kcal.low, kcal.high, kcalUnit)}
      </View>
    ) : (
      <Text style={[styles.text, { color: color.text }]}>{t('food.budget.around')}</Text>
    );
  const proteinLine =
    protein.kind === 'left' ? (
      amount(protein.low, protein.high, t('food.budget.proteinUnit'))
    ) : (
      <Text style={[styles.small, { color: color.muted }]}>{t('food.budget.proteinDone')}</Text>
    );
  return (
    <View style={styles.line}>
      {energy}
      {proteinLine}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { gap: tokens.space.xs },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  single: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number, fontVariant: ['tabular-nums'] },
});
