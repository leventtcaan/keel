import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { PORTION } from './draft';
import { dayLabel } from './dayLabel';
import { FoodList, type FoodRowData } from './FoodList';
import { foodRow, suggestionRow } from './foodRows';
import { foodParams } from './params';
import { SectionHeader } from './SectionHeader';
import { kcalText } from './single';
import type { SlotLog } from './tray';

type Schemas = components['schemas'];

type Props = {
  slot: Schemas['MealSlot'];
  favorites: Schemas['Food'][];
  favoriteIds: ReadonlySet<string>;
  /** The foods usually had at this meal (the server filters by meal), most often first. */
  usual: Schemas['Suggestion'][];
  /** The foods eaten lately at this meal, freshest first. */
  recent: Schemas['Suggestion'][];
  /** The past meals of this slot to log again, as one row each; empty when the meal already has something today. */
  again: SlotLog[];
  /** Today, to say "yesterday". */
  today: string;
  /** Foods logged a moment ago, by id. */
  added: ReadonlySet<string>;
  onOpenSuggestion: (suggestion: Schemas['Suggestion']) => void;
  onLogSuggestion: (suggestion: Schemas['Suggestion']) => void;
  onOpenFood: (food: Schemas['Food']) => void;
  onLogFood: (food: Schemas['Food']) => void;
  onLogAgain: (log: SlotLog) => void;
  onFavorite: (foodId: string, on: boolean) => void;
};

/**
 * What can be logged without typing (Evre 7 A, ADR-090 Ek 6): one list with sections, in the order a person reaches for them. A whole past
 * meal first, as one row ("Same as yesterday's breakfast"); the hearted foods; the foods usually had at this meal; the recent ones — each
 * food once, in the highest section it belongs to. Every row has the same look: a plus logs the portion shown right away, the row opens the
 * portion step, the heart keeps the food. A user with nothing yet is offered nothing (the first day).
 */
export function FoodHome({ slot, favorites, favoriteIds, usual, recent, again, today, added, onOpenSuggestion, onLogSuggestion, onOpenFood, onLogFood, onLogAgain, onFavorite }: Props) {
  const { color } = useTheme();
  const [allFavorites, setAllFavorites] = useState(false);
  const [moreRecent, setMoreRecent] = useState(false);
  const slotName = t(`food.slot.${slot}`).toLowerCase();

  const taken = new Set(favorites.map((food) => food.id));
  const usualShown = usual.filter((one) => !taken.has(one.foodId)).slice(0, foodParams.browseUsualMax);
  usualShown.forEach((one) => taken.add(one.foodId));
  const recentAll = recent.filter((one) => !taken.has(one.foodId));
  const recentShown = recentAll.slice(0, moreRecent ? foodParams.quickRecentMax : foodParams.browseRecentMax);

  const hearted = (foodId: string, unit: string) => (unit === PORTION ? {} : { favorite: { on: favoriteIds.has(foodId), onToggle: () => onFavorite(foodId, !favoriteIds.has(foodId)) } });
  const suggestionRows = (list: Schemas['Suggestion'][], prefix: string): FoodRowData[] =>
    list.map((one) => {
      const row = suggestionRow(one);
      return {
        key: `${prefix}-${one.foodId}`,
        testID: `${prefix}-${one.foodId}`,
        name: one.name,
        sub: row.sub,
        kcal: row.kcal,
        macros: row.macros,
        onOpen: () => onOpenSuggestion(one),
        onLog: () => onLogSuggestion(one),
        openLabel: t('meal.search.add', { name: one.name }),
        logLabel: t('food.suggestions.log', { name: one.name }),
        ...hearted(one.foodId, one.amount.unit),
        ...(added.has(one.foodId) ? { added: true } : {}),
      };
    });
  const shownFavorites = allFavorites ? favorites : favorites.slice(0, foodParams.browseFavoritesMax);
  const favoriteRows: FoodRowData[] = shownFavorites.map((food) => {
    const row = foodRow(food);
    return {
      key: `fav-${food.id}`,
      testID: `fav-${food.id}`,
      name: food.name,
      sub: row.sub,
      kcal: row.kcal,
      macros: row.macros,
      ...(food.avoided === true ? { marker: t('meal.search.avoided') } : {}),
      onOpen: () => onOpenFood(food),
      onLog: () => onLogFood(food),
      openLabel: t('meal.search.add', { name: food.name }),
      logLabel: t('meal.search.logNow', { name: food.name }),
      favorite: { on: favoriteIds.has(food.id), onToggle: () => onFavorite(food.id, !favoriteIds.has(food.id)) },
      ...(added.has(food.id) ? { added: true } : {}),
    };
  });

  const nothing = favorites.length === 0 && usualShown.length === 0 && recentAll.length === 0 && again.length === 0;
  if (nothing) return null;

  // Built outside the JSX children (the raw-text guard reads them).
  const againBlock =
    again.length === 0 ? null : (
      <View testID="again" style={styles.group}>
        {again.map((log) => (
          <AgainRow key={`${log.day}-${log.slot}`} log={log} today={today} slotName={slotName} onLog={() => onLogAgain(log)} />
        ))}
      </View>
    );
  const showAll =
    favorites.length > foodParams.browseFavoritesMax && !allFavorites
      ? { action: { label: t('meal.home.showAll', { count: favorites.length }), onPress: () => setAllFavorites(true) } }
      : {};
  const favoritesBody =
    favoriteRows.length > 0 ? (
      <FoodList rows={favoriteRows} testID="browse-favorites" />
    ) : (
      <View style={[styles.hint, { backgroundColor: color.surface }]} testID="favorites-empty">
        <Icon name="heart" size="small" tone="muted" />
        <Text style={[styles.hintText, { color: color.muted }]}>{t('meal.home.favoritesEmpty')}</Text>
      </View>
    );
  const usualBlock = usualShown.length === 0 ? null : <FoodList title={t('meal.home.usual', { slot: slotName })} rows={suggestionRows(usualShown, 'usual')} testID="browse-usual" />;
  const moreRecentAction = recentAll.length > recentShown.length ? { action: { label: t('meal.home.showMore'), onPress: () => setMoreRecent(true) } } : {};
  const recentBlock =
    recentShown.length === 0 ? null : (
      <View style={styles.group}>
        <SectionHeader title={t('meal.home.recent')} {...moreRecentAction} />
        <FoodList rows={suggestionRows(recentShown, 'recent')} testID="browse-recent" />
      </View>
    );

  return (
    <View style={styles.part} testID="browse">
      {againBlock}
      <View testID="favorites" style={styles.group}>
        <SectionHeader title={t('meal.home.favorites')} {...showAll} />
        {favoritesBody}
      </View>
      {usualBlock}
      {recentBlock}
    </View>
  );
}

/** A whole past meal of this slot as one row: its foods, its calories as one number, a plus; the row itself logs it. */
function AgainRow({ log, today, slotName, onLog }: { log: SlotLog; today: string; slotName: string; onLog: () => void }) {
  const { color } = useTheme();
  const yesterday = dayLabel(log.day, today) === t('food.day.yesterday');
  const title = yesterday ? t('meal.again.yesterday', { slot: slotName }) : t('meal.again.other', { slot: slotName, day: dayLabel(log.day, today) });
  const items = log.items.map((item) => item.name).join(' · ');
  return (
    <Pressable
      testID={`again-${log.day}`}
      accessibilityRole="button"
      accessibilityLabel={t('meal.again.spoken', { slot: slotName, items: log.items.map((item) => item.name).join('; ') })}
      onPress={onLog}
      style={({ pressed }) => [styles.again, { backgroundColor: color.surface }, pressed && styles.dim]}>
      <View style={styles.againTexts}>
        <Text style={[styles.againTitle, { color: color.text }]}>
          {title}
        </Text>
        <Text style={[styles.againItems, { color: color.muted }]}>
          {items}
        </Text>
      </View>
      <Text style={[styles.againKcal, { color: color.text }]}>{kcalText(log.kcal)}</Text>
      <View testID={`again-${log.day}-log`}>
        <Icon name="plus.circle.fill" tone="accent" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  part: { gap: tokens.space.lg },
  group: { gap: tokens.space.xs },
  hint: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderRadius: tokens.radius.card, padding: tokens.space.md },
  hintText: { flex: 1, fontSize: tokens.type.bodySmall },
  again: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderRadius: tokens.radius.card, padding: tokens.space.md, minHeight: tokens.size.row },
  againTexts: { flex: 1, minWidth: 0, gap: tokens.space.xs },
  againTitle: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  againItems: { fontSize: tokens.type.bodySmall },
  againKcal: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold, fontVariant: ['tabular-nums'] },
  dim: { opacity: tokens.opacity.dim },
});
