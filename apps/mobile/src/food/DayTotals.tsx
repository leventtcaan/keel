import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { AnimatedFill } from '@/motion/AnimatedFill';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { type Palette, tokens } from '@/theme/tokens';
import type { Loaded } from '@/today/today';

import { budgetLine } from './budget';
import { mid, rangeText } from './single';

type Schemas = components['schemas'];

type Props = {
  budget: Loaded<Schemas['DayBudget']>;
  targets: Loaded<Schemas['Targets']>;
  /** The day's own totals (GET /v1/days), for a day with no target to measure against. */
  summary?: Schemas['DaySummary'];
  /** One line under the numbers, small: what a meal of the user's day is about (the target over the slots they use). */
  hint?: string | null;
};

/**
 * What the day came to, as single numbers (ADR-090 #5, K-1063): the calories left as the big number, and protein, carbs and fat as
 * eaten over target, where a target exists. A day with no target shows what was eaten. "Details" opens the ranges the numbers are the
 * middle of (U5). Past days read the same way; the target is the one in force.
 */
export function DayTotals({ budget, targets, summary, hint }: Props) {
  const { color } = useTheme();
  const [detail, setDetail] = useState(false);
  const targetKnown = budget.state === 'ready';
  const eaten = targetKnown ? budget.value.eaten : summary?.eaten;
  const unit = t('food.budget.kcalUnit');
  const grams = t('food.totals.gramsShort');
  const split = targets.state === 'ready' ? targets.value : null;

  let headline: string;
  let caption: string | null = null;
  if (targetKnown) {
    // The same three states as before (budget.ts): a range that reaches zero or crosses it is neither "left" nor "past" (U7).
    const { kcal } = budgetLine(budget.value.left);
    if (kcal.kind === 'left') headline = t('food.totals.left', { value: mid(kcal).toLocaleString('en-US'), unit });
    else if (kcal.kind === 'over') {
      caption = t('food.budget.over');
      headline = t('food.budget.single', { value: mid(kcal).toLocaleString('en-US'), unit });
    } else headline = t('food.budget.around');
  } else {
    headline = t('food.totals.eaten', { value: (eaten === undefined ? 0 : mid(eaten.kcal)).toLocaleString('en-US'), unit });
  }

  // Each macro in its own colour (the same three everywhere), its name beside the dot, "eaten / target g", and a bar where a target exists.
  const macro = (key: 'protein' | 'carbs' | 'fat', value: number | undefined, target: number | undefined) => {
    const tone: keyof Palette = key === 'protein' ? 'macroProtein' : key === 'carbs' ? 'macroCarbs' : 'macroFat';
    const share = target === undefined || target <= 0 ? null : ((value ?? 0) / target) * 100;
    // Built outside the JSX children (the raw-text guard reads them).
    const bar =
      share === null ? null : (
        <View style={[styles.track, { backgroundColor: color.track }]}>
          <AnimatedFill testID={`macro-fill-${key}`} percent={share} style={[styles.fill, { backgroundColor: color[tone] }]} />
        </View>
      );
    return (
      <View key={key} style={styles.macro} testID={`macro-${key}`}>
        <View style={styles.macroName}>
          <View style={[styles.dot, { backgroundColor: color[tone] }]} />
          <Text style={[styles.macroLabel, { color: color.muted }]}>{t(`food.totals.${key}`)}</Text>
        </View>
        <Text style={[styles.macroValue, { color: color.text }]}>
          {target === undefined ? t('food.totals.of', { eaten: value ?? 0, unit: grams }) : t('food.totals.ofTarget', { eaten: value ?? 0, target, unit: grams })}
        </Text>
        {bar}
      </View>
    );
  };
  const target = targetKnown ? budget.value.targetKcal : undefined;
  const eatenKcal = eaten === undefined ? 0 : mid(eaten.kcal);
  const kcalBar =
    target === undefined || target <= 0 ? null : <ProgressBar value={eatenKcal / target} label={t('food.totals.barLabel', { eaten: eatenKcal.toLocaleString('en-US'), target: target.toLocaleString('en-US'), unit })} />;
  const rangeLines =
    eaten === undefined
      ? t('food.totals.nothing')
      : [
          t('food.totals.rangeEaten', {
            kcal: rangeText(eaten.kcal, unit),
            protein: rangeText(eaten.proteinG, grams),
            carbs: rangeText(eaten.carbsG, grams),
            fat: rangeText(eaten.fatG, grams),
          }),
          ...(targetKnown ? [t('food.totals.rangeLeft', { kcal: rangeText(budget.value.left.kcal, unit) })] : []),
        ].join('\n');
  return (
    <Card testID="totals">
      {caption !== null && <Text style={[styles.small, { color: color.muted }]}>{caption}</Text>}
      <Text testID="headline" accessibilityRole="header" style={[styles.big, { color: color.text }]}>
        {headline}
      </Text>
      {kcalBar}
      <View style={styles.macros}>
        {macro('protein', eaten === undefined ? 0 : mid(eaten.proteinG), targetKnown ? budget.value.targetProteinG : undefined)}
        {macro('carbs', eaten === undefined ? 0 : mid(eaten.carbsG), split?.carbsG)}
        {macro('fat', eaten === undefined ? 0 : mid(eaten.fatG), split?.fatG)}
      </View>
      {hint != null && <Text style={[styles.small, { color: color.muted }]}>{hint}</Text>}
      <Pressable testID="totals-detail" accessibilityRole="button" accessibilityState={{ expanded: detail }} onPress={() => setDetail((now) => !now)} style={styles.detailsRow}>
        <Text style={[styles.small, { color: color.accent }]}>{t(detail ? 'meal.item.detailHide' : 'meal.item.detail')}</Text>
      </Pressable>
      {detail && <Text style={[styles.small, { color: color.textSecondary }]}>{rangeLines}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number, fontVariant: ['tabular-nums'] },
  macros: { flexDirection: 'row', gap: tokens.space.md },
  macro: { flex: 1, gap: 2 },
  macroName: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  dot: { width: tokens.size.swatch - 2, height: tokens.size.swatch - 2, borderRadius: (tokens.size.swatch - 2) / 2 },
  track: { height: tokens.size.track, borderRadius: tokens.radius.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: tokens.radius.track },
  macroLabel: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  macroValue: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
  small: { fontSize: tokens.type.bodySmall },
  detailsRow: { minHeight: tokens.size.touch / 2, justifyContent: 'center' },
});
