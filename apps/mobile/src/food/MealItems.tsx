import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { FormScroll } from '@/components/FormScroll';
import { Icon } from '@/components/Icon';
import { KeyboardFrame } from '@/components/KeyboardFrame';
import { ProblemText } from '@/components/ProblemText';
import { has, t } from '@/copy';
import { useSaved, useSavedSignal } from '@/saved/saved';
import { useAppServices } from '@/services/ServicesProvider';
import { askFirst } from '@/settings/askFirst';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load, localDay } from '@/today/today';

import { eatenAtFor } from './dayLabel';
import { type DraftItem, type KnownFoods, type KnownRecipes, PORTION, draftOf, itemsHanded, recipeItemId, requestsOf } from './draft';
import { EstimateCard } from './EstimateCard';
import { clearMeal, handedFrom, peekMeal } from './handoff';
import { foldedAmount, numbersOf } from './ItemRows';
import { changeMeal, deleteMeal, deletedMeal, removedItem } from './mealActions';
import { foodParams } from './params';
import { PortionSheet } from './PortionSheet';
import { savedMeal } from './savedMeal';
import { kcalText } from './single';

type Schemas = components['schemas'];
/** A meal being corrected: read from the server's day, or not there, or not readable (offline). */
type Original = { state: 'loading' } | { state: 'gone' } | { state: 'unreachable' } | { state: 'ready'; meal: Schemas['Meal'] };

type Props = {
  /** The logged meal to correct (`?edit=`) with the day it is on; absent: the meal the coach read, to confirm. */
  edit?: string;
  day?: string;
  /** The item to open (`&item=`): a correction of one item is that item's portion sheet and nothing else. */
  item?: string;
};

/**
 * A meal's items put in front of the user to change and keep (K-407, K-509, K-1063; Evre 7 A): a logged meal corrected where it stands
 * (`?edit=<id>&day=<day>&item=<n>`: its amounts and portions, one item out, the whole meal out — `PATCH /v1/meals/{id}`, so nothing is
 * deleted and logged again, and a change the server refuses leaves the meal as it was), or a meal the coach read, confirmed before it is
 * logged. A correction of one item is only that item's portion sheet, with Save: no search, no tabs. The list of the meal's items stands
 * behind it for the person who closes the sheet without choosing. Changing needs the server; offline it says so and changes nothing.
 */
export function MealItems({ edit, day, item: itemParam }: Props) {
  const { api, queue, forgetRecord, report, takeBack } = useAppServices();
  const saved = useSaved();
  const changed = useSavedSignal();
  const { color } = useTheme();
  const today = localDay(new Date());
  const targetDay = day ?? today;
  const [original, setOriginal] = useState<Original | null>(() => (edit === undefined ? null : day === undefined ? { state: 'gone' } : { state: 'loading' }));
  const [slot, setSlot] = useState<Schemas['MealSlot']>('BREAKFAST');
  // A meal the coach read comes in with its foods and amounts (K-509); a correction reads its own meal instead.
  const [items, setItems] = useState<DraftItem[]>(() => (edit === undefined ? itemsHanded(peekMeal()) : []));
  const [fromCoach] = useState(() => edit === undefined && peekMeal() !== null);
  // A photo's grams are by eye (K-408, ADR-046): when the server asks for one, the screen says why.
  const [fromPhoto] = useState(() => fromCoach && handedFrom() === 'photo');
  useEffect(() => clearMeal(), []);
  const [known, setKnown] = useState<KnownFoods>(() => new Map());
  const [recipes, setRecipes] = useState<Schemas['Recipe'][] | null>(null);
  const [estimate, setEstimate] = useState<{ key: string; value: Schemas['FoodEstimate'] | null } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The item whose portion sheet is open. A correction of one item opens on it from the start; the sheet is then the whole screen.
  const focused = edit !== undefined && itemParam !== undefined && !Number.isNaN(Number(itemParam));
  const [openIndex, setOpenIndex] = useState<number | null>(focused ? Number(itemParam) : null);
  const saving = useRef(false); // two taps at once must not log twice

  const knownRecipes: KnownRecipes | undefined = recipes === null ? undefined : new Map(recipes.map((recipe) => [recipeItemId(recipe), recipe]));

  useEffect(() => {
    if (edit === undefined || day === undefined) return;
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
      if (draft.items.some((one) => one.unit === PORTION)) {
        void load(() => api.GET('/v1/recipes'))
          .then((read) => live && read.state === 'ready' && setRecipes(read.value))
          .catch(() => undefined);
      }
      // The foods of the items, for their portions: the chips and the numbers of the portion step (K-1063). One that cannot be read
      // keeps the unit it was logged in.
      const ids = [...new Set(draft.items.filter((one) => one.foodId !== 'quick' && one.unit !== PORTION).map((one) => one.foodId))];
      void Promise.all(ids.map((id) => load(() => api.GET('/v1/foods/{id}', { params: { path: { id } } })).catch(() => null))).then((reads) => {
        if (!live) return;
        const foods = reads.flatMap((read) => (read !== null && read.state === 'ready' ? [read.value] : []));
        setKnown((before) => new Map([...before, ...foods.map((food): [string, Schemas['Food']] => [food.id, food])]));
        setItems((before) =>
          before.map((one) => {
            const food = foods.find((candidate) => candidate.id === one.foodId);
            const portions = food?.portions ?? [];
            if (portions.length === 0) return one;
            const units = portions.map((portion) => portion.unit);
            return { ...one, portions, units: units.includes(one.unit) ? units : [one.unit, ...units] };
          }),
        );
      });
    });
    return () => {
      live = false;
    };
  }, [api, edit, day]);

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
  // A meal the coach read waits for the same check (K-509 review): its measure is the user's word, which may not be one of the food's
  // servings — saved unchecked, the server would refuse it later, after the user thought it logged.
  const unchecked = fromCoach && estimate !== null && estimate.key === key && estimate.value === null;
  const checked = !fromCoach || shown !== null;

  const change = (index: number, part: Partial<DraftItem>) => {
    setItems((before) => before.map((one, i) => (i === index ? { ...one, ...part } : one)));
    setProblem(null);
  };

  const save = async () => {
    if (saving.current || requests === null || !checked || (original !== null && original.state !== 'ready')) return;
    saving.current = true;
    setBusy(true);
    let closing = false;
    try {
      if (original !== null && original.state === 'ready') {
        // A correction: in place, one request. The server estimates the items again and answers the meal.
        const result = await changeMeal(api, original.meal.id, { items: requests, slot });
        if (result.state === 'done') {
          changed();
          router.back();
        } else if (result.state === 'offline') setProblem(t('meal.edit.needsConnection'));
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
        changed();
        router.back();
        saved(deletedMeal({ api, queue, forgetRecord, report }, original.meal, () => undefined));
      } else setProblem(t(result === 'offline' ? 'meal.edit.needsConnection' : 'food.deleted.failed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  // The question is the system's alert (ADR-087 #1): on the screen wherever the list is scrolled, with Keep it as its way out.
  const askToDelete = () =>
    askFirst({
      title: t('meal.edit.confirmTitle'),
      body: t('meal.edit.confirmBody'),
      confirmLabel: t('meal.edit.confirm'),
      keepLabel: t('meal.edit.keep'),
      onConfirm: () => void remove(),
    });

  /** One item out of a logged meal, in place: the last one is the meal (asked first); Undo puts the items back. */
  const removeItem = async (index: number) => {
    if (original === null || original.state !== 'ready') return;
    if (items.length === 1) return askToDelete();
    const rest = requestsOf(items.filter((_, i) => i !== index), known, knownRecipes);
    if (rest === null || saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      const result = await changeMeal(api, original.meal.id, { items: rest, slot });
      if (result.state === 'done') {
        changed();
        router.back();
        saved(removedItem({ api, report }, original.meal, items[index].name, changed));
      } else setProblem(t(result.state === 'offline' ? 'meal.edit.needsConnection' : 'food.deleted.failed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const asked = shown?.question;
  const askedName = shown?.items.find((one) => one.foodId === asked?.foodId)?.name;
  const question = asked !== undefined && askedName !== undefined && has(asked.copyKey) ? t('meal.estimate.question', { name: askedName, question: t(asked.copyKey) }) : null;
  const estimatedItems = shown?.items ?? (original !== null && original.state === 'ready' ? original.meal.items : undefined);
  const logged = original !== null && original.state === 'ready' ? original.meal.items : undefined;
  const ready = original === null || original.state === 'ready';
  const isNew = original === null;
  const open = openIndex === null ? undefined : items[openIndex];

  const note =
    original !== null && (original.state === 'gone' || original.state === 'unreachable') ? (
      <Text style={[styles.text, { color: color.text }]}>{t(original.state === 'gone' ? 'meal.edit.gone' : 'meal.edit.needsConnection')}</Text>
    ) : null;
  const list = !ready ? null : (
    <View style={[styles.card, { backgroundColor: color.surface }]} testID="meal-items">
      {items.map((one, index) => {
        const numbers = numbersOf(one, estimatedItems?.[index], logged);
        return (
          <Pressable
            key={`${one.foodId}-${index}`}
            testID={`item-${index}`}
            accessibilityRole="button"
            accessibilityLabel={t('meal.item.open', { name: one.name })}
            onPress={() => setOpenIndex(index)}
            style={styles.row}>
            {index > 0 && <View style={[styles.line, { backgroundColor: color.line }]} />}
            <View style={styles.what}>
              <Text style={[styles.name, { color: color.text }]}>{one.name}</Text>
              <Text style={[styles.small, { color: color.muted }]}>{foldedAmount(one)}</Text>
            </View>
            {numbers !== null && <Text style={[styles.small, { color: color.text }]}>{kcalText(numbers.kcal)}</Text>}
            <Icon name="chevron.right" size="small" tone="muted" />
          </Pressable>
        );
      })}
    </View>
  );
  const total = shown === null ? null : items.length > 1 ? <EstimateCard estimate={shown} question={question} /> : question === null ? null : <Text style={[styles.text, { color: color.textSecondary }]}>{question}</Text>;
  const photoWhy = fromPhoto && question !== null ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('meal.photo.why')}</Text> : null;
  const dock =
    ready && items.length > 0 && !focused ? (
      <View style={styles.dock}>
        <Button label={t(isNew ? 'meal.save' : 'meal.edit.save')} onPress={() => void save()} disabled={busy || requests === null || !checked} />
      </View>
    ) : null;
  const full = items.length >= foodParams.itemsMax;

  const correcting = original !== null && original.state === 'ready';
  const deleteButton = correcting && !focused ? <Button label={t('meal.edit.delete')} variant="destructive" onPress={askToDelete} disabled={busy} /> : null;
  const fullNote = full ? <Text style={[styles.small, { color: color.muted }]}>{t('meal.full', { max: foodParams.itemsMax })}</Text> : null;
  const problemLine = problem === null ? null : <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>;
  const uncheckedLine = unchecked ? <Text style={[styles.text, { color: color.text }]}>{t('meal.fromCoach.notChecked')}</Text> : null;
  const removeOpen = () => {
    if (openIndex === null) return;
    if (correcting) return void removeItem(openIndex);
    setItems((before) => before.filter((_, i) => i !== openIndex));
    setOpenIndex(null);
  };
  const sheet =
    open === undefined || openIndex === null ? null : (
      <PortionSheet
        item={open}
        index={openIndex}
        known={known}
        {...(knownRecipes === undefined ? {} : { recipes: knownRecipes })}
        {...(estimatedItems?.[openIndex] === undefined ? {} : { estimate: estimatedItems[openIndex] })}
        {...(logged === undefined ? {} : { logged })}
        slotName={t(`food.slot.${slot}`)}
        mode={focused ? 'save' : 'done'}
        question={openIndex !== null && shown?.question?.foodId === open.foodId ? question : null}
        busy={busy}
        blocked={requests === null || !checked}
        onChange={(part) => change(openIndex, part)}
        onSubmit={() => (focused ? void save() : setOpenIndex(null))}
        onClose={() => (focused ? router.back() : setOpenIndex(null))}
        onRemove={removeOpen}
      />
    );

  return (
    <KeyboardFrame>
      <FormScroll contentContainerStyle={styles.body}>
        {note}
        {list}
        {total}
        {photoWhy}
        {fullNote}
        {problemLine}
        {uncheckedLine}
        {deleteButton}
      </FormScroll>
      {dock}
      {sheet}
    </KeyboardFrame>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, gap: tokens.space.md },
  dock: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
  card: { borderRadius: tokens.radius.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, minHeight: tokens.size.row },
  line: { position: 'absolute', top: 0, left: tokens.space.md, right: 0, height: StyleSheet.hairlineWidth },
  what: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
  text: { fontSize: tokens.type.body },
});
