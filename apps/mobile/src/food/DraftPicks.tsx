import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { HandedMeal } from './handoff';

type Schemas = components['schemas'];

/**
 * A meal draft's foods to confirm (K-504, K-509; a photo's, K-408): each item as `describe` says it, with the database's
 * foods for it — a sure match picked, an unsure one asks — and nothing of what they hold (U1: the meal screen estimates
 * from the database). One tap each, then `onLog` with the picks. A food the database has nothing for is left to the meal
 * screen (by name); `matched` tells the caller whether anything can be handed over at all.
 */
export function DraftPicks({ draft, describe, onLog }: { draft: Schemas['MealDraft']; describe: (item: Schemas['MealDraftItem']) => string; onLog: (items: HandedMeal) => void }) {
  const { color } = useTheme();
  const [picks, setPicks] = useState<(string | null)[]>(() => draft.items.map((item) => (item.confident ? (item.candidates[0]?.id ?? null) : null)));
  const matched = draft.items.flatMap((item, i) => (item.candidates.length > 0 ? [{ item, pick: item.candidates.find((food) => food.id === picks[i]) }] : []));
  const ready = matched.length > 0 && matched.every(({ pick }) => pick !== undefined);
  const log = () => {
    if (!ready) return;
    onLog(matched.flatMap(({ item, pick }) => (pick === undefined ? [] : [{ foodId: pick.id, name: pick.name, quantity: item.amount.quantity, unit: item.amount.unit }])));
  };
  return (
    <View style={styles.list}>
      {draft.items.map((item, i) => (
        <View key={i} style={styles.list}>
          <Text style={[styles.text, { color: color.text }]}>{describe(item)}</Text>
          <Pick item={item} picked={picks[i]} onPick={(id) => setPicks((before) => before.map((p, j) => (j === i ? id : p)))} />
        </View>
      ))}
      <Button label={t('coach.meal.log')} size="sm" disabled={!ready} onPress={log} />
    </View>
  );
}

/** Whether any of the draft's foods has a match in the database (none: the meal screen, by name). */
export const anyMatched = (draft: Schemas['MealDraft']) => draft.items.some((item) => item.candidates.length > 0);

/** The database's foods for one item: nothing found says so; an unsure match asks which. */
function Pick({ item, picked, onPick }: { item: Schemas['MealDraftItem']; picked: string | null; onPick: (id: string) => void }) {
  const { color } = useTheme();
  if (item.candidates.length === 0) return <Text style={[styles.small, { color: color.muted }]}>{t('coach.meal.noMatch', { food: item.food })}</Text>;
  return (
    <>
      {!item.confident && <Text style={[styles.small, { color: color.muted }]}>{t('coach.meal.pick')}</Text>}
      <View style={styles.picks}>
        {item.candidates.map((food) => (
          <Chip key={food.id} label={food.name} selected={picked === food.id} onPress={() => onPick(food.id)} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space.sm },
  picks: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
