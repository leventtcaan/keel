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
  const { kcal, protein } = budgetLine(left);
  const kcalUnit = t('food.budget.kcalUnit');
  const energy =
    kcal.kind === 'left' ? (
      <RangeText low={kcal.low} high={kcal.high} unit={kcalUnit} />
    ) : kcal.kind === 'over' ? (
      <View>
        <Text style={[styles.small, { color: color.muted }]}>{t('food.budget.over')}</Text>
        <RangeText low={kcal.low} high={kcal.high} unit={kcalUnit} />
      </View>
    ) : (
      <Text style={[styles.text, { color: color.text }]}>{t('food.budget.around')}</Text>
    );
  const proteinLine =
    protein.kind === 'left' ? (
      <RangeText low={protein.low} high={protein.high} unit={t('food.budget.proteinUnit')} />
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
});
