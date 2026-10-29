import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { amountPhrase } from './amountText';
import { QUICK } from './draft';
import { type DayMeal, groupBySlot } from './meals';
import { kcalText, mid } from './single';
import { SwipeRow } from './SwipeRow';

type Schemas = components['schemas'];
type Meal = Schemas['Meal'];
type Slot = Schemas['MealSlot'];

/** The amount line of a logged item; a quick add has no food or portion, and its name already says what it is: no second line (K-1066). */
const amountOf = (item: Schemas['EstimatedItem']) => (item.foodId === QUICK ? null : amountPhrase(item.amount));

/** Spoken: food names carry commas ("Oats, rolled"), so items are set apart by a stronger pause. */
const spokenItems = (meal: Meal) => meal.items.map((item) => item.name).join('; ');
const mealKcal = (meal: Meal) => kcalText(mid(meal.kcal));
/** A slot's total: the middle of each log's range, added. */
const slotKcal = (meals: Meal[]) => kcalText(meals.reduce((sum, meal) => sum + mid(meal.kcal), 0));

type ListProps = {
  meals: DayMeal[];
  /** The server's list was read; only then can it say nothing is logged. */
  complete: boolean;
  /** Today, or a day gone by: what "nothing logged" says. */
  isToday: boolean;
  /** Slots the user's day is made of that have no meal on this day: each offers its own add. */
  emptySlots: Slot[];
  /** Tap an item: change its amount or portion in place. */
  onEditItem: (meal: Meal, index: number) => void;
  /** Swipe an item away (the screen takes it out and offers Undo). */
  onDeleteItem: (meal: Meal, index: number) => void;
  /** The slot's menu: delete every log of the slot (one Undo puts them all back). */
  onDeleteSlot: (meals: Meal[]) => void;
  /** Add a food to this slot of the day being shown. */
  onAdd: (slot: Slot) => void;
  /** The slot's menu offers this on a day that is not today: log its meals again for today. */
  onLogToday?: (meals: Meal[]) => void;
};

/**
 * The day's meals, each item with its amount and its kcal as one number (K-1063, ADR-090 #5): tap an item to change its amount or
 * portion where it stands, swipe it left to delete it (the app's banner offers Undo). Logs of the same slot are one section under one header (K-1066): the
 * slot's total is their sum and its menu acts on all of them. A meal not sent yet has no numbers: the server estimates it when it arrives. An empty slot of the user's day offers its own add.
 */
export function MealList({ meals, complete, isToday, emptySlots, onEditItem, onDeleteItem, onDeleteSlot, onAdd, onLogToday }: ListProps) {
  const { color } = useTheme();
  const menu = (slot: Slot, logs: Meal[]) =>
    Alert.alert(t(`food.slot.${slot}`), undefined, [
      ...(onLogToday === undefined ? [] : [{ text: t('food.meals.logToday'), onPress: () => onLogToday(logs) }]),
      { text: t('food.meals.deleteMeal'), style: 'destructive' as const, onPress: () => onDeleteSlot(logs) },
      { text: t('food.meals.cancel'), style: 'cancel' as const },
    ]);
  const noneLine =
    meals.length === 0 && complete ? <Text style={[styles.empty, { color: color.textSecondary }]}>{t(isToday ? 'food.meals.none' : 'food.meals.noneDay')}</Text> : null;
  return (
    <View testID="meals" style={styles.list}>
      {noneLine}
      {groupBySlot(meals).map((group) => {
        const slotName = t(`food.slot.${group.slot}`);
        // Every log of the slot lists its items in one card, in the order they were logged; each item still acts on its own log.
        // Built outside the JSX children (the raw-text guard reads them).
        const items = group.meals.flatMap((meal) => meal.items.map((item, index) => ({ meal, item, index })));
        const sent = group.meals.length > 0;
        const menuButton = sent ? (
          <Pressable
            testID={`menu-${group.slot}`}
            accessibilityRole="button"
            accessibilityLabel={t('food.meals.menu', { slot: slotName })}
            onPress={() => menu(group.slot, group.meals)}
            hitSlop={tokens.space.sm}>
            <Icon name="ellipsis.circle" tone="muted" />
          </Pressable>
        ) : null;
        const card = items.length === 0 ? null : (
          <View style={[styles.card, { backgroundColor: color.surface }]}>
            {items.map(({ meal, item, index }, at) => {
              const amount = amountOf(item);
              return (
                <SwipeRow key={`${meal.id}-${item.foodId}-${index}`} testID={`swipe-${meal.id}-${index}`} label={t('food.meals.delete')} onDelete={() => onDeleteItem(meal, index)}>
                  <Pressable
                    testID={`item-${meal.id}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={t('food.meals.correct', { slot: slotName, items: item.name, kcal: kcalText(mid(item.kcal)) })}
                    onPress={() => onEditItem(meal, index)}
                    style={styles.item}>
                    {at > 0 && <View style={[styles.line, { backgroundColor: color.line }]} />}
                    <View style={styles.what}>
                      <Text style={[styles.name, { color: color.text }]}>{item.name}</Text>
                      {amount !== null && <Text style={[styles.amount, { color: color.muted }]}>{amount}</Text>}
                    </View>
                    <Text style={[styles.kcal, { color: color.text }]}>{kcalText(mid(item.kcal))}</Text>
                  </Pressable>
                </SwipeRow>
              );
            })}
          </View>
        );
        const waiting = group.waiting > 0 && sent ? <Text style={[styles.amount, { color: color.muted }]}>{t('food.meals.waiting')}</Text> : null;
        const add = sent ? <Button label={t('food.meals.addTo', { slot: slotName })} variant="text" size="sm" onPress={() => onAdd(group.slot)} /> : null;
        return (
          <View key={group.slot} style={styles.meal} testID={`meal-${group.slot}`}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={[styles.slot, { color: color.text }]}>
                {slotName}
              </Text>
              <Text style={[styles.mealKcal, { color: color.muted }]}>{sent ? slotKcal(group.meals) : t('food.meals.waiting')}</Text>
              {menuButton}
            </View>
            {card}
            {waiting}
            {add}
          </View>
        );
      })}
      {emptySlots.map((slot) => (
        <Pressable
          key={slot}
          testID={`empty-${slot}`}
          accessibilityRole="button"
          accessibilityLabel={t('food.meals.addTo', { slot: t(`food.slot.${slot}`) })}
          onPress={() => onAdd(slot)}
          style={[styles.emptySlot, { backgroundColor: color.surface }]}>
          <Text style={[styles.name, { color: color.text }]}>{t(`food.slot.${slot}`)}</Text>
          <Text style={[styles.amount, styles.grow, { color: color.muted }]}>{t('food.meals.emptySlot')}</Text>
          <Icon name="plus.circle.fill" tone="accent" />
        </Pressable>
      ))}
    </View>
  );
}

/** "Same as yesterday" (K-407): one tap logs yesterday's meal again, as it was. */
export function RepeatOffers({ offers, onRepeat, busy, title }: { offers: Meal[]; onRepeat: (meal: Meal) => void; busy: boolean; title: string }) {
  const { color } = useTheme();
  return (
    <View testID="repeat" style={styles.meal}>
      <Text accessibilityRole="header" style={[styles.slot, { color: color.text }]}>
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: color.surface }]}>
        {offers.map((meal, index) => {
          const slot = t(`food.slot.${meal.slot}`);
          return (
            <Pressable
              key={meal.id}
              accessibilityRole="button"
              accessibilityLabel={t('food.repeat.spoken', { slot, items: spokenItems(meal) })}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => onRepeat(meal)}
              style={styles.item}>
              {index > 0 && <View style={[styles.line, { backgroundColor: color.line }]} />}
              <View style={styles.what}>
                <Text style={[styles.amount, { color: color.muted }]}>{slot}</Text>
                <Text style={[styles.name, { color: color.text }]}>
                  {meal.items.map((item) => item.name).join(' · ')}
                </Text>
              </View>
              <Text style={[styles.kcal, { color: color.text }]}>{mealKcal(meal)}</Text>
              <Icon name="plus.circle.fill" tone="accent" />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space.lg },
  meal: { gap: tokens.space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  slot: { flex: 1, fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  mealKcal: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
  card: { borderRadius: tokens.radius.card, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, minHeight: tokens.size.touch },
  line: { position: 'absolute', top: 0, left: tokens.space.md, right: 0, height: StyleSheet.hairlineWidth },
  what: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: tokens.type.body },
  amount: { fontSize: tokens.type.bodySmall },
  kcal: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
  empty: { fontSize: tokens.type.body },
  grow: { flex: 1 },
  emptySlot: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderRadius: tokens.radius.card, padding: tokens.space.md, minHeight: tokens.size.touch },
});
