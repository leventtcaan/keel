import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { budgetLine } from '@/food/budget';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { Loaded } from './today';

type Schemas = components['schemas'];

/**
 * The food line on This week (ADR-077 #1, prototype `#home`): what is left of today's food as a range (U5), the server's
 * (K-409), and "Log"; the whole line opens the meal. Without the health data consent, the lock line in its place:
 * "Needs your OK for health data · Allow" (ADR-072 Ek 1, user test 8 Oct), Allow leading to the consent in Settings,
 * where its text is read before it is given. The first week (no call yet, `firstWeek`): the server works the budget out
 * from the target the plan will start with (K-997, ADR-072 Ek 2), so the same range comes back; with nothing eaten it
 * reads "Food today 2,100 kcal" (prototype foodLine), after a meal "Food left" like any week. No budget (404): no line.
 */
export function FoodLine({ budget, firstWeek }: { budget: Loaded<Schemas['DayBudget']>; firstWeek: boolean }) {
  const { color } = useTheme();
  if (budget.state === 'consent') {
    return (
      <View testID="food-locked" style={[styles.line, { backgroundColor: color.surface }]}>
        <SymbolView name="lock.fill" size={tokens.type.body} tintColor={color.muted} />
        <Text style={[styles.text, styles.grow, { color: color.textSecondary }]}>{t('thisWeek.food.locked')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('thisWeek.food.allowLabel')}
          onPress={() => router.push('/settings')}
          hitSlop={tokens.space.sm}
          style={styles.allow}>
          <Text style={[styles.strong, { color: color.accent }]}>{t('thisWeek.food.allow')}</Text>
        </Pressable>
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
    const nothingEaten = budget.value.eaten.kcal.high === 0;
    [lead, amount] =
      kcal.kind === 'left'
        ? [firstWeek && nothingEaten ? t('thisWeek.food.today') : t('thisWeek.food.left'), range(kcal.low, kcal.high)]
        : kcal.kind === 'over'
          ? [t('thisWeek.food.over'), range(kcal.low, kcal.high)]
          : [t('thisWeek.food.around'), null];
  } else {
    return null;
  }
  return (
    <Pressable
      testID="food-line"
      accessibilityRole="button"
      accessibilityLabel={amount === null ? t('thisWeek.food.lineLabelAround', { lead }) : t('thisWeek.food.lineLabel', { lead, amount })}
      onPress={() => router.push('/meal')}
      style={({ pressed }) => [styles.line, { backgroundColor: color.surface }, pressed && styles.dim]}>
      <View style={styles.grow}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{lead}</Text>
        {amount === null ? null : <Text style={[styles.amount, { color: color.text }]}>{amount}</Text>}
      </View>
      <View style={[styles.log, { backgroundColor: color.background }]}>
        <SymbolView name="fork.knife" size={tokens.type.bodySmall} tintColor={color.text} />
        <Text style={[styles.strong, { color: color.text }]}>{t('thisWeek.food.log')}</Text>
      </View>
    </Pressable>
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
  text: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  amount: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number, fontVariant: ['tabular-nums'] },
  strong: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  log: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    borderRadius: tokens.radius.button,
    paddingHorizontal: tokens.space.md,
    minHeight: tokens.size.touch,
  },
  allow: { minHeight: tokens.size.touch, justifyContent: 'center', paddingHorizontal: tokens.space.sm },
  dim: { opacity: tokens.opacity.dim },
});
