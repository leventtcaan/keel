import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { budgetLine } from '@/food/budget';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { Loaded } from './today';

type Schemas = components['schemas'];

/**
 * The food line on This week (ADR-077 #1, prototype `#home`): what is left of today's food as a range (U5), the server's
 * (K-409), and "Log"; the line opens the day's food (the meals, to correct or delete, ADR-086), "Log" the meal. Without the health data consent, the lock line in its place:
 * "Needs your OK for health data · Allow" (ADR-072 Ek 1, user test 8 Oct), Allow leading to the consent in Settings,
 * where its text is read before it is given. The first week (no call yet): the server works the budget out from the target
 * the plan will start with (K-997, ADR-072 Ek 2), so the same range comes back. One name for the number whether or not a
 * meal is logged, "Food left" (K-1013: it flipped from "Food today" to "Food left" at the first meal, as if the number
 * were two things; the Food page says "Food left today" too). No budget (404): no line.
 */
export function FoodLine({ budget }: { budget: Loaded<Schemas['DayBudget']> }) {
  const { color } = useTheme();
  if (budget.state === 'consent') {
    return (
      <View testID="food-locked" style={[styles.line, { backgroundColor: color.surface }]}>
        <SymbolView name="lock.fill" size={tokens.type.body} tintColor={color.muted} />
        <Text style={[styles.text, styles.grow, { color: color.textSecondary }]}>{t('thisWeek.food.locked')}</Text>
        <Button label={t('thisWeek.food.allow')} accessibilityLabel={t('thisWeek.food.allowLabel')} variant="text" size="sm" onPress={() => router.push('/settings')} />
      </View>
    );
  }
  const unit = t('food.budget.kcalUnit');
  const range = (low: number, high: number) =>
    low === high ? t('food.budget.single', { value: low.toLocaleString('en-US'), unit }) : `${t('format.range', { low: low.toLocaleString('en-US'), high: high.toLocaleString('en-US') })} ${unit}`;
  let lead: string;
  let amount: string | null;
  if (budget.state === 'ready') {
    const { kcal } = budgetLine(budget.value.left);
    [lead, amount] =
      kcal.kind === 'left'
        ? [t('thisWeek.food.left'), range(kcal.low, kcal.high)]
        : kcal.kind === 'over'
          ? [t('thisWeek.food.over'), range(kcal.low, kcal.high)]
          : [t('thisWeek.food.around'), null];
  } else {
    return null;
  }
  return (
    <View testID="food-line" style={[styles.line, { backgroundColor: color.surface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={amount === null ? t('thisWeek.food.lineLabelAround', { lead }) : t('thisWeek.food.lineLabel', { lead, amount })}
        onPress={() => router.push('/food')}
        style={({ pressed }) => [styles.grow, styles.body, pressed && styles.dim]}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{lead}</Text>
        {amount === null ? null : <Text style={[styles.amount, { color: color.text }]}>{amount}</Text>}
      </Pressable>
      <Button label={t('thisWeek.food.log')} accessibilityLabel={t('thisWeek.food.logLabel')} variant="text" onPress={() => router.push('/meal')} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    minHeight: tokens.size.touch,
  },
  grow: { flex: 1 },
  body: { minHeight: tokens.size.touch, justifyContent: 'center' },
  text: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  amount: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number, fontVariant: ['tabular-nums'] },
  dim: { opacity: tokens.opacity.dim },
});
