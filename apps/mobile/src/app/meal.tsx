import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { grantConsent } from '@/consent/consents';
import { has, t } from '@/copy';
import { BarcodeScanner } from '@/food/BarcodeScanner';
import { EstimateCard } from '@/food/EstimateCard';
import { type DraftItem, type KnownFoods, type KnownRecipes, PORTION, addFood, addRecipe, draftOf, itemProblem, recipeItemId, requestsOf } from '@/food/draft';
import { defaultSlot } from '@/food/meals';
import { foodParams } from '@/food/params';
import { type RecipeMatch, recipeMatches } from '@/food/recipes';
import { useAppServices } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

type Schemas = components['schemas'];
type Step = 'checking' | 'consent' | 'entry';
/** A meal being corrected: read from the server's day, or not there, or not readable (offline). */
type Original = { state: 'loading' } | { state: 'gone' } | { state: 'unreachable' } | { state: 'ready'; meal: Schemas['Meal'] };
type Found =
  | { state: 'idle' }
  | { state: 'tooShort' }
  | { state: 'failed' }
  | { state: 'found'; foods: Schemas['Food'][] }
  // A barcode not in the database (FDC is mostly US products, ADR-008), or not looked up.
  | { state: 'notInDatabase' }
  // A number the server refuses as a barcode (a wrong check digit, 400): the digits, not the connection.
  | { state: 'badNumber' }
  | { state: 'barcodeFailed' };

const SLOTS: Schemas['MealSlot'][] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const PROBLEM_KEYS = { invalid: 'meal.item.invalid', tooMuch: 'meal.item.tooMuch' } as const;

/**
 * Logging a meal (K-407): the slot, foods found by name in the database (ADR-008), an amount for each — nothing filled
 * in for the user (I2 A4) — and, once every amount is given, the server's estimate as ranges with its one question
 * (U1, U5). Saved on the phone first and sent when it can be (K-304); the estimate is only a look, the server estimates
 * again when the meal arrives. Health data: the consent first, and nothing typed is kept without it (ADR-030 #25).
 *
 * `?edit=<id>&day=<day>` corrects a logged meal (first class: I2 A0, one log in five was corrected). The contract has no
 * update: saving deletes the old one on the server first, then saves the new one on the phone with the same time — a
 * failure in between never leaves two (a lost one can be saved again from this screen: the delete then finds nothing).
 * The delete needs the server; offline it says so and changes nothing.
 */
export default function MealScreen() {
  const { api, queue, consents, forgetRecord, report } = useAppServices();
  const { edit, day } = useLocalSearchParams<{ edit?: string; day?: string }>();
  // A correction link without its day has nothing to find the meal in: not there, rather than an endless wait.
  const [original, setOriginal] = useState<Original | null>(() =>
    edit === undefined ? null : day === undefined ? { state: 'gone' } : { state: 'loading' },
  );
  const [confirming, setConfirming] = useState(false);
  const { color } = useTheme();
  const [step, setStep] = useState<Step>('checking');
  const [slot, setSlot] = useState<Schemas['MealSlot']>(() => defaultSlot(new Date()));
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found>({ state: 'idle' });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [known, setKnown] = useState<KnownFoods>(() => new Map());
  // The user's recipes (K-423), read at the first search (no search, no request); unreadable (offline) is none this
  // time — the foods alone are offered, and the next search asks again.
  const [recipes, setRecipes] = useState<Schemas['Recipe'][] | null>(null);
  const [recipeHits, setRecipeHits] = useState<RecipeMatch[]>([]);
  // The estimate for a set of items (by key); `value` null: the server did not take them, or could not be asked.
  const [estimate, setEstimate] = useState<{ key: string; value: Schemas['FoodEstimate'] | null } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const saving = useRef(false); // two taps at once must not log twice
  // Each search answer belongs to the search that asked: a late one (slow network) never replaces a newer list, and none
  // comes back once a food was picked.
  const searchSeq = useRef(0);

  useEffect(() => {
    // Not known (a failing keychain) is not given: the consent step, never an endless wait.
    void consents
      .granted('HEALTH_DATA')
      .catch(() => false)
      .then((granted) => setStep(granted ? 'entry' : 'consent'));
  }, [consents]);

  // Recipes by their item id, for the portion ceiling. A recipe in a meal opened to correct, before any search, is not
  // known here: its ceiling is left to the server (as a serving whose grams are not known).
  const knownRecipes: KnownRecipes = new Map((recipes ?? []).map((recipe) => [recipeItemId(recipe), recipe]));
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
    });
    return () => {
      live = false;
    };
  }, [api, step, edit, day]);

  /**
   * The meal being corrected deleted on the server, and the phone's copy of it forgotten (else it would come back on the
   * Food tab offline). Already gone counts as deleted. A delete with no answer may have been done (the answer lost): the
   * day is read again to know. False: not done, or not known (offline, an error).
   */
  const removeOriginal = async (meal: Schemas['Meal']): Promise<boolean> => {
    let done: boolean;
    try {
      const { response } = await api.DELETE('/v1/meals/{id}', { params: { path: { id: meal.id } } });
      done = response.ok || response.status === 404;
    } catch {
      const listed = day === undefined ? null : await load(() => api.GET('/v1/meals', { params: { query: { day } } }));
      done = listed !== null && listed.state === 'ready' && !listed.value.some((m) => m.id === meal.id);
    }
    if (done) await forgetRecord(meal.clientId).catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
    return done;
  };

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
  // Correcting deletes the logged meal first: only once the server has taken these very items (the estimate runs the
  // same checks as the log), so a refused correction can never cost the meal it replaces (review: a serving's grams
  // are not known here, and 100 cups slipped through).
  const unchecked = original !== null && estimate !== null && estimate.key === key && estimate.value === null;
  const checked = original === null || shown !== null;

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

  const search = async () => {
    const q = query.trim();
    if (q.length < foodParams.searchMinChars) {
      searchSeq.current++;
      setRecipeHits([]);
      setFound({ state: 'tooShort' });
      return;
    }
    const mine = ++searchSeq.current;
    const [own, answer] = await Promise.all([
      readRecipes(),
      load(() => api.POST('/v1/foods/search', { body: { q, limit: foodParams.searchResults } })),
    ]);
    if (mine !== searchSeq.current) return;
    setRecipeHits(recipeMatches(own, q));
    setFound(answer.state === 'ready' ? { state: 'found', foods: answer.value } : { state: 'failed' });
  };

  const addOwnRecipe = (recipe: Schemas['Recipe']) => {
    searchSeq.current++;
    setItems((before) => addRecipe(before, recipe));
    setRecipeHits([]);
    setFound({ state: 'idle' });
    setQuery('');
  };
  const add = (food: Schemas['Food']) => {
    searchSeq.current++;
    setRecipeHits([]);
    setItems((before) => addFood(before, food));
    setKnown((before) => new Map(before).set(food.id, food));
    setFound({ state: 'idle' });
    setQuery('');
  };
  /** A code from the reader, looked up as scanned (a UPC-E is expanded by the server, K-208). */
  const lookUpBarcode = async (gtin: string) => {
    setScanning(false);
    const mine = ++searchSeq.current;
    let found: Found | Schemas['Food'];
    try {
      const { data, response } = await api.POST('/v1/foods/barcode-lookup', { body: { gtin } });
      found = data ?? { state: response.status === 404 ? 'notInDatabase' : response.status === 400 ? 'badNumber' : 'barcodeFailed' };
    } catch {
      found = { state: 'barcodeFailed' };
    }
    if (mine !== searchSeq.current) return;
    if ('id' in found) add(found);
    else setFound(found);
  };
  const change = (index: number, part: Partial<DraftItem>) => {
    setItems((before) => before.map((item, i) => (i === index ? { ...item, ...part } : item)));
    setProblem(null);
  };

  const save = async () => {
    if (saving.current || requests === null || !checked || (original !== null && original.state !== 'ready')) return;
    saving.current = true;
    setBusy(true);
    try {
      const eatenAt = original === null ? new Date().toISOString() : original.meal.eatenAt;
      if (original !== null && !(await removeOriginal(original.meal))) {
        setProblem(t('meal.edit.needsConnection'));
        return;
      }
      await queue.record({ kind: 'meal', body: { clientId: newClientId(), eatenAt, slot, items: requests } });
      router.back();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('meal.saveFailed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const remove = async () => {
    if (saving.current || original === null || original.state !== 'ready') return;
    saving.current = true;
    setBusy(true);
    try {
      if (await removeOriginal(original.meal)) router.back();
      else setProblem(t('meal.edit.needsConnection'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  // A full meal takes no more: the server would refuse it, and the queue would lose it.
  const full = items.length >= foodParams.itemsMax;
  const results = found.state === 'found' && !full ? found.foods : [];
  const foundNote = full
    ? t('meal.full', { max: foodParams.itemsMax })
    : found.state === 'tooShort'
      ? t('meal.search.tooShort', { min: foodParams.searchMinChars })
      : found.state === 'failed'
        ? t('meal.search.failed')
        : found.state === 'notInDatabase'
          ? t('meal.barcode.notFound')
          : found.state === 'badNumber'
            ? t('meal.barcode.badNumber')
            : found.state === 'barcodeFailed'
              ? t('meal.barcode.failed')
              : found.state === 'found' && found.foods.length === 0 && recipeHits.length === 0
                ? t('meal.search.none')
                : null;
  // Named: with several items the question says which one it is about.
  const asked = shown?.question;
  const askedName = shown?.items.find((item) => item.foodId === asked?.foodId)?.name;
  const question =
    asked !== undefined && askedName !== undefined && has(asked.copyKey)
      ? t('meal.estimate.question', { name: askedName, question: t(asked.copyKey) })
      : null;

  // A full meal takes no more, from a barcode either.
  const scanButton = full ? null : <Button label={t('meal.barcode.scan')} variant="ghost" size="sm" onPress={() => setScanning(true)} />;

  const consentStep =
    step === 'consent' ? (
      <View style={styles.part}>
        <Text style={[styles.heading, { color: color.text }]}>{t('consent.health_data.title')}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('consent.health_data.body')}</Text>
        {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
        <Button label={t('meal.consent.allow')} onPress={() => void allow()} disabled={busy} />
        <Button label={t('meal.consent.notNow')} variant="ghost" onPress={() => router.back()} disabled={busy} />
      </View>
    ) : null;

  // A meal to correct that is not there, or not readable: nothing to change, nothing to save.
  const originalNote =
    step === 'entry' && original !== null && (original.state === 'gone' || original.state === 'unreachable') ? (
      <Text style={[styles.text, { color: color.text }]}>{t(original.state === 'gone' ? 'meal.edit.gone' : 'meal.edit.needsConnection')}</Text>
    ) : null;
  const deleting =
    original !== null && original.state === 'ready' ? (
      confirming ? (
        <Button label={t('meal.edit.confirmDelete')} variant="warn" onPress={() => void remove()} disabled={busy} />
      ) : (
        <Button label={t('meal.edit.delete')} variant="ghost" onPress={() => setConfirming(true)} disabled={busy} />
      )
    ) : null;
  const entry =
    step === 'entry' && (original === null || original.state === 'ready') ? (
      <View style={styles.part}>
        <View style={styles.chips}>
          {SLOTS.map((option) => (
            <Chip key={option} label={t(`food.slot.${option}`)} selected={slot === option} onPress={() => setSlot(option)} />
          ))}
        </View>

        {items.map((item, index) => {
          const itemIssue = itemProblem(item, known, knownRecipes);
          const portions = item.unit === PORTION;
          const issueText =
            itemIssue === null || itemIssue === 'missing'
              ? null
              : itemIssue === 'tooMuch' && portions
                ? t('meal.item.tooManyPortions', { portions: knownRecipes.get(item.foodId)?.portions ?? 0 })
                : t(PROBLEM_KEYS[itemIssue]);
          return (
            <View key={`${item.foodId}-${index}`} style={styles.item}>
              <Text style={[styles.name, { color: color.text }]}>{item.name}</Text>
              <TextField
                label={t('meal.item.amount', { name: item.name })}
                value={item.quantity}
                onChangeText={(quantity) => change(index, { quantity })}
                problem={issueText}
                keyboardType="decimal-pad"
                maxLength={foodParams.amountMaxChars}
              />
              <View style={styles.chips}>
                {/* Another unit empties the amount: the number meant the old one ("1" cup is not 1 g); nothing is converted for the user. */}
                {item.units.map((unit) => {
                  const label = unit === 'g' ? t('meal.item.grams') : unit === PORTION ? t('meal.item.portions') : unit;
                  return (
                    <Chip
                      key={unit}
                      label={label}
                      accessibilityLabel={t('meal.item.unitSpoken', { name: item.name, unit: label })}
                      selected={item.unit === unit}
                      onPress={() => change(index, unit === item.unit ? {} : { unit, quantity: '' })}
                    />
                  );
                })}
                {/* A portion is never weighed: the recipe's whole weight is not known (ADR-034). */}
                {!portions && (
                  <Chip
                    label={t('meal.item.weighed')}
                    accessibilityLabel={t('meal.item.weighedSpoken', { name: item.name })}
                    selected={item.weighed}
                    onPress={() => change(index, { weighed: !item.weighed })}
                  />
                )}
              </View>
              <Button
                label={t('meal.item.remove')}
                accessibilityLabel={t('meal.item.removeSpoken', { name: item.name })}
                variant="ghost"
                size="sm"
                onPress={() => setItems((before) => before.filter((_, i) => i !== index))}
              />
            </View>
          );
        })}

        <View style={styles.search}>
          <TextField
            label={t('meal.search.label')}
            value={query}
            onChangeText={setQuery}
            onSearch={() => void search()}
            hint={foundNote ?? undefined}
            maxLength={foodParams.searchMaxChars}
          />
          <View style={styles.chips}>
            <Button label={t('meal.search.go')} variant="ghost" size="sm" onPress={() => void search()} />
            {scanButton}
          </View>
          {recipeHits.length > 0 && !full && <RecipeHits hits={recipeHits} onAdd={addOwnRecipe} />}
          {results.map((food) => (
            <Pressable
              key={food.id}
              accessibilityRole="button"
              accessibilityLabel={t('meal.search.add', { name: food.name })}
              onPress={() => add(food)}
              style={[styles.result, { borderColor: color.line }]}>
              <Text style={[styles.text, { color: color.text }]}>{food.name}</Text>
              {food.brand !== undefined && <Text style={[styles.small, { color: color.muted }]}>{food.brand}</Text>}
            </Pressable>
          ))}
        </View>

        {shown !== null && <EstimateCard estimate={shown} question={question} />}
        {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
        {unchecked && <Text style={[styles.text, { color: color.text }]}>{t('meal.edit.notChecked')}</Text>}
        <Button label={t('meal.save')} onPress={() => void save()} disabled={busy || requests === null || !checked} />
        {deleting}
      </View>
    ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{t(original === null ? 'meal.title' : 'meal.editTitle')}</ScreenTitle>
        {consentStep}
        {originalNote}
        {entry}
        {scanning && <BarcodeScanner onCode={(gtin) => void lookUpBarcode(gtin)} onClose={() => setScanning(false)} />}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The user's recipes a search found (K-423): addable ones as buttons, one the database can no longer estimate marked. */
function RecipeHits({ hits, onAdd }: { hits: RecipeMatch[]; onAdd: (recipe: Schemas['Recipe']) => void }) {
  const { color } = useTheme();
  return (
    <View style={styles.search}>
      <Text style={[styles.small, { color: color.muted }]}>{t('meal.recipes.heading')}</Text>
      {hits.map(({ recipe, available }) =>
        available ? (
          <Pressable
            key={recipe.id}
            accessibilityRole="button"
            accessibilityLabel={t('meal.recipes.add', { name: recipe.name })}
            onPress={() => onAdd(recipe)}
            style={[styles.result, { borderColor: color.line }]}>
            <Text style={[styles.text, { color: color.text }]}>{recipe.name}</Text>
            <Text style={[styles.small, { color: color.muted }]}>{t('meal.recipes.makes', { portions: recipe.portions })}</Text>
          </Pressable>
        ) : (
          <Text key={recipe.id} style={[styles.small, styles.result, { color: color.text, borderColor: color.line }]}>
            {t('meal.recipes.unavailable', { name: recipe.name })}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  item: { gap: tokens.space.sm },
  search: { gap: tokens.space.sm },
  result: { paddingVertical: tokens.space.sm, borderBottomWidth: tokens.border.hairline },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
