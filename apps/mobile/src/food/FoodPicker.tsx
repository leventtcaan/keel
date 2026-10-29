import { type ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

import { BarcodeScanner } from './BarcodeScanner';
import { FoodList, type FoodRowData } from './FoodList';
import { OwnFoodForm } from './OwnFoodForm';
import { foodParams } from './params';
import { type RecipeMatch, recipeMatches } from './recipes';
import { SearchField } from './SearchField';
import { foodDetail } from './foodRows';

type Schemas = components['schemas'];
type Found =
  | { state: 'idle' }
  | { state: 'tooShort' }
  // Asked, not answered yet: the old list is gone (ADR-085 #2).
  | { state: 'searching' }
  // No answer at all (the request threw) vs an answer that was an error (ADR-085 #3): the connection is blamed only for the first.
  | { state: 'failed' }
  | { state: 'serverError' }
  | { state: 'found'; foods: Schemas['Food'][] }
  // A barcode not in the database, or not looked up: the product can be added by hand (never a dead end, K-1063).
  | { state: 'notInDatabase'; gtin: string }
  // A number the server refuses as a barcode (a wrong check digit, 400): the digits, not the connection.
  | { state: 'badNumber' }
  | { state: 'barcodeFailed' };

type Props = {
  /** The list holds as many items as the server takes: nothing more is offered, from a barcode either. */
  full: boolean;
  /** A food picked: added to the meal on its natural portion, open as the portion step. */
  onFood: (food: Schemas['Food']) => void;
  /** A food logged as it stands, in one tap (the plus on a result); absent: results have no plus. */
  onLogNow?: (food: Schemas['Food']) => void;
  /** A quick add asked for (calories and macros typed, no food). Absent: no such button. */
  onQuickAdd?: () => void;
  /** What to show while the search box is empty: Recent, Frequent, Favorites, past meals (FoodBrowse). */
  idle?: ReactNode;
  /** The user's recipes, read when a search needs them (K-423); absent where a recipe cannot be an item (a recipe's own ingredients, ADR-034 #4). */
  recipes?: () => Promise<Schemas['Recipe'][]>;
  onRecipe?: (recipe: Schemas['Recipe']) => void;
};

/**
 * Finding a food (K-407, K-1063): by name in the database (ADR-008), or by a barcode read by the camera or typed — and, where
 * it can be one, the user's own recipe by name (K-423). It searches as the user types (ADR-085): a short wait after the
 * last key, the old list gone at once, the keyboard's Search key without the wait. Each answer belongs to the search that
 * asked: a late one (slow network) never replaces a newer list, and none comes back once something was picked. A result says what
 * one portion of the food holds as single numbers ("1 large · 72 kcal · P 6 · C 0 · F 5", ADR-090 #5), with a plus that logs it
 * as it stands. A barcode that is found goes straight to the portion step; one that is not offers "Add it" (the product from its
 * label, the barcode filled in) and "Search instead" — never a dead end. Shared by the meal and the recipe entry (the same item flow, K-423).
 */
export function FoodPicker({ full, onFood, onLogNow, onQuickAdd, idle, recipes, onRecipe }: Props) {
  const { api } = useAppServices();
  const { color } = useTheme();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found>({ state: 'idle' });
  const [recipeHits, setRecipeHits] = useState<RecipeMatch[]>([]);
  const [scanning, setScanning] = useState(false);
  // The form for a food of the user's own, open from "Create my own food" or "Add it" (with the barcode that was not found).
  const [creating, setCreating] = useState<{ gtin?: string } | null>(null);
  const searchSeq = useRef(0);
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopWaiting = () => {
    if (waiting.current !== null) clearTimeout(waiting.current);
    waiting.current = null;
  };
  // Nothing is searched once the picker is gone.
  useEffect(
    () => () => {
      stopWaiting();
      searchSeq.current++;
    },
    [],
  );

  const clear = () => {
    stopWaiting();
    searchSeq.current++;
    setRecipeHits([]);
    setFound({ state: 'idle' });
    setQuery('');
  };

  /** Asks the server for `q` (trimmed, long enough); its answer counts only while no newer search or key has come. */
  const ask = async (q: string) => {
    waiting.current = null;
    const mine = ++searchSeq.current;
    const [own, answer] = await Promise.all([
      recipes === undefined ? Promise.resolve([]) : recipes(),
      load(() => api.POST('/v1/foods/search', { body: { q, limit: foodParams.searchResults } })),
    ]);
    if (mine !== searchSeq.current) return;
    setRecipeHits(recipeMatches(own, q));
    setFound(
      answer.state === 'ready'
        ? { state: 'found', foods: answer.value }
        : answer.state === 'failed' && answer.problem === 'NoConnection'
          ? { state: 'failed' }
          : { state: 'serverError' },
    );
  };

  /** What was shown belongs to the old words: gone at once. Too few letters is a hint; enough is a wait, then a search. */
  const type = (text: string) => {
    setQuery(text);
    stopWaiting();
    searchSeq.current++;
    setRecipeHits([]);
    const q = text.trim();
    if (q === '') setFound({ state: 'idle' });
    else if (q.length < foodParams.searchMinChars) setFound({ state: 'tooShort' });
    else {
      setFound({ state: 'searching' });
      waiting.current = setTimeout(() => void ask(q), foodParams.searchDelayMs);
    }
  };

  /** The keyboard's Search key: the words as they are, without the wait. */
  const searchNow = () => {
    const q = query.trim();
    if (q.length < foodParams.searchMinChars) return type(query);
    stopWaiting();
    setRecipeHits([]);
    setFound({ state: 'searching' });
    void ask(q);
  };

  const pickFood = (food: Schemas['Food']) => {
    clear();
    onFood(food);
  };
  const logFood = (food: Schemas['Food']) => {
    clear();
    onLogNow?.(food);
  };
  const pickRecipe = (recipe: Schemas['Recipe']) => {
    clear();
    onRecipe?.(recipe);
  };

  /** A code from the reader, looked up as scanned (a UPC-E is expanded by the server, K-208). */
  const lookUpBarcode = async (gtin: string) => {
    setScanning(false);
    stopWaiting();
    const mine = ++searchSeq.current;
    let answer: Found | Schemas['Food'];
    try {
      const { data, response } = await api.POST('/v1/foods/barcode-lookup', { body: { gtin } });
      answer = data ?? (response.status === 404 ? { state: 'notInDatabase', gtin } : { state: response.status === 400 ? 'badNumber' : 'barcodeFailed' });
    } catch {
      answer = { state: 'barcodeFailed' };
    }
    if (mine !== searchSeq.current) return;
    // Found: straight to the portion step, the product on its label serving.
    if ('id' in answer) pickFood(answer);
    else setFound(answer);
  };

  const results = found.state === 'found' && !full ? found.foods : [];
  const note = full
    ? t('meal.full', { max: foodParams.itemsMax })
    : found.state === 'idle'
      ? t('meal.search.empty')
      : found.state === 'tooShort'
        ? t('meal.search.tooShort', { min: foodParams.searchMinChars })
        : found.state === 'searching'
          ? t('meal.search.searching')
          : found.state === 'failed'
            ? t('meal.search.failed')
            : found.state === 'serverError'
              ? t('meal.search.serverError')
              : found.state === 'notInDatabase'
                ? t('meal.barcode.notFound')
                : found.state === 'badNumber'
                  ? t('meal.barcode.badNumber')
                  : found.state === 'barcodeFailed'
                    ? t('meal.barcode.failed')
                    : found.state === 'found' && found.foods.length === 0 && recipeHits.length === 0
                      ? t('meal.search.none')
                      : null;

  // Built outside the JSX children (the raw-text guard reads them).
  const rows: FoodRowData[] = results.map((food) => ({
    key: food.id,
    testID: `result-${food.id}`,
    name: food.name,
    detail: foodDetail(food),
    ...(food.avoided === true ? { marker: t('meal.search.avoided') } : {}),
    onOpen: () => pickFood(food),
    ...(onLogNow === undefined ? {} : { onLog: () => logFood(food) }),
    openLabel: t('meal.search.add', { name: food.name }),
    logLabel: t('meal.search.logNow', { name: food.name }),
  }));
  const resultList = <FoodList testID="results" rows={rows} />;
  // A barcode that was not found: the two ways on, in place of a dead end (K-1063).
  const missed =
    found.state === 'notInDatabase' && !full ? (
      <Card testID="barcode-miss">
        <Text style={[styles.text, { color: color.text }]}>{t('meal.barcode.missTitle')}</Text>
        <View style={styles.buttons}>
          <Button label={t('meal.barcode.addIt')} onPress={() => setCreating({ gtin: found.gtin })} />
          <Button label={t('meal.barcode.searchInstead')} variant="secondary" onPress={clear} />
        </View>
      </Card>
    ) : null;
  const quickButton = onQuickAdd === undefined ? null : <Button label={t('meal.quickAdd.open')} variant="text" size="sm" onPress={onQuickAdd} />;
  const tools =
    full || creating !== null ? null : (
      <View style={styles.buttons}>
        {quickButton}
        <Button label={t('meal.own.open')} variant="text" size="sm" onPress={() => setCreating({})} />
      </View>
    );
  const recipeList = recipeHits.length > 0 && !full ? <RecipeHits hits={recipeHits} onAdd={pickRecipe} /> : null;
  const idleView = found.state === 'idle' && !full ? idle : null;
  const scanner = scanning ? <BarcodeScanner onCode={(gtin) => void lookUpBarcode(gtin)} onClose={() => setScanning(false)} /> : null;
  if (creating !== null) {
    return (
      <OwnFoodForm
        {...(creating.gtin === undefined ? {} : { gtin: creating.gtin })}
        initialName={creating.gtin === undefined ? query.trim() : ''}
        onCancel={() => setCreating(null)}
        onCreated={(food) => {
          setCreating(null);
          pickFood(food);
        }}
      />
    );
  }
  return (
    <View style={styles.search}>
      {/* A full list takes no more, from a barcode either. "Scan" on the screen (the meal's words are few, K-980); VoiceOver says all of it. */}
      <SearchField
        label={t('meal.search.label')}
        value={query}
        onChangeText={type}
        onSearch={searchNow}
        hint={missed === null ? (note ?? undefined) : undefined}
        maxLength={foodParams.searchMaxChars}
        onScan={full ? undefined : () => setScanning(true)}
      />
      {missed}
      {tools}
      {recipeList}
      {resultList}
      {idleView}
      {scanner}
    </View>
  );
}

/** The user's recipes a search found (K-423): addable ones as rows, one the database can no longer estimate marked. */
function RecipeHits({ hits, onAdd }: { hits: RecipeMatch[]; onAdd: (recipe: Schemas['Recipe']) => void }) {
  return (
    <ListGroup title={t('meal.recipes.heading')}>
      {hits.map(({ recipe, available }) =>
        available ? (
          <ListRow
            key={recipe.id}
            label={recipe.name}
            detail={t(`meal.recipes.makes.${recipe.portions === 1 ? 'one' : 'other'}`, { portions: recipe.portions })}
            trailing="plus.circle.fill"
            accessibilityLabel={t('meal.recipes.add', { name: recipe.name })}
            onPress={() => onAdd(recipe)}
          />
        ) : (
          <ListRow key={recipe.id} label={t('meal.recipes.unavailable', { name: recipe.name })} />
        ),
      )}
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  search: { gap: tokens.space.md },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
