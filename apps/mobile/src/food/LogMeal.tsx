import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { FormScroll } from '@/components/FormScroll';
import { KeyboardFrame } from '@/components/KeyboardFrame';
import { ProblemText, useProblem } from '@/components/ProblemText';
import { UndoBanner } from '@/components/UndoBanner';
import { has, t } from '@/copy';
import { type Save, useSavedChanges, useSavedSignal } from '@/saved/saved';
import { useAppServices } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load, localDay } from '@/today/today';

import { amountPhrase } from './amountText';
import { dayLabel, eatenAtFor } from './dayLabel';
import { type DraftItem, type KnownFoods, type KnownRecipes, PORTION, QUICK, addFood, addQuick, addRecipe, recipeItemId, requestsOf } from './draft';
import { FoodHome } from './FoodHome';
import { FoodPicker } from './FoodPicker';
import { foodRow, suggestionRow } from './foodRows';
import { numbersOf } from './ItemRows';
import { MealPicker } from './MealPicker';
import { MealTray } from './MealTray';
import { defaultSlot } from './meals';
import { foodParams } from './params';
import { PortionSheet } from './PortionSheet';
import { addedFood } from './savedMeal';
import { ALL_SLOTS, likelySlot } from './slots';
import { kcalText, mid } from './single';
import { type Added, logsToRepeat, slotKcal, slotLogs, trayOf, type SlotLog, type TrayItem } from './tray';
import { useDayMeals } from './useDayMeals';
import { useFoodExtras, useUsualFoods } from './useFoodExtras';
import { useRecentFoods } from './useMealStart';

type Schemas = components['schemas'];
type Slot = Schemas['MealSlot'];
type Shown = { name: string; amount: string | null; kcal: number | null };

type Props = {
  /** The day foods are logged into (today by default); a past one is given the slot's usual hour. */
  day?: string;
  /** The meal the screen opens on; else the user's own pattern, else the clock. */
  slotParam?: string;
};

/**
 * Logging food (K-407, K-1063; Evre 7 A, ADR-090 Ek 6): which meal (four pills with their calories so far, the right one chosen from the
 * clock and the user's own pattern), a large search with the barcode in it, a small tray of what the meal already holds on the day with the
 * way to the whole day, and — until something is typed — one list of what the user eats: a past meal as one row, Favorites, the foods
 * usually had at this meal, Recent. Every row has a plus that logs the portion shown in one tap and a heart; a row opens the portion step,
 * a sheet with the numbers, the portions, the quantity and the one button. Logging does not close the screen: the tray grows, a light
 * "Added · Undo" stands above the foot, and Done leaves. Saved on the phone first and sent when it can be (K-304). A correction is another
 * screen (MealItems).
 */
export function LogMeal({ day, slotParam }: Props) {
  const { api, queue, takeBack, report } = useAppServices();
  const changed = useSavedSignal();
  const changes = useSavedChanges();
  const { color } = useTheme();
  const [now] = useState(() => new Date());
  const today = localDay(now);
  const targetDay = day ?? today;

  const extras = useFoodExtras(true, today);
  const [picked, setPicked] = useState<Slot | null>(null);
  const slot: Slot = picked ?? (slotParam !== undefined && (ALL_SLOTS as string[]).includes(slotParam) ? (slotParam as Slot) : likelySlot(extras.history, now, defaultSlot(now)));
  const usual = useUsualFoods(true, slot);
  const recentRead = useRecentFoods(true, slot);
  const { rows, reload } = useDayMeals(targetDay, true);
  // What this screen put in, by the meal's clientId: the names the tray shows for a meal not sent yet.
  const [trayAdds, setTrayAdds] = useState<Added>(() => new Map());

  // The tray reads again after every save and every one taken back, and when a correction made over this screen is saved.
  useEffect(() => {
    void reload();
  }, [changes, reload]);

  // The portion step: one item at a time. Its food is known (the portions), its estimate follows it (the range of Details).
  const [items, setItems] = useState<DraftItem[]>([]);
  const [known, setKnown] = useState<KnownFoods>(() => new Map());
  const [recipes, setRecipes] = useState<Schemas['Recipe'][] | null>(null);
  const [estimate, setEstimate] = useState<{ key: string; value: Schemas['FoodEstimate'] | null } | null>(null);
  const knownRecipes: KnownRecipes | undefined = recipes === null ? undefined : new Map(recipes.map((recipe) => [recipeItemId(recipe), recipe]));
  const requests = requestsOf(items, known, knownRecipes);
  const key = requests === null ? null : JSON.stringify(requests);
  useEffect(() => {
    if (key === null) return;
    let live = true;
    void load(() => api.POST('/v1/food-estimates', { body: { items: JSON.parse(key) as Schemas['ItemRequest'][] } })).then((answer) => {
      if (live) setEstimate({ key, value: answer.state === 'ready' ? answer.value : null });
    });
    return () => {
      live = false;
    };
  }, [api, key]);
  const shownEstimate = estimate !== null && estimate.key === key ? estimate.value : null;
  const waiting = key !== null && (estimate === null || estimate.key !== key);

  const readRecipes = async (): Promise<Schemas['Recipe'][]> => {
    if (recipes !== null) return recipes;
    const answer = await load(() => api.GET('/v1/recipes')).catch(() => null);
    if (answer === null || answer.state !== 'ready') return [];
    setRecipes(answer.value);
    return answer.value;
  };

  const open = (food: Schemas['Food'], amount?: Pick<Schemas['Amount'], 'quantity' | 'unit'>) => {
    setItems(addFood([], food, amount));
    setKnown((before) => new Map(before).set(food.id, food));
  };
  /** A food eaten before, opened in the amount it was had in: its food is read for the portions; unreadable, the unit it was had in. */
  const openEaten = async (eaten: Schemas['Suggestion']) => {
    const read = await load(() => api.GET('/v1/foods/{id}', { params: { path: { id: eaten.foodId } } })).catch(() => null);
    if (read !== null && read.state === 'ready') return open(read.value, eaten.amount);
    setItems([
      {
        foodId: eaten.foodId,
        name: eaten.name,
        units: eaten.amount.unit === PORTION ? [PORTION] : [eaten.amount.unit, 'g'],
        quantity: String(eaten.amount.quantity),
        unit: eaten.amount.unit,
        weighed: false,
      },
    ]);
  };

  // The light confirmation: one at a time, the newest replaces the one before.
  const [toast, setToast] = useState<{ id: number; save: Save } | null>(null);
  const toastCount = useRef(0);
  // Foods logged a moment ago, by id: their plus is a check for a while.
  const [marks, setMarks] = useState<ReadonlySet<string>>(() => new Set());
  const [logProblem, setLogProblem, logOccurrence] = useProblem();
  const working = useRef(false); // two taps in the same moment must not log twice
  // The meals being logged and their clientIds: a try that said it failed may have been kept all the same, so trying that meal again is the
  // same clientId (kept once); another meal is a new one.
  const attempts = useRef(new Map<string, string>());

  const mark = (ids: string[]) => {
    setMarks((before) => new Set([...before, ...ids]));
    setTimeout(() => setMarks((before) => new Set([...before].filter((id) => !ids.includes(id)))), foodParams.addedMarkMs);
  };

  /**
   * Keeps meals on the phone (the slot being logged, the day being logged) and says so in the tray and the toast: one meal for a food, one
   * per log for a whole past meal, taken back together by one Undo. True when all were kept.
   */
  const keep = async (what: string, entries: { body: Pick<Schemas['NewMeal'], 'items' | 'repeatOf'>; shown: Shown[] }[], foodIds: string[], detail?: string): Promise<boolean> => {
    if (working.current) return false;
    working.current = true;
    setLogProblem(null);
    const kept: { clientId: string; shown: Shown[] }[] = [];
    const keys: string[] = [];
    try {
      for (const [index, entry] of entries.entries()) {
        const key = `${slot}:${what}:${index}`;
        keys.push(key);
        const clientId = attempts.current.get(key) ?? newClientId();
        attempts.current.set(key, clientId);
        await queue.record({ kind: 'meal', body: { clientId, eatenAt: eatenAtFor(targetDay, slot, new Date()), slot, ...entry.body } });
        kept.push({ clientId, shown: entry.shown });
      }
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setLogProblem(t('food.repeat.failed'));
      working.current = false;
      return false;
    }
    keys.forEach((key) => attempts.current.delete(key));
    setTrayAdds((before) => new Map([...before, ...kept.map(({ clientId, shown }): [string, Shown[]] => [clientId, shown])]));
    toastCount.current += 1;
    const names = kept.flatMap(({ shown }) => shown.map((one) => one.name)).join(', ');
    setToast({ id: toastCount.current, save: addedFood({ clientIds: kept.map(({ clientId }) => clientId), detail: detail ?? names }, { api, takeBack, report }) });
    mark(foodIds);
    changed();
    working.current = false;
    return true;
  };

  const logFood = (food: Schemas['Food']) => {
    const amount = food.defaultAmount ?? (food.portions?.[0] === undefined ? { quantity: foodParams.defaultGrams, unit: 'g' } : { quantity: 1, unit: food.portions[0].unit });
    const row = foodRow(food);
    return keep(
      `food:${food.id}`,
      [{ body: { items: [{ foodId: food.id, amount: { quantity: amount.quantity, unit: amount.unit, certainty: 'ESTIMATED' } }] }, shown: [{ name: food.name, amount: amountPhrase(amount), kcal: row.kcal }] }],
      [food.id],
    );
  };
  const logEaten = (eaten: Schemas['Suggestion']) =>
    keep(`food:${eaten.foodId}`, [{ body: { items: [{ foodId: eaten.foodId, amount: eaten.amount }] }, shown: [{ name: eaten.name, amount: amountPhrase(eaten.amount), kcal: suggestionRow(eaten).kcal }] }], [eaten.foodId]);
  /** A whole past meal of this slot again: one record per log of it, kept together, taken back together. */
  const logAgain = (log: SlotLog) =>
    keep(
      `again:${log.day}`,
      log.meals.map((meal) => ({
        body: { repeatOf: meal.id },
        shown: meal.items.map((one) => ({ name: one.name, amount: one.foodId === QUICK ? null : amountPhrase(one.amount), kcal: mid(one.kcal) })),
      })),
      log.items.map((one) => one.foodId),
      log.items.map((one) => one.name).join(', '),
    );

  const item = items[0];
  const submit = async () => {
    if (item === undefined || requests === null) return;
    const numbers = numbersOf(item, shownEstimate?.items[0], undefined, waiting);
    const amount = item.quick === undefined ? (requests[0]?.amount === undefined ? null : amountPhrase(requests[0].amount)) : null;
    const kept = await keep(`item:${JSON.stringify(requests)}`, [{ body: { items: requests }, shown: [{ name: item.name, amount, kcal: numbers?.kcal ?? null }] }], [item.foodId]);
    if (kept) setItems([]);
  };

  const undo = async () => {
    // A save may have no Undo (the saved banner's `undo` is optional): then there is nothing to take back.
    const takeBack = toast?.save.undo;
    if (toast === null || takeBack === undefined) return;
    const result = await takeBack().catch(() => ({ done: false as const, message: t('undoBanner.failed'), again: true }));
    if (result.done) {
      setMarks(new Set());
      changed();
      return;
    }
    Alert.alert(result.message);
  };

  const slotName = t(`food.slot.${slot}`);
  const kcalBySlot = slotKcal(rows ?? [], trayAdds);
  const tray = trayOf(rows ?? [], slot, trayAdds);
  const again = tray.length === 0 && rows !== null ? logsToRepeat(slotLogs(extras.history), slot, targetDay, foodParams.logAgainRowsMax) : [];
  // Recent is the meal's own: what was last had in this slot, not what was had at other hours.
  const slotFoods = new Set(extras.history.filter((meal) => meal.slot === slot).flatMap((meal) => meal.items.map((one) => one.foodId)));
  const recent = recentRead.filter((one) => slotFoods.has(one.foodId));

  const editItem = (one: TrayItem) => {
    if (one.meal === undefined || one.index === undefined) return;
    router.push({ pathname: '/meal', params: { edit: one.meal.id, day: targetDay, item: String(one.index) } });
  };
  const viewDay = () => router.dismissTo({ pathname: '/food', params: targetDay === today ? {} : { day: targetDay } });

  const asked = shownEstimate?.question;
  const question = item !== undefined && asked !== undefined && has(asked.copyKey) ? t('meal.estimate.question', { name: item.name, question: t(asked.copyKey) }) : null;
  const canFavorite = item !== undefined && item.quick === undefined && item.unit !== PORTION;
  const total = kcalBySlot[slot];

  // Built outside the JSX children (the raw-text guard reads them).
  const sheet =
    item === undefined ? null : (
      <PortionSheet
        item={item}
        index={0}
        known={known}
        {...(knownRecipes === undefined ? {} : { recipes: knownRecipes })}
        {...(shownEstimate?.items[0] === undefined ? {} : { estimate: shownEstimate.items[0] })}
        waiting={waiting}
        slotName={slotName}
        mode="add"
        question={question}
        {...(canFavorite
          ? { favorite: { on: extras.favoriteIds.has(item.foodId), onToggle: () => void extras.setFavorite(item.foodId, !extras.favoriteIds.has(item.foodId)) } }
          : {})}
        busy={false}
        blocked={requests === null}
        onChange={(part) => setItems((before) => before.map((one, i) => (i === 0 ? { ...one, ...part } : one)))}
        onSubmit={() => void submit()}
        onClose={() => setItems([])}
      />
    );
  return (
    <>
      <KeyboardFrame>
      <View style={styles.fill}>
        <FormScroll contentContainerStyle={styles.body}>
          <MealPicker value={slot} onChange={setPicked} kcal={kcalBySlot} />
          <FoodPicker
            full={false}
            onFood={(food) => open(food)}
            onLogNow={(food) => void logFood(food)}
            onQuickAdd={() => setItems(addQuick([], { kcal: '', protein: '', carbs: '', fat: '' }))}
            recipes={readRecipes}
            onRecipe={(recipe) => setItems(addRecipe([], recipe))}
            favorites={extras.favoriteIds}
            onFavorite={(foodId, on) => void extras.setFavorite(foodId, on)}
            added={marks}
            belowSearch={
              <MealTray
                title={t('meal.tray.title', { slot: slotName, day: dayLabel(targetDay, today) })}
                items={tray}
                onEdit={editItem}
                onViewDay={viewDay}
              />
            }
            idle={
              <FoodHome
                slot={slot}
                favorites={extras.favorites}
                favoriteIds={extras.favoriteIds}
                usual={usual}
                recent={recent}
                again={again}
                today={today}
                added={marks}
                onOpenSuggestion={(eaten) => void openEaten(eaten)}
                onLogSuggestion={(eaten) => void logEaten(eaten)}
                onOpenFood={(food) => open(food)}
                onLogFood={(food) => void logFood(food)}
                onLogAgain={(log) => void logAgain(log)}
                onFavorite={(foodId, on) => void extras.setFavorite(foodId, on)}
              />
            }
          />
          {logProblem !== null && (
            <ProblemText occurrence={logOccurrence} style={{ color: color.text, fontSize: tokens.type.body }}>
              {logProblem}
            </ProblemText>
          )}
        </FormScroll>
        {toast === null ? null : (
          <UndoBanner
            key={toast.id}
            inline
            lead={toast.save.lead}
            detail={toast.save.detail}
            onUndo={() => void undo()}
            onDismiss={() => setToast((now) => (now !== null && now.id === toast.id ? null : now))}
          />
        )}
        {total === undefined || total <= 0 ? null : (
          <View style={styles.dock}>
            <Button label={t('meal.doneKcal', { kcal: kcalText(total) })} onPress={() => router.back()} />
          </View>
        )}
      </View>
      </KeyboardFrame>
      {sheet}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, gap: tokens.space.md },
  dock: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
});
