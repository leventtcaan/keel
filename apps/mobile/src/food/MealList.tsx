import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { DayMeal } from './meals';

type Meal = components['schemas']['Meal'];

/** What is in a meal, by name, as the server matched it. */
const itemNames = (meal: Meal) => meal.items.map((item) => item.name);
/** Spoken: food names carry commas ("Oats, rolled"), so items are set apart by a stronger pause. */
const spokenItems = (meal: Meal) => itemNames(meal).join('; ');
const kcalRange = (meal: Meal) => `${t('format.range', { low: meal.kcal.low, high: meal.kcal.high })} ${t('food.budget.kcalUnit')}`;

/** Each item on its own line: food names carry commas ("Oats, rolled"), so a joined list would run them together. */
function MealRow({ slot, names, kcal }: { slot: string; names: string[]; kcal: string }) {
  const { color } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.what}>
        <Text style={[styles.slot, { color: color.muted }]}>{slot}</Text>
        {names.map((name, i) => (
          <Text key={i} style={[styles.text, { color: color.text }]}>
            {name}
          </Text>
        ))}
      </View>
      <Text style={[styles.kcal, { color: color.text }]}>{kcal}</Text>
    </View>
  );
}

/**
 * Today's meals (K-407): each with its range (U5); one not sent yet has no range to show — the server estimates it.
 * `complete`: the server's list was read; only then can it say nothing is logged.
 */
export function MealList({ meals, complete }: { meals: DayMeal[]; complete: boolean }) {
  const { color } = useTheme();
  return (
    <Card testID="meals">
      <Text style={[styles.label, { color: color.muted }]}>{t('food.meals.title')}</Text>
      {meals.length === 0 && complete && <Text style={[styles.text, { color: color.textSecondary }]}>{t('food.meals.none')}</Text>}
      {meals.map((row) =>
        row.kind === 'sent' ? (
          <MealRow key={row.meal.clientId} slot={t(`food.slot.${row.meal.slot}`)} names={itemNames(row.meal)} kcal={kcalRange(row.meal)} />
        ) : (
          <MealRow key={row.clientId} slot={t(`food.slot.${row.slot}`)} names={[t('food.meals.waiting')]} kcal="" />
        ),
      )}
    </Card>
  );
}

/** "Same as yesterday" (K-407): one tap logs yesterday's meal again, as it was. */
export function RepeatOffers({ offers, onRepeat, busy }: { offers: Meal[]; onRepeat: (meal: Meal) => void; busy: boolean }) {
  const { color } = useTheme();
  return (
    <Card outline testID="repeat">
      <Text style={[styles.label, { color: color.muted }]}>{t('food.repeat.title')}</Text>
      {offers.map((meal) => {
        const slot = t(`food.slot.${meal.slot}`);
        return (
          <Pressable
            key={meal.id}
            accessibilityRole="button"
            accessibilityLabel={t('food.repeat.spoken', { slot, items: spokenItems(meal) })}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => onRepeat(meal)}>
            <MealRow slot={slot} names={itemNames(meal)} kcal={kcalRange(meal)} />
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.xs },
  what: { flex: 1, gap: tokens.space.xs },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  slot: { fontSize: tokens.type.bodySmall },
  text: { fontSize: tokens.type.body },
  kcal: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
});
