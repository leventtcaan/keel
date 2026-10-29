import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Segmented } from '@/components/Segmented';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { localDay } from '@/today/today';

import { FoodList, type FoodRowData } from './FoodList';
import { foodDetail, suggestionDetail } from './foodRows';
import { foodParams } from './params';
import { kcalText, mid } from './single';
import { dayLabel } from './dayLabel';

type Schemas = components['schemas'];
type Tab = 'recent' | 'frequent' | 'favorites' | 'again';
const TABS: Tab[] = ['recent', 'frequent', 'favorites', 'again'];

type Props = {
  recent: Schemas['Suggestion'][];
  frequent: Schemas['Suggestion'][];
  favorites: Schemas['Food'][];
  /** Past meals to log again, the freshest first (one of each kind), as the day reads gave them. */
  again: Schemas['Meal'][];
  /** A food eaten before, opened as the portion step in the amount it was had in. */
  onSuggestion: (suggestion: Schemas['Suggestion']) => void;
  /** The same logged right away, in that amount. */
  onLogSuggestion: (suggestion: Schemas['Suggestion']) => void;
  onFood: (food: Schemas['Food']) => void;
  onLogFood: (food: Schemas['Food']) => void;
  /** A past meal logged again, in one tap, into the day and slot being logged. */
  onLogAgain: (meal: Schemas['Meal']) => void;
  /** The date of a meal, as the phone writes a day ("Mon, Oct 26"). */
  today: string;
};

/**
 * What can be logged without typing (K-1063, ADR-090 Ek 3): the foods eaten lately, the ones eaten most, the starred ones, and past
 * meals to log again — one list at a time under four words. Each food opens the portion step on a tap and is logged as it stands
 * by the plus; each past meal is one plus. A user with nothing yet is offered nothing (the first day).
 */
export function FoodBrowse({ recent, frequent, favorites, again, onSuggestion, onLogSuggestion, onFood, onLogFood, onLogAgain, today }: Props) {
  const { color } = useTheme();
  const nothing = recent.length === 0 && frequent.length === 0 && favorites.length === 0 && again.length === 0;
  const first: Tab = recent.length > 0 ? 'recent' : frequent.length > 0 ? 'frequent' : favorites.length > 0 ? 'favorites' : 'again';
  const [chosen, setChosen] = useState<Tab | null>(null);
  if (nothing) return null;
  const tab = chosen ?? first;

  const suggestionRows = (list: Schemas['Suggestion'][], prefix: string): FoodRowData[] =>
    list.slice(0, foodParams.quickRecentMax).map((s) => ({
      key: `${prefix}-${s.foodId}`,
      testID: `${prefix}-${s.foodId}`,
      name: s.name,
      detail: suggestionDetail(s),
      onOpen: () => onSuggestion(s),
      onLog: () => onLogSuggestion(s),
      openLabel: t('meal.search.add', { name: s.name }),
      logLabel: t('food.suggestions.log', { name: s.name }),
    }));
  const favoriteRows: FoodRowData[] = favorites.map((food) => ({
    key: `fav-${food.id}`,
    testID: `fav-${food.id}`,
    name: food.name,
    detail: foodDetail(food),
    ...(food.avoided === true ? { marker: t('meal.search.avoided') } : {}),
    onOpen: () => onFood(food),
    onLog: () => onLogFood(food),
    openLabel: t('meal.search.add', { name: food.name }),
    logLabel: t('meal.search.logNow', { name: food.name }),
  }));
  const againRows: FoodRowData[] = again.map((meal) => ({
    key: `again-${meal.id}`,
    testID: `again-${meal.id}`,
    name: meal.items.map((item) => item.name).join(' · '),
    detail: t('meal.browse.againLine', { slot: t(`food.slot.${meal.slot}`), day: dayLabel(localDay(new Date(meal.eatenAt)), today), kcal: kcalText(mid(meal.kcal)) }),
    // A past meal has no portion step: one tap on the row logs it again as it was.
    onOpen: () => onLogAgain(meal),
    logOnOpen: true,
    openLabel: t('meal.browse.againSpoken', { slot: t(`food.slot.${meal.slot}`), items: meal.items.map((item) => item.name).join('; ') }),
  }));
  const rows = tab === 'recent' ? suggestionRows(recent, 'recent') : tab === 'frequent' ? suggestionRows(frequent, 'frequent') : tab === 'favorites' ? favoriteRows : againRows;

  const listId = `browse-${tab}`;
  const body =
    rows.length === 0 ? (
      <Text style={[styles.empty, { color: color.muted }]}>{t(`meal.browse.empty.${tab}`)}</Text>
    ) : (
      <FoodList testID={listId} rows={rows} />
    );
  return (
    <View style={styles.part} testID="browse">
      <Segmented testID="browse-tabs" value={tab} onChange={setChosen} options={TABS.map((value) => ({ value, label: t(`meal.browse.${value}`) }))} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  part: { gap: tokens.space.md },
  empty: { fontSize: tokens.type.bodySmall },
});
