import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { budgetLine } from '@/food/budget';
import { mid, rangeText } from '@/food/single';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { Loaded } from './today';

type Schemas = components['schemas'];

/**
 * The food line on This week (ADR-077 #1, prototype `#home`): what is left of today's food as ONE number, the middle of the
 * server's range (K-409; ADR-090 #5, as the food day screen shows it), the range itself under "Details"; and "Log"; the line opens the day's food (the meals, to correct or delete, ADR-086), "Log" the meal. Without the health data consent, the lock line in its place:
 * "Needs your OK for health data · Allow" (ADR-072 Ek 1, user test 8 Oct), Allow leading to the consent in Settings,
 * where its text is read before it is given. The first week (no call yet): the server works the budget out from the target
 * the plan will start with (K-997, ADR-072 Ek 2), so the same range comes back. One name for the number whether or not a
 * meal is logged, "Food left" (K-1013: it flipped from "Food today" to "Food left" at the first meal, as if the number
 * were two things; the Food page says "Food left today" too). No budget (404): no line.
 */
export function FoodLine({ budget }: { budget: Loaded<Schemas['DayBudget']> }) {
  const { color } = useTheme();
  const [detail, setDetail] = useState(false);
  if (budget.state === 'consent') {
    return (
      <View testID="food-locked" style={[styles.card, styles.line, { backgroundColor: color.surface }]}>
        <SymbolView name="lock.fill" size={tokens.type.body} tintColor={color.muted} />
        <Text style={[styles.text, styles.grow, { color: color.textSecondary }]}>{t('thisWeek.food.locked')}</Text>
        <Button label={t('thisWeek.food.allow')} accessibilityLabel={t('thisWeek.food.allowLabel')} variant="text" size="sm" onPress={() => router.push('/settings')} />
      </View>
    );
  }
  const unit = t('food.budget.kcalUnit');
  const single = (value: number) => t('food.budget.single', { value: value.toLocaleString('en-US'), unit });
  let lead: string;
  let amount: string | null;
  let detailLine: string | null = null;
  if (budget.state === 'ready') {
    const { kcal } = budgetLine(budget.value.left);
    [lead, amount] =
      kcal.kind === 'left'
        ? [t('thisWeek.food.left'), single(mid(kcal))]
        : kcal.kind === 'over'
          ? [t('thisWeek.food.over'), single(mid(kcal))]
          : [t('thisWeek.food.around'), null];
    // A range only where the number is an estimate: nothing eaten yet, the target itself is exact (K-409 review).
    if (kcal.kind !== 'around' && kcal.low !== kcal.high) detailLine = t('thisWeek.food.range', { range: rangeText(kcal, unit) });
  } else {
    return null;
  }
  // Built outside the JSX children (the raw-text guard reads them).
  const info =
    detailLine === null ? null : (
      <Pressable
        testID="food-line-detail"
        accessibilityRole="button"
        accessibilityState={{ expanded: detail }}
        accessibilityLabel={t(detail ? 'thisWeek.food.hideRange' : 'thisWeek.food.showRange')}
        hitSlop={tokens.space.sm}
        onPress={() => setDetail((now) => !now)}
        style={styles.info}>
        <SymbolView name={detail ? 'chevron.up.circle' : 'info.circle'} size={tokens.type.body} tintColor={color.muted} />
      </Pressable>
    );
  return (
    <View testID="food-line" style={[styles.card, { backgroundColor: color.surface }]}>
      <View style={styles.line}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={amount === null ? t('thisWeek.food.lineLabelAround', { lead }) : t('thisWeek.food.lineLabel', { lead, amount })}
          onPress={() => router.push('/food')}
          style={({ pressed }) => [styles.grow, styles.body, pressed && styles.dim]}>
          <Text style={[styles.text, { color: color.textSecondary }]}>{lead}</Text>
          {amount === null ? null : <Text style={[styles.amount, { color: color.text }]}>{amount}</Text>}
        </Pressable>
        {info}
        <Button label={t('thisWeek.food.log')} accessibilityLabel={t('thisWeek.food.logLabel')} variant="text" onPress={() => router.push('/meal')} />
      </View>
      {detail && detailLine !== null && <Text style={[styles.small, { color: color.textSecondary }]}>{detailLine}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch },
  info: { minHeight: tokens.size.touch, minWidth: tokens.size.touch / 2, alignItems: 'center', justifyContent: 'center' },
  small: { fontSize: tokens.type.bodySmall },
  grow: { flex: 1 },
  body: { minHeight: tokens.size.touch, justifyContent: 'center' },
  text: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  amount: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number, fontVariant: ['tabular-nums'] },
  dim: { opacity: tokens.opacity.dim },
});
