import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormScroll } from '@/components/FormScroll';
import { KeyboardFrame } from '@/components/KeyboardFrame';
import { ModalClose } from '@/components/ModalClose';
import { ProblemText, useProblem } from '@/components/ProblemText';
import { ConsentText } from '@/consent/ConsentText';
import { grantConsent } from '@/consent/consents';
import { has, t } from '@/copy';
import { dayLabel, eatenAtFor } from '@/food/dayLabel';
import { type DraftItem, type KnownFoods, type KnownRecipes, PORTION, addFood, addQuick, addRecipe, draftOf, itemsHanded, recipeItemId, requestsOf } from '@/food/draft';
import { EstimateCard } from '@/food/EstimateCard';
import { FoodBrowse } from '@/food/FoodBrowse';
import { FoodPicker } from '@/food/FoodPicker';
import { clearMeal, handedFrom, peekMeal } from '@/food/handoff';
import { ItemRows } from '@/food/ItemRows';
import { changeMeal, deleteMeal, deletedMeal } from '@/food/mealActions';
import { defaultSlot } from '@/food/meals';
import { foodParams } from '@/food/params';
import { QuickAdds } from '@/food/QuickAdds';
import { savedMeal } from '@/food/savedMeal';
import { ALL_SLOTS, usedSlots } from '@/food/slots';
import { useFoodExtras } from '@/food/useFoodExtras';
import { useMealStart, useRecentFoods } from '@/food/useMealStart';
import { useSaved } from '@/saved/saved';
import { useAppServices } from '@/services/ServicesProvider';
import { askFirst } from '@/settings/askFirst';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load, localDay } from '@/today/today';

type Schemas = components['schemas'];
type Step = 'checking' | 'consent' | 'entry';
/** A meal being corrected: read from the server's day, or not there, or not readable (offline). */
type Original = { state: 'loading' } | { state: 'gone' } | { state: 'unreachable' } | { state: 'ready'; meal: Schemas['Meal'] };

/**
 * Logging food (K-407, K-1063; ADR-090): the slot, then foods found by name, by barcode or from what the user logs most — each opened
 * as the portion step with its natural portion chosen, a quantity a tap away, its numbers as single numbers — and, once there is
 * something to log, the meal's total and the one button. Saved on the phone first and sent when it can be (K-304); the estimate is only
 * a look, the server estimates again when the meal arrives. Health data: the consent first, and nothing typed is kept without it
 * (ADR-030 #25).
 *
 * `?day=<day>` logs into that day (a past one too: the meal is given the slot's usual hour); `?slot=` starts on a slot. A plus on a row
 * logs it as it stands in one tap and leaves.
 *
 * `?edit=<id>&day=<day>` corrects a logged meal where it stands (first class: I2 A0, one log in five was corrected): its amounts and
 * portions, an item out, the slot — saved with `PATCH /v1/meals/{id}`, so nothing is deleted and logged again, and a change the
 * server refuses leaves the meal as it was. `&item=<n>` opens on that item. Changing needs the server; offline it says so and
 * changes nothing. Deleting the meal offers Undo in the banner.
 */
export default function MealScreen() {
  const { api, queue, consents, forgetRecord, report, takeBack } = useAppServices();
  const saved = useSaved();
  const { edit, day, slot: slotParam, item: itemParam } = useLocalSearchParams<{ edit?: string; day?: string; slot?: string; item?: string }>();
  const today = localDay(new Date());
  // New meals go into the day asked for (today by default); a correction reads the day its meal is on.
  const targetDay = day ?? today;
  // A correction link without its day has nothing to find the meal in: not there, rather than an endless wait.
  const [original, setOriginal] = useState<Original | null>(() =>
    edit === undefined ? null : day === undefined ? { state: 'gone' } : { state: 'loading' },
  );
  const { color } = useTheme();
  const [step, setStep] = useState<Step>('checking');
  const [slot, setSlot] = useState<Schemas['MealSlot']>(() => (slotParam !== undefined && (ALL_SLOTS as string[]).includes(slotParam) ? (slotParam as Schemas['MealSlot']) : defaultSlot(new Date())));
  const [allSlots, setAllSlots] = useState(false);
  // A meal the coach read comes in with its foods and amounts (K-509); a correction reads its own meal instead.
  const [items, setItems] = useState<DraftItem[]>(() => (edit === undefined ? itemsHanded(peekMeal()) : []));
  const [fromCoach] = useState(() => edit === undefined && peekMeal() !== null);
  // A photo's grams are by eye (K-408, ADR-046): when the server asks for one, the screen says why.
  const [fromPhoto] = useState(() => fromCoach && handedFrom() === 'photo');
  useEffect(() => clearMeal(), []);
  const [known, setKnown] = useState<KnownFoods>(() => new Map());
  // The user's recipes (K-423), read at the first search (no search, no request); unreadable (offline) is none this
  // time — the foods alone are offered, and the next search asks again.
  const [recipes, setRecipes] = useState<Schemas['Recipe'][] | null>(null);
  // The estimate for a set of items (by key); `value` null: the server did not take them, or could not be asked.
  const [estimate, setEstimate] = useState<{ key: string; value: Schemas['FoodEstimate'] | null } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false); // two taps at once must not log twice
  const attempt = useRef<{ what: string; clientId: string } | null>(null);
  // A meal logged by one tap that the phone could not keep: said again each time (K-815).
  const [logProblem, setLogProblem, logOccurrence] = useProblem();

  useEffect(() => {
    // Not known (a failing keychain) is not given: the consent step, never an endless wait.
    void consents
      .granted('HEALTH_DATA')
      .catch(() => false)
      .then((granted) => setStep(granted ? 'entry' : 'consent'));
  }, [consents]);

  // Recipes by their item id, for the portion ceiling and a recipe gone since; undefined until read (left to the server).
  // A meal opened to correct reads them at once when it holds a recipe (below).
  const knownRecipes: KnownRecipes | undefined = recipes === null ? undefined : new Map(recipes.map((recipe) => [recipeItemId(recipe), recipe]));
  const readRecipes = async (): Promise<Schemas['Recipe'][]> => {
    if (recipes !== null) return recipes;
    const answer = await load(() => api.GET('/v1/recipes')).catch(() => null);
    if (answer === null || answer.state !== 'ready') return [];
    setRecipes(answer.value);
    return answer.value;
  };

  useEffect(() => {
    if (step !== 'entry' || edit === undefined || day === undefined) return;
    let live = true;
    void load(() => api.GET('/v1/meals', { params: { query: { day } } })).then((answer) => {
      if (!live) return;
      if (answer.state !== 'ready') return setOriginal({ state: 'unreachable' });
      const meal = answer.value.find((m) => m.id === edit);
      if (meal === undefined) return setOriginal({ state: 'gone' });
      const draft = draftOf(meal);
      setItems(draft.items);
      setSlot(draft.slot);
      setOriginal({ state: 'ready', meal });
      // A recipe in it: its ceiling, or that it is gone, is known before any search (K-423 review).
      if (draft.items.some((item) => item.unit === PORTION)) {
        void load(() => api.GET('/v1/recipes'))
          .then((read) => live && read.state === 'ready' && setRecipes(read.value))
          .catch(() => undefined);
      }
      // The foods of the items, for their portions: the chips and the numbers of the portion step (K-1063). One that cannot be read
      // keeps the unit it was logged in.
      const ids = [...new Set(draft.items.filter((item) => item.foodId !== 'quick' && item.unit !== PORTION).map((item) => item.foodId))];
      void Promise.all(ids.map((id) => load(() => api.GET('/v1/foods/{id}', { params: { path: { id } } })).catch(() => null))).then((reads) => {
        if (!live) return;
        const foods = reads.flatMap((read) => (read !== null && read.state === 'ready' ? [read.value] : []));
        setKnown((before) => new Map([...before, ...foods.map((food): [string, Schemas['Food']] => [food.id, food])]));
        setItems((before) =>
          before.map((item) => {
            const food = foods.find((candidate) => candidate.id === item.foodId);
            const portions = food?.portions ?? [];
            if (portions.length === 0) return item;
            const units = portions.map((portion) => portion.unit);
            return { ...item, portions, units: units.includes(item.unit) ? units : [item.unit, ...units] };
          }),
        );
      });
    });
    return () => {
      live = false;
    };
  }, [api, step, edit, day]);

  // The one-tap offers (K-980): for a new meal only, and only while nothing is being put together by hand.
  const quick = step === 'entry' && edit === undefined && !fromCoach;
  const start = useMealStart(quick);
  const recent = useRecentFoods(quick, slot);
  const extras = useFoodExtras(step === 'entry', today);

  const requests = requestsOf(items, known, knownRecipes);
  const key = requests === null ? null : JSON.stringify(requests);

  // The estimate follows the items; an answer for items since changed is dropped (the key is checked when shown).
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
  const shown = estimate !== null && estimate.key === key ? estimate.value : null;
  // A meal the coach read waits for the same check (K-509 review): its measure is the user's word, which may not be one of
  // the food's servings — saved unchecked, the server would refuse it later, after the user thought it logged. A correction needs no
  // such wait: the change is made in place by the server, which refuses what it cannot take and leaves the meal as it was.
  const unchecked = fromCoach && estimate !== null && estimate.key === key && estimate.value === null;
  const checked = !fromCoach || shown !== null;

  const allow = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await grantConsent(api, 'HEALTH_DATA');
      await consents.remember('HEALTH_DATA', 'GRANTED');
      setStep('entry');
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('meal.consent.failed'));
    } finally {
      setBusy(false);
    }
  };

  const addOwnRecipe = (recipe: Schemas['Recipe']) => setItems((before) => addRecipe(before, recipe));
  const add = (food: Schemas['Food'], amount?: Pick<Schemas['Amount'], 'quantity' | 'unit'>) => {
    setItems((before) => addFood(before, food, amount));
    setKnown((before) => new Map(before).set(food.id, food));
  };
  /** A food eaten before, opened in the amount it was had in: its food is read for the portions; unreadable, the unit it was had in. */
  const addEaten = async (eaten: Schemas['Suggestion']) => {
    const read = await load(() => api.GET('/v1/foods/{id}', { params: { path: { id: eaten.foodId } } })).catch(() => null);
    if (read !== null && read.state === 'ready') return add(read.value, eaten.amount);
    setItems((before) => [
      ...before,
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
  const change = (index: number, part: Partial<DraftItem>) => {
    setItems((before) => before.map((item, i) => (i === index ? { ...item, ...part } : item)));
    setProblem(null);
  };

  /** Keeps a meal made of one tap on the phone, then leaves with the app's banner (Undo) — "+", Meal, one tap. */
  const logAtOnce = async (what: string, body: Pick<Schemas['NewMeal'], 'items' | 'repeatOf'>, count: number) => {
    if (saving.current) return;
    saving.current = true;
    setLogProblem(null);
    // The meal being logged and its clientId: a try that said it failed may have been kept all the same, so trying that meal again is the
    // same clientId (kept once); another meal is a new one.
    const id = `${slot}:${what}`;
    if (attempt.current === null || attempt.current.what !== id) attempt.current = { what: id, clientId: newClientId() };
    const { clientId } = attempt.current;
    try {
      await queue.record({ kind: 'meal', body: { clientId, eatenAt: eatenAtFor(targetDay, slot, new Date()), slot, ...body } });
      router.back();
      // The lock stays on while the sheet goes: a second tap would keep a second meal.
      saved(savedMeal({ clientId, slot, items: count }, { api, takeBack, report }));
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setLogProblem(t('food.repeat.failed'));
      saving.current = false;
    }
  };
  const logFood = (food: Schemas['Food']) => {
    const amount = food.defaultAmount ?? (food.portions?.[0] === undefined ? { quantity: foodParams.defaultGrams, unit: 'g' } : { quantity: 1, unit: food.portions[0].unit });
    return logAtOnce(`food:${food.id}`, { items: [{ foodId: food.id, amount: { quantity: amount.quantity, unit: amount.unit, certainty: 'ESTIMATED' } }] }, 1);
  };
  const logEaten = (eaten: Schemas['Suggestion']) => logAtOnce(`food:${eaten.foodId}`, { items: [{ foodId: eaten.foodId, amount: eaten.amount }] }, 1);

  const save = async () => {
    if (saving.current || requests === null || !checked || (original !== null && original.state !== 'ready')) return;
    saving.current = true;
    setBusy(true);
    let closing = false;
    try {
      if (original !== null && original.state === 'ready') {
        // A correction: in place, one request. The server estimates the items again and answers the meal.
        const result = await changeMeal(api, original.meal.id, { items: requests, slot });
        if (result.state === 'done') router.back();
        else if (result.state === 'offline') setProblem(t('meal.edit.needsConnection'));
        else setProblem(t(result.state === 'gone' ? 'meal.edit.gone' : 'meal.saveFailed'));
        return;
      }
      const clientId = newClientId();
      await queue.record({ kind: 'meal', body: { clientId, eatenAt: eatenAtFor(targetDay, slot, new Date()), slot, items: requests } });
      router.back();
      // A new meal is confirmed by the app's one banner, with Undo (K-1044). The lock stays on while the sheet goes: a second tap would keep a second meal.
      closing = true;
      saved(savedMeal({ clientId, slot, items: requests.length }, { api, takeBack, report }));
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('meal.saveFailed'));
    } finally {
      if (!closing) {
        saving.current = false;
        setBusy(false);
      }
    }
  };

  const remove = async () => {
    if (saving.current || original === null || original.state !== 'ready') return;
    saving.current = true;
    setBusy(true);
    try {
      const result = await deleteMeal({ api, queue, forgetRecord, report }, original.meal);
      if (result === 'done') {
        router.back();
        saved(deletedMeal({ api, queue, forgetRecord, report }, original.meal, () => undefined));
      } else setProblem(t(result === 'offline' ? 'meal.edit.needsConnection' : 'food.deleted.failed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  // A full meal takes no more: the server would refuse it, and the queue would lose it.
  const full = items.length >= foodParams.itemsMax;
  // Named: with several items the question says which one it is about.
  const asked = shown?.question;
  const askedName = shown?.items.find((item) => item.foodId === asked?.foodId)?.name;
  const question =
    asked !== undefined && askedName !== undefined && has(asked.copyKey)
      ? t('meal.estimate.question', { name: askedName, question: t(asked.copyKey) })
      : null;

  const consentStep =
    step === 'consent' ? (
      <View style={styles.part}>
        <Text style={[styles.heading, { color: color.text }]}>{t('consent.health_data.title')}</Text>
        <ConsentText kind="HEALTH_DATA" />
        {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
        <Button label={t('meal.consent.allow')} onPress={() => void allow()} disabled={busy} />
        <Button label={t('meal.consent.notNow')} variant="secondary" onPress={() => router.back()} disabled={busy} />
      </View>
    ) : null;

  // A meal to correct that is not there, or not readable: nothing to change, nothing to save.
  const originalNote =
    step === 'entry' && original !== null && (original.state === 'gone' || original.state === 'unreachable') ? (
      <Text style={[styles.text, { color: color.text }]}>{t(original.state === 'gone' ? 'meal.edit.gone' : 'meal.edit.needsConnection')}</Text>
    ) : null;
  // The question is the system's alert (ADR-087 #1): on the screen wherever the list is scrolled, with Keep it as its way out.
  const askToDelete = () =>
    askFirst({
      title: t('meal.edit.confirmTitle'),
      body: t('meal.edit.confirmBody'),
      confirmLabel: t('meal.edit.confirm'),
      keepLabel: t('meal.edit.keep'),
      onConfirm: () => void remove(),
    });
  const deleting =
    original !== null && original.state === 'ready' ? (
      <Button label={t('meal.edit.delete')} variant="destructive" onPress={askToDelete} disabled={busy} />
    ) : null;

  // The slots of the user's day (K-1063): the ones they log into, and one tap for the others.
  const slotsOfDay = usedSlots([...extras.usedSlots].map((s) => ({ slot: s })), [slot]);
  const slotsShown = allSlots || original !== null ? ALL_SLOTS : slotsOfDay;
  // What the items came to, in order: the server's answer for them, else (a correction not yet changed) the meal as it was logged.
  const estimatedItems = shown?.items ?? (original !== null && original.state === 'ready' ? original.meal.items : undefined);

  // The meal's total from two items on; one item's numbers are its own (the portion step), and the server's question still shows.
  const totalCard =
    shown === null ? null : items.length > 1 ? (
      <EstimateCard estimate={shown} question={question} />
    ) : question === null ? null : (
      <Text style={[styles.text, { color: color.textSecondary }]}>{question}</Text>
    );
  const logLine = logProblem === null ? null : (
    <ProblemText occurrence={logOccurrence} style={[styles.text, { color: color.text }]}>
      {logProblem}
    </ProblemText>
  );
  const photoWhy = fromPhoto && question !== null ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('meal.photo.why')}</Text> : null;

  const entry =
    step === 'entry' && (original === null || original.state === 'ready') ? (
      <View style={styles.part}>
        <View style={styles.chips}>
          {slotsShown.map((option) => (
            <Chip key={option} label={t(`food.slot.${option}`)} selected={slot === option} onPress={() => setSlot(option)} />
          ))}
          {slotsShown.length < ALL_SLOTS.length && <Chip label={t('meal.slots.more')} accessibilityLabel={t('meal.slots.moreSpoken')} onPress={() => setAllSlots(true)} />}
        </View>
        {original === null && targetDay !== today && <Text style={[styles.hint, { color: color.muted }]}>{t('meal.intoDay', { day: dayLabel(targetDay, today) })}</Text>}

        {quick && start !== null && items.length === 0 && targetDay === today && <QuickAdds slot={slot} day={targetDay} start={start} onDone={() => router.back()} />}

        <ItemRows
          items={items}
          known={known}
          recipes={knownRecipes}
          {...(estimatedItems === undefined ? {} : { estimated: estimatedItems })}
          {...(original !== null && original.state === 'ready' ? { logged: original.meal.items } : {})}
          favorites={extras.favoriteIds}
          onFavorite={(item, on) => void extras.setFavorite(item.foodId, on)}
          {...(itemParam !== undefined && !Number.isNaN(Number(itemParam)) ? { openFirst: Number(itemParam) } : {})}
          onChange={change}
          onRemove={(index) => setItems((before) => before.filter((_, i) => i !== index))}
        />

        <FoodPicker
          full={full}
          onFood={(food) => add(food)}
          {...(original === null && !fromCoach ? { onLogNow: (food: Schemas['Food']) => void logFood(food) } : {})}
          onQuickAdd={() => setItems((before) => addQuick(before, { kcal: '', protein: '', carbs: '', fat: '' }))}
          recipes={readRecipes}
          onRecipe={addOwnRecipe}
          idle={
            items.length === 0 || original !== null ? (
              <FoodBrowse
                recent={recent}
                frequent={extras.frequent}
                favorites={extras.favorites}
                again={extras.again}
                today={today}
                onSuggestion={(eaten) => void addEaten(eaten)}
                onLogSuggestion={(eaten) => void logEaten(eaten)}
                onFood={(food) => add(food)}
                onLogFood={(food) => void logFood(food)}
                onLogAgain={(meal) => void logAtOnce(`again:${meal.id}`, { repeatOf: meal.id }, meal.items.length)}
              />
            ) : null
          }
        />

        {totalCard}
        {photoWhy}
        {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
        {logLine}
        {unchecked && <Text style={[styles.text, { color: color.text }]}>{t('meal.fromCoach.notChecked')}</Text>}
        {deleting}
      </View>
    ) : null;
  // The screen's one primary, in the dock under the scroll (ADR-070 Ek 2 #1): there once a food is in the meal, as the prototype's empty frame has none.
  const dock =
    step === 'entry' && (original === null || original.state === 'ready') && items.length > 0 ? (
      <View style={styles.dock}>
        <Button label={t(original === null ? 'meal.save' : 'meal.edit.save')} onPress={() => void save()} disabled={busy || requests === null || !checked} />
      </View>
    ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ModalClose title={t(original === null ? 'meal.title' : 'meal.editTitle')} accessibilityLabel={t('meal.closeLabel')} />
      <KeyboardFrame>
        <FormScroll contentContainerStyle={styles.body}>
          {consentStep}
          {originalNote}
          {entry}
        </FormScroll>
        {dock}
      </KeyboardFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, gap: tokens.space.lg },
  dock: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
  part: { gap: tokens.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  hint: { fontSize: tokens.type.bodySmall },
});
